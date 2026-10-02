"""
Băm mật khẩu (pwdlib, Argon2), JWT access token (PyJWT, HS256) và refresh token ngẫu nhiên.

- Hàm băm/kiểm tra mật khẩu là hàm đồng bộ tốn CPU: service gọi qua `asyncio.to_thread` để không chặn vòng lặp sự kiện.
- `verify_password` dùng `verify_and_update`: khi tham số Argon2 đổi, trả kèm hash mới để service lưu lại.
- `DUMMY_HASH`: khi không tìm thấy user vẫn kiểm tra trên hash giả, để thời gian phản hồi như nhau.
- Refresh token là chuỗi ngẫu nhiên; DB chỉ lưu SHA-256 của nó (`hash_token`).
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.errors import AuthError

LEEWAY_SECONDS = 10

password_hasher = PasswordHash.recommended()
DUMMY_HASH = password_hasher.hash("wordclash-dummy-password-for-timing")


def hash_password(plain: str) -> str:
    return password_hasher.hash(plain)


def verify_password(plain: str, hashed: str | None) -> tuple[bool, str | None]:
    """Trả (đúng/sai, hash mới nếu cần băm lại). `hashed` là None thì kiểm tra trên DUMMY_HASH và luôn trả sai."""
    if hashed is None:
        password_hasher.verify(plain, DUMMY_HASH)
        return False, None
    try:
        return password_hasher.verify_and_update(plain, hashed)
    except Exception:  # noqa: BLE001 - hash hỏng hoặc không nhận dạng được thì coi như sai
        return False, None


def create_access_token(user_id: uuid.UUID | str, role: str) -> tuple[str, int]:
    """Trả (token, số giây còn hiệu lực)."""
    expires_in = settings.access_token_seconds
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM), expires_in


def decode_access_token(token: str) -> dict:
    """Kiểm tra chữ ký, hạn (leeway 10 giây) và type == "access". Trả claims, `sub` đã đổi sang UUID."""
    try:
        claims = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            leeway=LEEWAY_SECONDS,
            options={"require": ["sub", "exp", "iat", "type"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("TOKEN_EXPIRED") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("TOKEN_INVALID") from exc
    if claims.get("type") != "access":
        raise AuthError("TOKEN_INVALID")
    try:
        claims["sub"] = uuid.UUID(claims["sub"])
    except (ValueError, TypeError) as exc:
        raise AuthError("TOKEN_INVALID") from exc
    return claims


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
