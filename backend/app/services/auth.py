"""
Tài khoản: đăng ký, xác thực email/mật khẩu, lấy người dùng theo id. Hàm async nhận AsyncSession làm tham số.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.auth import RegisterIn


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(select(User).where(User.email == email.lower()))


async def get_user(session: AsyncSession, user_id: int) -> User | None:
    return await session.get(User, user_id)


async def register_user(session: AsyncSession, data: RegisterIn) -> User:
    if await get_user_by_email(session, data.email):
        raise AppError("Email này đã được dùng.", 409, {"email": "Email này đã được dùng."})
    user = User(
        email=data.email,
        password_hash=await hash_password(data.password),
        display_name=data.display_name,
        timezone=data.timezone,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    user = await get_user_by_email(session, email)
    # Luôn kiểm tra mật khẩu (kể cả khi không có email) để thời gian phản hồi như nhau
    valid = await verify_password(password, user.password_hash if user else None)
    if user is None or not valid:
        raise AppError("Email hoặc mật khẩu không đúng.", 401)
    return user
