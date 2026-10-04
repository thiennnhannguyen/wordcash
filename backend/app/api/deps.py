"""
Dependency dùng chung cho router: phiên DB, Redis, người dùng hiện tại từ JWT, IP/User-Agent, kiểm tra Origin.

Mọi route cần đăng nhập dùng `CurrentUser` (= Depends(get_current_user)). Route HỌC (bắt đầu phiên, nộp bài ở Học Viện,
Ôn tập, Khóa học) và Đấu Trường thêm `require_daily_check_done`: Cửa Ải hôm nay còn `pending` → DAILY_CHECK_REQUIRED (409).
Không áp cho auth, users, /me/stats, /daily-check và các route GET. Access token đọc từ header
`Authorization: Bearer …` qua OAuth2PasswordBearer (tokenUrl trỏ tới /auth/token để nút Authorize ở /docs dùng được).
"""

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
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
    """IP người dùng (dùng cho giới hạn đăng nhập và ghi phiên).

    - TRUST_PROXY tắt: request.client.host (kết nối trực tiếp). X-Forwarded-For bị bỏ qua vì client tự đặt được.
    - TRUST_PROXY bật: mỗi proxy tin cậy nối IP nó nhìn thấy vào cuối X-Forwarded-For, nên lấy phần tử thứ
      TRUSTED_PROXY_HOPS tính từ phải sang; các phần tử bên trái hơn do client tự gửi, không tin được.
      Header ít phần tử hơn số hop thì lấy phần tử trái nhất (đều do proxy tin cậy thêm vào).
    """
    if settings.TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for", "")
        hops = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        if hops:
            index = max(len(hops) - max(settings.TRUSTED_PROXY_HOPS, 1), 0)
            return hops[index]
    return request.client.host if request.client else None


def get_user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


ClientIp = Annotated[str | None, Depends(get_client_ip)]
UserAgent = Annotated[str | None, Depends(get_user_agent)]


async def check_origin(request: Request) -> None:
    """Chống CSRF cho các route dùng cookie: có header Origin thì phải là FRONTEND_URL.

    Khi ENV != production, cho thêm chính địa chỉ API (để thử /auth/refresh, /auth/logout trên /docs).
    Ở production chỉ chấp nhận FRONTEND_URL.
    """
    origin = request.headers.get("origin")
    if not origin:
        return
    allowed = {settings.FRONTEND_URL.rstrip("/")}
    if not settings.is_production:
        allowed.add(f"{request.url.scheme}://{request.url.netloc}")
    if origin.rstrip("/") not in allowed:
        raise AppError("FORBIDDEN_ORIGIN")


async def require_daily_check_done(user: CurrentUser, session: DbSession) -> User:
    """Chặn route học khi chưa vượt Cửa Ải hôm nay (ngày theo múi giờ người dùng). Lần đầu trong ngày tự tạo Cửa Ải."""
    from app.services import daily_check_service  # tránh import vòng khi nạp model

    await daily_check_service.require_done(session, user, clock.now())
    return user


DailyCheckDone = Depends(require_daily_check_done)
