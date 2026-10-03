"""
Nghiệp vụ tài khoản và phiên đăng nhập. Mọi hàm async, nhận AsyncSession làm tham số; không phụ thuộc FastAPI.

Phiên (session) = một "family" refresh token:
- Đăng nhập/đăng ký tạo family mới. Mỗi lần /auth/refresh: token cũ bị thu hồi, token mới cùng family thay thế (xoay vòng).
- Token đã thu hồi mà bị dùng lại → coi như bị đánh cắp: hủy cả family (SESSION_REVOKED).
  Ngoại lệ (khoảng ân hạn): token bị thu hồi DO XOAY VÒNG, cách đây ≤ REFRESH_REUSE_GRACE_SECONDS và family vẫn còn
  token hiệu lực → nhiều tab cùng refresh bằng một cookie; cấp thêm token mới cùng family thay vì hủy.
- Mỗi người tối đa MAX_SESSIONS_PER_USER family đang hoạt động; vượt thì hủy family cũ nhất.
DB chỉ lưu SHA-256 của refresh token. Băm/kiểm tra mật khẩu chạy trong thread để không chặn vòng lặp sự kiện.
"""

import asyncio
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError, AuthError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models import RefreshToken, User
from app.schemas.auth import RegisterIn, password_matches_identity
from app.schemas.user import OnboardingIn, UserUpdateIn
from app.services import rate_limit

CLEANUP_AFTER = timedelta(days=7)
# 3 linh vật khởi đầu (chọn ở onboarding). Hiện là những linh vật duy nhất người dùng chắc chắn có.
STARTER_MASCOT_IDS = frozenset({1, 2, 3})
NEXT_STEPS = {"a1": "roadmap_a1", "placement": "placement_test"}


@dataclass
class IssuedSession:
    """Kết quả cấp phiên. `refresh_token` là chuỗi gốc, chỉ để đặt vào cookie, không bao giờ lưu hay ghi log."""

    user: User
    access_token: str
    expires_in: int
    refresh_token: str | None = None
    family_id: uuid.UUID | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def _access_only(user: User) -> IssuedSession:
    token, expires_in = create_access_token(user.id, user.role.value)
    return IssuedSession(user=user, access_token=token, expires_in=expires_in)


async def _exists(session: AsyncSession, column, value: str) -> bool:
    return await session.scalar(select(func.count()).select_from(User).where(column == value)) > 0


async def _add_refresh_token(session: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID, ip: str | None, ua: str | None):
    raw = generate_refresh_token()
    now = _now()
    row = RefreshToken(
        id=uuid.uuid4(),
        user_id=user_id,
        token_hash=hash_token(raw),
        family_id=family_id,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        created_at=now,  # gán ở Python (không dùng now() của transaction) để thứ tự các phiên luôn rõ ràng
        user_agent=ua[:255] if ua else None,
        ip=ip[:45] if ip else None,
    )
    session.add(row)
    await session.flush()
    return raw, row


async def _revoke_families(session: AsyncSession, family_ids) -> None:
    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id.in_(family_ids), RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )


