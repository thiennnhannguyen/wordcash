"""
Kiểm thử service tài khoản/phiên trên PostgreSQL thật; mỗi test rollback sau khi chạy.
"""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy import delete, func, select

from app.core.config import settings
from app.core.errors import AppError, AuthError
from app.core.security import decode_access_token, hash_token
from app.models import RefreshToken, User
from app.schemas.auth import RegisterIn
from app.schemas.user import OnboardingIn, UserUpdateIn
from app.services import auth_service as svc
from app.services import collection_service

PASSWORD = "Wordclash2026"


def _register_in(**overrides) -> RegisterIn:
    data = {"email": "nhan@wordclash.vn", "username": "nhan.wc", "display_name": "Nhân", "password": PASSWORD}
    return RegisterIn(**{**data, **overrides})


async def _register(db, **overrides) -> svc.IssuedSession:
    return await svc.register(db, _register_in(**overrides), "127.0.0.1", "pytest")


async def _tokens(db, user_id) -> list[RefreshToken]:
    return list((await db.scalars(select(RefreshToken).where(RefreshToken.user_id == user_id).order_by(RefreshToken.created_at))).all())


async def test_register_creates_user_and_session(db_session):
    issued = await _register(db_session, email="NHAN@WordClash.vn")
    user = issued.user
    assert user.email == "nhan@wordclash.vn" and user.username == "nhan.wc"
    assert user.timezone == settings.DEFAULT_TIMEZONE
    assert user.password_hash.startswith("$argon2id$") and PASSWORD not in user.password_hash
    assert user.created_at is not None and user.last_login_at is not None
    assert decode_access_token(issued.access_token)["sub"] == user.id
    [row] = await _tokens(db_session, user.id)
    assert row.token_hash == hash_token(issued.refresh_token) != issued.refresh_token
    assert row.family_id == issued.family_id
    assert row.user_agent == "pytest" and row.ip == "127.0.0.1"
    assert row.expires_at - row.created_at == timedelta(days=30)


async def test_register_duplicates(db_session):
    await _register(db_session)
    with pytest.raises(AppError) as err:
        await _register(db_session, username="khac")
    assert err.value.code == "EMAIL_TAKEN"
    with pytest.raises(AppError) as err:
        await _register(db_session, email="khac@wordclash.vn")
    assert err.value.code == "USERNAME_TAKEN"


async def test_register_truncates_user_agent(db_session):
    issued = await svc.register(db_session, _register_in(), "10.0.0.1", "x" * 600)
    [row] = await _tokens(db_session, issued.user.id)
    assert len(row.user_agent) == 255


@pytest.mark.parametrize("identifier", ["nhan@wordclash.vn", "NHAN@wordclash.vn", "nhan.wc", " Nhan.WC "])
async def test_authenticate_by_email_or_username(db_session, identifier):
    issued = await _register(db_session)
    user = await svc.authenticate(db_session, identifier, PASSWORD)
    assert user.id == issued.user.id


async def test_authenticate_wrong_password_and_unknown_user_same_error(db_session):
    await _register(db_session)
    for identifier, password in (("nhan.wc", "SaiMatKhau1"), ("ai.do", PASSWORD), ("ai@do.vn", PASSWORD)):
        with pytest.raises(AppError) as err:
            await svc.authenticate(db_session, identifier, password)
        assert err.value.code == "INVALID_CREDENTIALS"


async def test_authenticate_disabled_account(db_session):
    issued = await _register(db_session)
    issued.user.is_active = False
    await db_session.commit()
    with pytest.raises(AppError) as err:
        await svc.authenticate(db_session, "nhan.wc", PASSWORD)
    assert err.value.code == "ACCOUNT_DISABLED"
    # Sai mật khẩu vẫn chỉ báo sai thông tin, không lộ trạng thái khóa
    with pytest.raises(AppError) as err:
        await svc.authenticate(db_session, "nhan.wc", "SaiMatKhau1")
    assert err.value.code == "INVALID_CREDENTIALS"


async def test_authenticate_rehashes_old_params(db_session):
    issued = await _register(db_session)
    weak = PasswordHash((Argon2Hasher(time_cost=1, memory_cost=8192),)).hash(PASSWORD)
    issued.user.password_hash = weak
    await db_session.commit()
    user = await svc.authenticate(db_session, "nhan.wc", PASSWORD)
    assert user.password_hash != weak and user.password_hash.startswith("$argon2id$")


async def test_rotate_refresh(db_session):
    issued = await _register(db_session)
    rotated = await svc.rotate_refresh(db_session, issued.refresh_token, "127.0.0.2", "ua2")
    assert rotated.refresh_token != issued.refresh_token
    assert rotated.family_id == issued.family_id
    old, new = await _tokens(db_session, issued.user.id)
    assert old.revoked_at is not None and old.replaced_by_id == new.id
    assert new.revoked_at is None and new.ip == "127.0.0.2"


