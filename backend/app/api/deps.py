"""
Dependency dùng chung cho router: phiên DB theo request, người dùng hiện tại từ JWT (OAuth2PasswordBearer).
"""

from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.security import InvalidTokenError, decode_access_token
from app.models import User
from app.services.auth import get_user

# tokenUrl trỏ tới endpoint dạng form để nút "Authorize" ở /docs dùng được
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

DbSession = Annotated[AsyncSession, Depends(get_db)]

UNAUTHORIZED = {"WWW-Authenticate": "Bearer"}


async def get_current_user(session: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    try:
        user_id = decode_access_token(token)
    except InvalidTokenError as exc:
        raise AppError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", 401, headers=UNAUTHORIZED) from exc
    user = await get_user(session, user_id)
    if user is None:
        raise AppError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", 401, headers=UNAUTHORIZED)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
