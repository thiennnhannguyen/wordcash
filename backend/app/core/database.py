"""
Kết nối PostgreSQL bất đồng bộ (SQLAlchemy 2.0 + asyncpg). Mỗi request nhận một AsyncSession riêng qua `get_db`.
Khi chạy test có thể dùng SQLite trong bộ nhớ (aiosqlite); khi đó mọi kết nối dùng chung một connection.
"""

from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings


def _engine_options(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    return {"pool_pre_ping": True}


engine = create_async_engine(settings.database_url, **_engine_options(settings.database_url))
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
