"""
Máy chủ Socket.IO bất đồng bộ (python-socketio, ASGI). Nhiều tiến trình đồng bộ phòng/sự kiện qua Redis (AsyncRedisManager);
khi chạy test thì dùng bộ quản lý trong bộ nhớ. Được gắn vào FastAPI ở app/main.py.
"""

import socketio

from app.core.config import settings


def _client_manager() -> socketio.AsyncRedisManager | None:
    return socketio.AsyncRedisManager(settings.REDIS_URL) if settings.use_redis else None


sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[settings.FRONTEND_URL],
    client_manager=_client_manager(),
)
