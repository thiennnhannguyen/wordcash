"""
Điểm vào ứng dụng: tạo FastAPI, gắn CORS, exception handler, router /api/v1 và Socket.IO.

Chạy dev:    uvicorn app.main:asgi_app --reload --port 5000   (frontend proxy /api, /socket.io sang cổng 5000)
Triển khai:  uvicorn app.main:asgi_app --host 0.0.0.0 --port $PORT
Ban đầu chạy 1 worker; khi nhiều worker phải bật sticky session cho Socket.IO (Redis đã đồng bộ sự kiện giữa các tiến trình).
"""

import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import engine, ping_database
from app.core.exceptions import register_exception_handlers
from app.core.redis import close_redis, connect_redis
from app.game import events  # noqa: F401 - đăng ký sự kiện Socket.IO
from app.game.server import sio

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not await ping_database():
        logger.warning("Không kết nối được cơ sở dữ liệu (%s).", engine.url.render_as_string(hide_password=True))
    await connect_redis()
    yield
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="WORDCLASH API",
    description="API cho WORDCLASH: Học Viện, Đấu Trường, Bộ Sưu Tập. Mọi phản hồi có dạng {success, message, data | errors}.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)
app.include_router(api_router)

asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
