"""
Kết nối Redis bất đồng bộ (redis.asyncio), mở và đóng trong lifespan của app.
Khi Redis không chạy, app vẫn khởi động được; `get_redis()` khi đó ném RuntimeError để nơi gọi tự xử lý.
"""

import logging

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Redis | None = None


async def connect_redis() -> None:
    global _client
    if not settings.use_redis:
        return
    client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await client.ping()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Không thể kết nối tới Redis (%s). Ghép trận và cache sẽ bị hạn chế.", exc)
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


def get_redis() -> Redis:
    if _client is None:
        raise RuntimeError("Redis chưa được khởi tạo hoặc kết nối không thành công.")
    return _client
