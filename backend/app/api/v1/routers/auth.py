"""
Đăng ký, đăng nhập, lấy thông tin người dùng hiện tại.
`/auth/token` nhận form OAuth2 (username = email) chỉ để nút "Authorize" ở /docs dùng được; frontend gọi `/auth/login` (JSON).

TODO: làm mới token.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DbSession
from app.core.security import create_access_token
from app.schemas.auth import AuthOut, LoginIn, RegisterIn, TokenOut, UserOut
from app.schemas.common import ApiResponse, ErrorResponse
from app.services import auth as auth_service
from app.utils.responses import success_response

router = APIRouter(prefix="/auth", tags=["Tài khoản"])


def _auth_payload(user) -> dict:
    token, expires_in = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "expires_in": expires_in, "user": UserOut.model_validate(user)}


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiResponse[AuthOut],
    responses={409: {"model": ErrorResponse, "description": "Email đã được dùng"}},
    summary="Đăng ký tài khoản",
)
async def register(data: RegisterIn, session: DbSession):
    user = await auth_service.register_user(session, data)
    return success_response(_auth_payload(user), "Đăng ký thành công")


@router.post(
    "/login",
    response_model=ApiResponse[AuthOut],
    responses={401: {"model": ErrorResponse, "description": "Sai email hoặc mật khẩu"}},
    summary="Đăng nhập, trả access token",
)
async def login(data: LoginIn, session: DbSession):
    user = await auth_service.authenticate(session, data.email, data.password)
    return success_response(_auth_payload(user), "Đăng nhập thành công")


@router.post("/token", response_model=TokenOut, summary="Lấy token dạng form OAuth2 (dùng cho /docs)")
async def token(form: Annotated[OAuth2PasswordRequestForm, Depends()], session: DbSession):
    user = await auth_service.authenticate(session, form.username, form.password)
    access_token, expires_in = create_access_token(user.id)
    return TokenOut(access_token=access_token, expires_in=expires_in)


@router.get(
    "/me",
    response_model=ApiResponse[UserOut],
    responses={401: {"model": ErrorResponse, "description": "Chưa đăng nhập"}},
    summary="Thông tin người dùng hiện tại",
)
async def me(user: CurrentUser):
    return success_response(UserOut.model_validate(user))
