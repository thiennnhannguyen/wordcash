"""
Kết nối PostgreSQL bất đồng bộ (SQLAlchemy 2.0 + asyncpg) và lớp gốc `Base` cho mọi model.
Mỗi request nhận một AsyncSession riêng qua `get_db`. `hide_parameters` để lỗi SQL ghi vào log không kèm dữ liệu
(email, mã băm mật khẩu, mã băm token).
"""

import enum
from collections.abc import AsyncIterator

from sqlalchemy import Enum, MetaData, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Quy ước tên ràng buộc để Alembic sinh migration ổn định
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def str_enum(cls: type[enum.StrEnum], name: str, length: int = 16) -> Enum:
    """Cột enum lưu dạng VARCHAR + CHECK (không dùng ENUM riêng của PostgreSQL) để migration lùi/tiến không vướng kiểu dữ liệu."""
    return Enum(cls, name=name, native_enum=False, create_constraint=True, length=length, values_callable=lambda e: [m.value for m in e])


engine = create_async_engine(
    settings.database_url, pool_pre_ping=True, hide_parameters=True, connect_args={"timeout": 5}
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def ping_database() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:  # noqa: BLE001 - chỉ để báo trạng thái
        return False