async def _enforce_session_limit(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Giữ tối đa MAX_SESSIONS_PER_USER family đang hoạt động; hủy family bắt đầu sớm nhất."""
    live = select(RefreshToken.family_id).where(
        RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None), RefreshToken.expires_at > _now()
    )
    started = func.min(RefreshToken.created_at)
    rows = (
        await session.execute(
            select(RefreshToken.family_id, started)
            .where(RefreshToken.family_id.in_(live))
            .group_by(RefreshToken.family_id)
            .order_by(started, RefreshToken.family_id)
        )
    ).all()
    excess = len(rows) - settings.MAX_SESSIONS_PER_USER
    if excess > 0:
        await _revoke_families(session, [r[0] for r in rows[:excess]])


async def issue_session(
    session: AsyncSession, user: User, ip: str | None, ua: str | None, family_id: uuid.UUID | None = None
) -> IssuedSession:
    """Cấp access token + refresh token. Không truyền family_id thì mở phiên (family) mới."""
    new_family = family_id is None
    raw, row = await _add_refresh_token(session, user.id, family_id or uuid.uuid4(), ip, ua)
    if new_family:
        await _enforce_session_limit(session, user.id)
    await session.commit()
    issued = _access_only(user)
    issued.refresh_token, issued.family_id = raw, row.family_id
    return issued


async def register(
    session: AsyncSession, data: RegisterIn, ip: str | None, ua: str | None, *, redis: Redis | None = None
) -> IssuedSession:
    await rate_limit.hit_register(redis, ip)
    if await _exists(session, User.email, data.email):
        raise AppError("EMAIL_TAKEN", details={"field": "email"})
    if await _exists(session, User.username, data.username):
        raise AppError("USERNAME_TAKEN", details={"field": "username"})
    user = User(
        email=data.email,
        username=data.username,
        display_name=data.display_name,
        password_hash=await asyncio.to_thread(hash_password, data.password),
        timezone=data.timezone or settings.DEFAULT_TIMEZONE,
        last_login_at=_now(),
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError:
        # Hai yêu cầu đăng ký cùng lúc: bên đến sau vấp ràng buộc unique
        await session.rollback()
        if await _exists(session, User.email, data.email):
            raise AppError("EMAIL_TAKEN", details={"field": "email"}) from None
        raise AppError("USERNAME_TAKEN", details={"field": "username"}) from None
    return await issue_session(session, user, ip, ua)


async def authenticate(session: AsyncSession, identifier: str, password: str) -> User:
    """Tìm theo email nếu identifier có "@", ngược lại theo username. Sai tài khoản hay sai mật khẩu đều cùng một lỗi."""
    identifier = identifier.strip().lower()
    column = User.email if "@" in identifier else User.username
    user = await session.scalar(select(User).where(column == identifier))
    ok, new_hash = await asyncio.to_thread(verify_password, password, user.password_hash if user else None)
    if user is None or not ok:
        raise AppError("INVALID_CREDENTIALS")
    if not user.is_active:
        raise AppError("ACCOUNT_DISABLED")
    if new_hash:
        user.password_hash = new_hash
    user.last_login_at = _now()
    await session.commit()
    return user


async def login(
    session: AsyncSession,
    identifier: str,
    password: str,
    ip: str | None,
    ua: str | None,
    *,
    redis: Redis | None = None,
    with_refresh: bool = True,
) -> IssuedSession:
    """Đăng nhập có giới hạn số lần sai (rate_limit). `with_refresh=False` chỉ cấp access token (cho /auth/token của /docs)."""
    await rate_limit.ensure_login_allowed(redis, ip, identifier)
    try:
        user = await authenticate(session, identifier, password)
    except AppError as exc:
        if exc.code == "INVALID_CREDENTIALS":
            await rate_limit.record_login_failure(redis, ip, identifier)
        raise
    await rate_limit.reset_login(redis, identifier)
    return await issue_session(session, user, ip, ua) if with_refresh else _access_only(user)


async def _find_token(session: AsyncSession, raw_token: str, *, lock: bool = False) -> RefreshToken | None:
    query = select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token))
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    return await session.scalar(query)


async def _in_reuse_grace(session: AsyncSession, token: RefreshToken, now: datetime) -> bool:
    """Token bị thu hồi do xoay vòng, trong khoảng ân hạn, và family chưa bị hủy (còn token hiệu lực)."""
    if token.replaced_by_id is None or token.revoked_at is None:
        return False
    if now - token.revoked_at > timedelta(seconds=settings.REFRESH_REUSE_GRACE_SECONDS):
        return False
    live = await session.scalar(
        select(func.count())
        .select_from(RefreshToken)
        .where(RefreshToken.family_id == token.family_id, RefreshToken.revoked_at.is_(None), RefreshToken.expires_at > now)
    )
    return live > 0


async def rotate_refresh(session: AsyncSession, raw_token: str, ip: str | None, ua: str | None) -> IssuedSession:
    token = await _find_token(session, raw_token, lock=True)
    if token is None:
        raise AuthError("TOKEN_INVALID")
    now = _now()
    if token.revoked_at is not None and not await _in_reuse_grace(session, token, now):
        # Dùng lại token đã thu hồi (quá hạn ân hạn, hoặc thu hồi do đăng xuất/đổi mật khẩu): hủy toàn bộ family
        await _revoke_families(session, [token.family_id])
        await session.commit()
        raise AuthError("SESSION_REVOKED")
    if token.expires_at <= now:
        raise AuthError("TOKEN_EXPIRED")
    user = await session.get(User, token.user_id)
    if user is None or not user.is_active:
        await _revoke_families(session, [token.family_id])
        await session.commit()
        raise AppError("ACCOUNT_DISABLED")
    raw, new = await _add_refresh_token(session, user.id, token.family_id, ip, ua)
    if token.revoked_at is None:
        token.revoked_at = now
        token.replaced_by_id = new.id
    await session.commit()
    issued = _access_only(user)
    issued.refresh_token, issued.family_id = raw, new.family_id
    return issued


async def current_family(session: AsyncSession, raw_token: str | None, user_id: uuid.UUID) -> uuid.UUID | None:
    """Family của refresh token đang dùng (còn hiệu lực, đúng chủ), hoặc None."""
    if not raw_token:
        return None
    token = await _find_token(session, raw_token)
    if token is None or token.user_id != user_id or token.revoked_at is not None or token.expires_at <= _now():
        return None
    return token.family_id


async def revoke_family(session: AsyncSession, raw_token: str | None) -> None:
    """Đăng xuất phiên của token này. Token không tồn tại thì bỏ qua."""
    token = await _find_token(session, raw_token) if raw_token else None
    if token is not None:
        await _revoke_families(session, [token.family_id])
        await session.commit()


async def revoke_all(session: AsyncSession, user_id: uuid.UUID, except_family_id: uuid.UUID | None = None) -> None:
    query = update(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
    if except_family_id is not None:
        query = query.where(RefreshToken.family_id != except_family_id)
    await session.execute(query.values(revoked_at=_now()))
    await session.commit()


async def change_password(
    session: AsyncSession, user: User, current: str, new: str, current_family_id: uuid.UUID | None
) -> IssuedSession:
    """Đổi mật khẩu, hủy mọi phiên khác (giữ phiên hiện tại), trả access token mới."""
    ok, _ = await asyncio.to_thread(verify_password, current, user.password_hash)
    if not ok:
        raise AppError("WRONG_PASSWORD")
    if new == current:
        raise AppError("WEAK_PASSWORD", "Mật khẩu mới phải khác mật khẩu hiện tại.")
    if password_matches_identity(new, user.email, user.username):
        raise AppError("WEAK_PASSWORD", "Mật khẩu không được trùng email hoặc tên người dùng.")
    user.password_hash = await asyncio.to_thread(hash_password, new)
    await revoke_all(session, user.id, except_family_id=current_family_id)
    return _access_only(user)


async def complete_onboarding(session: AsyncSession, user: User, data: OnboardingIn) -> tuple[User, str]:
    user.goal = data.goal
    user.daily_minutes = data.daily_minutes
    user.avatar_mascot_id = data.starter_mascot_id
    user.onboarding_completed_at = _now()
    await session.commit()
    return user, NEXT_STEPS[data.start_mode]


async def update_profile(session: AsyncSession, user: User, data: UserUpdateIn) -> User:
    mascot_id = data.avatar_mascot_id
    # TODO: khi có bảng user_mascots, kiểm tra quyền sở hữu thật thay cho danh sách linh vật khởi đầu
    if "avatar_mascot_id" in data.model_fields_set and mascot_id is not None and mascot_id not in STARTER_MASCOT_IDS:
        raise AppError("MASCOT_NOT_OWNED", details={"field": "avatar_mascot_id"})
    for field in data.model_fields_set:
        setattr(user, field, getattr(data, field))
    await session.commit()
    return user


async def cleanup_expired_tokens(session: AsyncSession) -> int:
    """Xóa refresh token đã hết hạn quá 7 ngày (chạy định kỳ). Trả số dòng đã xóa."""
    result = await session.execute(delete(RefreshToken).where(RefreshToken.expires_at < _now() - CLEANUP_AFTER))
    await session.commit()
    return result.rowcount or 0
