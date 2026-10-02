"""
Kết nối Redis bất đồng bộ (redis.asyncio), mở và đóng trong lifespan của app.
Khi Redis không chạy, app vẫn khởi động được: `get_redis()` trả None và nơi dùng tự xử lý
(giới hạn đăng nhập khi đó tạm bỏ qua và ghi cảnh báo).
"""

import logging

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Redis | None = None


async def connect_redis() -> None:
    global _client
    if not settings.REDIS_URL:
        return
    client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await client.ping()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Không thể kết nối tới Redis (%s). Giới hạn đăng nhập và ghép trận sẽ bị hạn chế.", exc)
        await client.aclose()
        return
    _client = client
    logger.info("Kết nối Redis thành công.")


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def redis_ready() -> bool:
    return _client is not None


async def get_redis() -> Redis | None:
    """Dependency: client Redis dùng chung, hoặc None khi Redis không chạy."""
    return _client
