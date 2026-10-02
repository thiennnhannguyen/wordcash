"""
Cấu hình chung cho pytest: app test, DB test.

Đặt APP_ENV=testing trước khi import app nên mọi kết nối dùng TEST_DATABASE_URL (mặc định SQLite trong bộ nhớ;
đặt TEST_DATABASE_URL=postgresql+asyncpg://.../wordclash_test để chạy trên PostgreSQL) và không dùng Redis.
Bảng được tạo lại cho từng test. `client` gọi API qua httpx.AsyncClient + ASGITransport (không cần mở cổng);
`live_server` chạy uvicorn thật trên cổng ngẫu nhiên cho test Socket.IO.
"""

import asyncio
import os

os.environ["APP_ENV"] = "testing"

import pytest_asyncio  # noqa: E402
import uvicorn  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.main import app, asgi_app  # noqa: E402
from app.models import Base  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def registered_user(client):
    """Đăng ký một tài khoản mẫu, trả về (payload đăng ký, dữ liệu phản hồi)."""
    payload = {"email": "nhan@wordclash.vn", "password": "Wordclash2026", "display_name": "Nhân", "timezone": "Asia/Ho_Chi_Minh"}
    res = await client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201, res.text
    return payload, res.json()["data"]


@pytest_asyncio.fixture
async def live_server():
    """Chạy asgi_app (FastAPI + Socket.IO) bằng uvicorn trên cổng ngẫu nhiên, trả về URL gốc."""
    config = uvicorn.Config(asgi_app, host="127.0.0.1", port=0, lifespan="off", log_level="warning")
    server = uvicorn.Server(config)
    task = asyncio.create_task(server.serve())
    while not server.started:
        await asyncio.sleep(0.02)
    port = server.servers[0].sockets[0].getsockname()[1]
    yield f"http://127.0.0.1:{port}"
    server.should_exit = True
    await task


def make_token(user_id: int) -> str:
    return create_access_token(user_id)[0]
