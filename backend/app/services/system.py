"""
Trạng thái hệ thống cho GET /api/v1/health.
"""

from app.core.config import settings
from app.core.database import ping_database
from app.core.redis import redis_ready


async def health_status() -> dict:
    return {"status": "ok", "env": settings.ENV, "database": await ping_database(), "redis": redis_ready()}