async def test_rotate_reuse_after_grace_revokes_whole_family(db_session, time_travel):
    issued = await _register(db_session)
    rotated = await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    time_travel(settings.REFRESH_REUSE_GRACE_SECONDS + 1)
    with pytest.raises(AuthError) as err:
        await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    assert err.value.code == "SESSION_REVOKED"
    # Token mới nhất của family cũng bị hủy
    with pytest.raises(AuthError) as err:
        await svc.rotate_refresh(db_session, rotated.refresh_token, None, None)
    assert err.value.code == "SESSION_REVOKED"
    assert all(t.revoked_at is not None for t in await _tokens(db_session, issued.user.id))


async def test_rotate_reuse_within_grace_issues_new_token(db_session, time_travel):
    issued = await _register(db_session)
    first = await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    time_travel(10)
    second = await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    assert second.family_id == first.family_id == issued.family_id
    assert len({issued.refresh_token, first.refresh_token, second.refresh_token}) == 3
    tokens = await _tokens(db_session, issued.user.id)
    assert len(tokens) == 3 and sum(t.revoked_at is None for t in tokens) == 2
    # Token gốc vẫn trỏ tới token thay thế đầu tiên
    assert tokens[0].replaced_by_id == tokens[1].id
    # Cả hai tab đều làm mới tiếp được
    assert (await svc.rotate_refresh(db_session, first.refresh_token, None, None)).family_id == issued.family_id
    assert (await svc.rotate_refresh(db_session, second.refresh_token, None, None)).family_id == issued.family_id


async def test_reuse_within_grace_after_logout_is_revoked(db_session):
    issued = await _register(db_session)
    rotated = await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    await svc.revoke_family(db_session, rotated.refresh_token)
    with pytest.raises(AuthError) as err:
        await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    assert err.value.code == "SESSION_REVOKED"


async def test_reuse_of_logged_out_token_is_never_graced(db_session):
    issued = await _register(db_session)
    await svc.revoke_family(db_session, issued.refresh_token)  # thu hồi do đăng xuất, không có replaced_by_id
    with pytest.raises(AuthError) as err:
        await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    assert err.value.code == "SESSION_REVOKED"


async def test_reuse_within_grace_after_password_change_elsewhere_is_revoked(db_session):
    phone = await _register(db_session)
    laptop = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    rotated = await svc.rotate_refresh(db_session, phone.refresh_token, None, None)
    await svc.change_password(db_session, laptop.user, PASSWORD, "MatKhauMoi2026", laptop.family_id)
    for token in (phone.refresh_token, rotated.refresh_token):
        with pytest.raises(AuthError) as err:
            await svc.rotate_refresh(db_session, token, None, None)
        assert err.value.code == "SESSION_REVOKED"


async def test_parallel_refresh_with_same_token(test_engine):
    """Hai yêu cầu refresh cùng lúc bằng một cookie, trên hai kết nối DB thật: FOR UPDATE xếp hàng, cả hai thành công."""
    from sqlalchemy.ext.asyncio import async_sessionmaker

    make = async_sessionmaker(test_engine, expire_on_commit=False)
    async with make() as s:
        issued = await svc.register(s, _register_in(email="song.song@wordclash.vn", username="song.song"), None, None)
    try:
        async def refresh_once():
            async with make() as s:
                return await svc.rotate_refresh(s, issued.refresh_token, None, None)

        a, b = await asyncio.gather(refresh_once(), refresh_once())
        assert a.family_id == b.family_id == issued.family_id
        assert a.refresh_token != b.refresh_token
        async with make() as s:
            tokens = await _tokens(s, issued.user.id)
            assert len(tokens) == 3 and sum(t.revoked_at is None for t in tokens) == 2
    finally:
        async with make() as s:
            await s.execute(delete(User).where(User.id == issued.user.id))
            await s.commit()


async def test_rotate_unknown_and_expired(db_session):
    with pytest.raises(AuthError) as err:
        await svc.rotate_refresh(db_session, "khong-ton-tai", None, None)
    assert err.value.code == "TOKEN_INVALID"
    issued = await _register(db_session)
    [row] = await _tokens(db_session, issued.user.id)
    row.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db_session.commit()
    with pytest.raises(AuthError) as err:
        await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    assert err.value.code == "TOKEN_EXPIRED"


async def test_rotate_disabled_user(db_session):
    issued = await _register(db_session)
    issued.user.is_active = False
    await db_session.commit()
    with pytest.raises(AppError) as err:
        await svc.rotate_refresh(db_session, issued.refresh_token, None, None)
    assert err.value.code == "ACCOUNT_DISABLED"


