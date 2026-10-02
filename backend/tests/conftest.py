"""
Cấu hình chung cho pytest: app test, DB test.

- ENV=testing đặt trước khi import app → mọi thứ dùng TEST_DATABASE_URL (database test riêng, PostgreSQL thật).
- Bảng tạo một lần cho cả phiên test; mỗi test chạy trong một transaction rồi rollback, nên dữ liệu không rò sang test khác.
  Service gọi session.commit() bình thường: commit chỉ đóng SAVEPOINT bên trong transaction đó.
"""

import os

os.environ["ENV"] = "testing"

import pytest_asyncio  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.models import Base  # noqa: E402


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(settings.TEST_DATABASE_URL, poolclass=NullPool, hide_parameters=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async with test_engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()


@pytest_asyncio.fixture
async def live_server():
    """Chạy asgi_app (FastAPI + Socket.IO) bằng uvicorn trên cổng ngẫu nhiên, trả về URL gốc."""
    import asyncio

    import uvicorn

    from app.main import asgi_app

    server = uvicorn.Server(uvicorn.Config(asgi_app, host="127.0.0.1", port=0, lifespan="off", log_level="warning"))
    task = asyncio.create_task(server.serve())
    while not server.started:
        await asyncio.sleep(0.02)
    port = server.servers[0].sockets[0].getsockname()[1]
    yield f"http://127.0.0.1:{port}"
    server.should_exit = True
    await task
