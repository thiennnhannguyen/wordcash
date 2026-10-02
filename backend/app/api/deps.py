"""
Dependency dùng chung cho router: phiên DB, Redis, người dùng hiện tại từ JWT, IP/User-Agent, kiểm tra Origin.

Mọi route cần đăng nhập dùng `CurrentUser` (= Depends(get_current_user)). Access token đọc từ header
`Authorization: Bearer …` qua OAuth2PasswordBearer (tokenUrl trỏ tới /auth/token để nút Authorize ở /docs dùng được).
"""

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import AppError, AuthError
from app.core.redis import get_redis
from app.core.security import decode_access_token
from app.models import Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]
RedisClient = Annotated[Redis | None, Depends(get_redis)]


async def get_current_user(session: DbSession, token: Annotated[str | None, Depends(oauth2_scheme)]) -> User:
    if not token:
        raise AuthError("TOKEN_INVALID", "Bạn cần đăng nhập.")
    claims = decode_access_token(token)
    user = await session.get(User, claims["sub"])
    if user is None:
        raise AuthError("TOKEN_INVALID")
    if not user.is_active:
        raise AppError("ACCOUNT_DISABLED")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_active_admin(user: CurrentUser) -> User:
    if user.role != Role.ADMIN:
        raise AppError("FORBIDDEN")
    return user


async def require_verified_email(user: CurrentUser) -> User:
    """Tạo sẵn cho giai đoạn 2 (bắt buộc xác thực email); hiện CHƯA gắn vào route nào."""
    if user.email_verified_at is None:
        raise AppError("EMAIL_NOT_VERIFIED")
    return user


def get_client_ip(request: Request) -> str | None:
    """IP người dùng. Chỉ tin X-Forwarded-For khi TRUST_PROXY bật (chạy sau reverse proxy tin cậy)."""
    if settings.TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip() or None
    return request.client.host if request.client else None


def get_user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


ClientIp = Annotated[str | None, Depends(get_client_ip)]
UserAgent = Annotated[str | None, Depends(get_user_agent)]


async def check_origin(request: Request) -> None:
    """Chống CSRF cho các route dùng cookie: có header Origin thì phải là FRONTEND_URL (hoặc chính API, ví dụ /docs)."""
    origin = request.headers.get("origin")
    if not origin:
        return
    origin = origin.rstrip("/")
    own = f"{request.url.scheme}://{request.url.netloc}"
    if origin not in (settings.FRONTEND_URL.rstrip("/"), own):
        raise AppError("FORBIDDEN_ORIGIN")