async def test_session_limit_revokes_oldest_family(db_session, monkeypatch):
    monkeypatch.setattr(settings, "MAX_SESSIONS_PER_USER", 3)
    first = await _register(db_session)
    second = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    third = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    # Phiên đầu vừa xoay vòng (token mới nhất) nhưng family vẫn tính theo lúc bắt đầu, nên vẫn là cũ nhất
    await svc.rotate_refresh(db_session, first.refresh_token, None, None)
    fourth = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    live = await db_session.scalars(
        select(RefreshToken.family_id).where(RefreshToken.user_id == first.user.id, RefreshToken.revoked_at.is_(None))
    )
    assert set(live.all()) == {second.family_id, third.family_id, fourth.family_id}


async def test_revoke_family_and_all(db_session):
    a = await _register(db_session)
    b = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    c = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    await svc.revoke_family(db_session, a.refresh_token)
    await svc.revoke_family(db_session, "khong-ton-tai")  # bỏ qua, không lỗi
    assert await svc.current_family(db_session, a.refresh_token, a.user.id) is None
    await svc.revoke_all(db_session, a.user.id, except_family_id=c.family_id)
    assert await svc.current_family(db_session, b.refresh_token, a.user.id) is None
    assert await svc.current_family(db_session, c.refresh_token, a.user.id) == c.family_id
    await svc.revoke_all(db_session, a.user.id)
    assert await svc.current_family(db_session, c.refresh_token, a.user.id) is None


async def test_current_family_checks_owner(db_session):
    a = await _register(db_session)
    other = await _register(db_session, email="b@wordclash.vn", username="ban.be")
    assert await svc.current_family(db_session, a.refresh_token, other.user.id) is None
    assert await svc.current_family(db_session, None, a.user.id) is None


async def test_change_password(db_session):
    current = await _register(db_session)
    other = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    with pytest.raises(AppError) as err:
        await svc.change_password(db_session, current.user, "SaiMatKhau1", "MatKhauMoi2026", current.family_id)
    assert err.value.code == "WRONG_PASSWORD"
    for weak in (PASSWORD, "NHAN.WC", "nhan@wordclash.vn"):
        with pytest.raises(AppError) as err:
            await svc.change_password(db_session, current.user, PASSWORD, weak, current.family_id)
        assert err.value.code == "WEAK_PASSWORD"
    issued = await svc.change_password(db_session, current.user, PASSWORD, "MatKhauMoi2026", current.family_id)
    assert decode_access_token(issued.access_token)["sub"] == current.user.id
    assert await svc.current_family(db_session, other.refresh_token, current.user.id) is None
    assert await svc.current_family(db_session, current.refresh_token, current.user.id) == current.family_id
    assert (await svc.authenticate(db_session, "nhan.wc", "MatKhauMoi2026")).id == current.user.id


async def test_complete_onboarding(db_session):
    issued = await _register(db_session)
    data = OnboardingIn(goal="ielts", daily_minutes=15, starter_mascot_id=2, start_mode="placement")
    user, next_step = await svc.complete_onboarding(db_session, issued.user, data)
    assert next_step == "placement_test"
    assert (user.goal, user.daily_minutes, user.avatar_mascot_id) == ("ielts", 15, 2)
    assert user.onboarding_completed_at is not None
    _, next_step = await svc.complete_onboarding(db_session, user, data.model_copy(update={"start_mode": "a1"}))
    assert next_step == "roadmap_a1"


async def test_update_profile_only_sent_fields(db_session):
    issued = await _register(db_session)
    user = await svc.update_profile(db_session, issued.user, UserUpdateIn(display_name="  Nhân WC "))
    assert user.display_name == "Nhân WC" and user.timezone == settings.DEFAULT_TIMEZONE
    await collection_service.grant_starter(db_session, user, 2, datetime.now(UTC))
    user = await svc.update_profile(db_session, user, UserUpdateIn(timezone="Europe/London", avatar_mascot_id=2))
    assert (user.display_name, user.timezone, user.avatar_mascot_id) == ("Nhân WC", "Europe/London", 2)


async def test_cleanup_expired_tokens(db_session):
    issued = await _register(db_session)
    fresh = await svc.login(db_session, "nhan.wc", PASSWORD, None, None)
    first, _ = await _tokens(db_session, issued.user.id)
    first.expires_at = datetime.now(UTC) - timedelta(days=8)
    await db_session.commit()
    assert await svc.cleanup_expired_tokens(db_session) == 1
    remaining = await _tokens(db_session, issued.user.id)
    assert [t.token_hash for t in remaining] == [hash_token(fresh.refresh_token)]


async def test_user_ids_are_uuid(db_session):
    issued = await _register(db_session)
    assert isinstance(issued.user.id, uuid.UUID)
    assert await db_session.scalar(select(func.count()).select_from(User)) == 1
