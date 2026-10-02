"""
Máy chủ Socket.IO bất đồng bộ (python-socketio, ASGI). Khi bật SIO_USE_REDIS, nhiều tiến trình đồng bộ sự kiện qua Redis.
"""

import socketio

from app.core.config import settings

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[settings.FRONTEND_URL],
    client_manager=socketio.AsyncRedisManager(settings.REDIS_URL) if settings.SIO_USE_REDIS else None,
)
