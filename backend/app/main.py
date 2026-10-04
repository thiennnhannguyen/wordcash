"""
Điểm vào ứng dụng: tạo FastAPI, gắn CORS, exception handler, router /api/v1 và Socket.IO.

Chạy dev:    uvicorn app.main:asgi_app --reload   (cổng 8000; frontend proxy /api, /socket.io sang đây)
Triển khai:  uvicorn app.main:asgi_app --host 0.0.0.0 --port $PORT
Ban đầu chạy 1 worker; khi nhiều worker phải bật sticky session và SIO_USE_REDIS cho Socket.IO.
"""

import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import engine, ping_database
from app.core.debug_time import DebugNowMiddleware
from app.core.errors import register_exception_handlers
from app.core.redis import close_redis, connect_redis
from app.game import events  # noqa: F401 - đăng ký sự kiện Socket.IO
from app.game.sio_server import sio

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not await ping_database():
        logger.warning("Không kết nối được cơ sở dữ liệu (%s).", engine.url.render_as_string(hide_password=True))
    await connect_redis()
    yield
    await close_redis()
    await engine.dispose()


def create_app() -> FastAPI:
    """Dựng app theo settings hiện tại. Ở production tắt /docs, /redoc, /openapi.json trừ khi ENABLE_DOCS=true."""
    docs = settings.docs_enabled
    application = FastAPI(
        title="WORDCLASH API",
        description="API cho WORDCLASH: Học Viện, Đấu Trường, Bộ Sưu Tập.",
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/docs" if docs else None,
        redoc_url="/redoc" if docs else None,
        openapi_url="/openapi.json" if docs else None,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    # Chỉ đọc X-Debug-Now khi ENV development/e2e; production bỏ qua (xem core/debug_time.py)
    application.add_middleware(DebugNowMiddleware)
    register_exception_handlers(application)
    application.include_router(api_router)
    return application


app = create_app()
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
