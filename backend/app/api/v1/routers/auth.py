"""
Tài khoản và phiên đăng nhập: đăng ký, đăng nhập, làm mới phiên (xoay vòng refresh token), đăng xuất, đổi mật khẩu.

Access token trả trong body (client giữ trong bộ nhớ, gửi qua Authorization: Bearer). Refresh token chỉ nằm trong
cookie httpOnly `wc_refresh` (path /api/v1/auth). Các route dùng cookie kiểm tra Origin để chống CSRF.
"""

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.cookies import clear_refresh_cookie, set_refresh_cookie
from app.api.deps import ClientIp, CurrentUser, DbSession, RedisClient, UserAgent, check_origin
from app.api.responses import error_responses
from app.core.config import settings
from app.core.errors import AuthError
from app.schemas.auth import AccessTokenOut, ChangePasswordIn, LoginIn, RegisterIn, TokenOut
from app.schemas.user import UserOut
from app.services import auth_service
from app.services.auth_service import IssuedSession

router = APIRouter(prefix="/auth", tags=["Tài khoản"])

RefreshCookie = Annotated[str | None, Cookie(alias=settings.COOKIE_NAME, include_in_schema=False)]


def _token_out(issued: IssuedSession, response: Response | None = None) -> TokenOut:
    if response is not None and issued.refresh_token:
        set_refresh_cookie(response, issued.refresh_token)
    return TokenOut(access_token=issued.access_token, expires_in=issued.expires_in, user=UserOut.model_validate(issued.user))


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=TokenOut,
    summary="Đăng ký tài khoản",
    description="Tạo tài khoản, trả access token và đặt cookie refresh token (httpOnly).",
    responses=error_responses("EMAIL_TAKEN", "USERNAME_TAKEN", "VALIDATION_ERROR", "TOO_MANY_ATTEMPTS"),
)
async def register(data: RegisterIn, response: Response, session: DbSession, redis: RedisClient, ip: ClientIp, ua: UserAgent):
    issued = await auth_service.register(session, data, ip, ua, redis=redis)
    return _token_out(issued, response)


@router.post(
    "/login",
    response_model=TokenOut,
    summary="Đăng nhập bằng email hoặc tên người dùng",
    description="Trả access token và đặt cookie refresh token. Sai tài khoản hay sai mật khẩu đều trả INVALID_CREDENTIALS.",
    responses=error_responses("INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "VALIDATION_ERROR", "TOO_MANY_ATTEMPTS"),
)
async def login(data: LoginIn, response: Response, session: DbSession, redis: RedisClient, ip: ClientIp, ua: UserAgent):
    issued = await auth_service.login(session, data.identifier, data.password, ip, ua, redis=redis)
    return _token_out(issued, response)


@router.post(
    "/token",
    response_model=AccessTokenOut,
    summary="Lấy access token (form OAuth2, chỉ dùng cho nút Authorize trên /docs)",
    description="`username` nhận email hoặc tên người dùng. Không tạo phiên refresh.",
    responses=error_responses("INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "TOO_MANY_ATTEMPTS"),
)
async def token(
    form: Annotated[OAuth2PasswordRequestForm, Depends()], session: DbSession, redis: RedisClient, ip: ClientIp, ua: UserAgent
):
    issued = await auth_service.login(session, form.username, form.password, ip, ua, redis=redis, with_refresh=False)
    return AccessTokenOut(access_token=issued.access_token)


@router.post(
    "/refresh",
    response_model=TokenOut,
    dependencies=[Depends(check_origin)],
    summary="Làm mới phiên",
    description="Đọc cookie refresh token, thu hồi nó và cấp cặp token mới cùng phiên. Dùng lại token cũ sẽ hủy cả phiên.",
    responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED", "SESSION_REVOKED", "ACCOUNT_DISABLED", "FORBIDDEN_ORIGIN"),
)
async def refresh(response: Response, session: DbSession, ip: ClientIp, ua: UserAgent, refresh_token: RefreshCookie = None):
    if not refresh_token:
        raise AuthError("TOKEN_INVALID")
    issued = await auth_service.rotate_refresh(session, refresh_token, ip, ua)
    return _token_out(issued, response)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(check_origin)],
    summary="Đăng xuất phiên hiện tại",
    description="Hủy phiên của cookie refresh token và xóa cookie. Luôn trả 204, kể cả khi cookie không hợp lệ.",
    responses=error_responses("FORBIDDEN_ORIGIN"),
)
async def logout(response: Response, session: DbSession, refresh_token: RefreshCookie = None):
    await auth_service.revoke_family(session, refresh_token)
    clear_refresh_cookie(response)


@router.post(
    "/logout-all",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(check_origin)],
    summary="Đăng xuất mọi thiết bị",
    responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED", "ACCOUNT_DISABLED", "FORBIDDEN_ORIGIN"),
)
async def logout_all(response: Response, user: CurrentUser, session: DbSession):
    await auth_service.revoke_all(session, user.id)
    clear_refresh_cookie(response)


@router.post(
    "/change-password",
    response_model=TokenOut,
    summary="Đổi mật khẩu",
    description="Hủy mọi phiên khác, giữ phiên hiện tại (theo cookie), trả access token mới.",
    responses=error_responses("WRONG_PASSWORD", "WEAK_PASSWORD", "TOKEN_INVALID", "TOKEN_EXPIRED", "VALIDATION_ERROR"),
)
async def change_password(data: ChangePasswordIn, user: CurrentUser, session: DbSession, refresh_token: RefreshCookie = None):
    family_id = await auth_service.current_family(session, refresh_token, user.id)
    issued = await auth_service.change_password(session, user, data.current_password, data.new_password, family_id)
    return _token_out(issued)
