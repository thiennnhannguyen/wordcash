"""
Băm mật khẩu (pwdlib, Argon2) và tạo/giải mã JWT (PyJWT).
Băm và kiểm tra mật khẩu tốn CPU nên chạy trong thread riêng để không chặn vòng lặp sự kiện.
"""

import asyncio
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_hasher = PasswordHash.recommended()
# Hash giả để vẫn tốn thời gian kiểm tra khi email không tồn tại (tránh dò email qua thời gian phản hồi)
_DUMMY_HASH = _hasher.hash("wordclash-dummy-password")


class InvalidTokenError(Exception):
    pass


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(_hasher.hash, password)


async def verify_password(password: str, password_hash: str | None) -> bool:
    return await asyncio.to_thread(_hasher.verify, password, password_hash or _DUMMY_HASH)


def create_access_token(user_id: int) -> tuple[str, int]:
    """Trả về (token, số giây hết hạn)."""
    expires_in = settings.JWT_EXPIRE_MINUTES * 60
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(seconds=expires_in), "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM), expires_in


def decode_access_token(token: str) -> int:
    """Trả về id người dùng; token sai, hết hạn hoặc không phải access token thì ném InvalidTokenError."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], options={"require": ["sub", "exp"]})
        if payload.get("type") != "access":
            raise InvalidTokenError("Sai loại token.")
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError) as exc:
        raise InvalidTokenError(str(exc)) from exc
