"""
Bộ nhớ đệm JSON ngắn hạn cho số liệu dùng chung (bảng xếp hạng 60 giây, số liệu công khai 10 phút).

- Lưu trong Redis (`SET key value EX ttl`). Redis không có hoặc lỗi thì dùng bộ nhớ dự phòng của tiến trình (dict có thời hạn,
  riêng từng tiến trình), không bao giờ làm hỏng request: lỗi đọc/ghi cache chỉ ghi cảnh báo và tính lại.
- Giá trị phải là JSON (dict/list/số/chuỗi); datetime/date đổi sang ISO qua jsonable_encoder trước khi lưu.
- `get_or_compute(redis, key, ttl, compute)`: có trong cache thì trả, không thì gọi `compute()` (async) rồi lưu.
"""

import json
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi.encoders import jsonable_encoder
from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

MEMORY_MAX_KEYS = 1_000
memory: dict[str, tuple[float, str]] = {}  # khóa → (hết hạn theo time.monotonic, JSON)


def _memory_get(key: str) -> Any | None:
    item = memory.get(key)
    if item is None:
        return None
    if item[0] <= time.monotonic():
        memory.pop(key, None)
        return None
    return json.loads(item[1])


def _memory_set(key: str, raw: str, ttl: int) -> None:
    if len(memory) >= MEMORY_MAX_KEYS:
        now = time.monotonic()
        for k in [k for k, (exp, _) in memory.items() if exp <= now]:
            memory.pop(k, None)
        if len(memory) >= MEMORY_MAX_KEYS:
            memory.clear()
    memory[key] = (time.monotonic() + ttl, raw)


async def get_or_compute(redis: Redis | None, key: str, ttl: int, compute: Callable[[], Awaitable[Any]]) -> Any:
    if redis is not None:
        try:
            raw = await redis.get(key)
            if raw is not None:
                return json.loads(raw)
        except RedisError as exc:
            logger.warning("Không đọc được cache Redis (%s); dùng bộ nhớ dự phòng.", type(exc).__name__)
            redis = None
    if redis is None:
        hit = _memory_get(key)
        if hit is not None:
            return hit

    value = jsonable_encoder(await compute())
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if redis is not None:
        try:
            await redis.set(key, raw, ex=ttl)
            return value
        except RedisError as exc:
            logger.warning("Không ghi được cache Redis (%s); dùng bộ nhớ dự phòng.", type(exc).__name__)
    _memory_set(key, raw, ttl)
    return value
