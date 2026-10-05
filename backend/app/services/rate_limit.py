"""
Giới hạn tần suất (chống dò mật khẩu, chống spam đăng ký). Bộ đếm chính nằm trong Redis.

- Đăng nhập sai: tăng 2 bộ đếm `rl:login:ip:{ip}` và `rl:login:id:{identifier}`, mỗi bộ sống LOGIN_WINDOW_SECONDS.
  Trước khi kiểm tra mật khẩu, một trong hai bộ ≥ LOGIN_MAX_ATTEMPTS thì từ chối (TOO_MANY_ATTEMPTS), kể cả khi mật khẩu đúng.
  Đăng nhập đúng thì xóa bộ đếm của identifier.
- Đăng ký: tối đa REGISTER_MAX_PER_HOUR lần mỗi IP mỗi giờ (`rl:register:ip:{ip}`).
- Quay thẻ: tối đa SPIN_RATE_LIMIT_PER_MINUTE request POST /collection/spins mỗi người mỗi phút (`rl:spin:{user_id}`).
- Trên Redis, tăng bộ đếm bằng INCR + EXPIRE NX trong một pipeline MULTI (nguyên tử; NX = chỉ đặt hạn khi khóa vừa được tạo).

Khi Redis không có hoặc lỗi: vẫn cho đăng nhập, nhưng chuyển sang bộ đếm dự phòng trong bộ nhớ (dict có thời hạn,
riêng từng tiến trình) để vẫn chặn được dò mật khẩu ở mức cơ bản. Cảnh báo ghi ở mức WARNING, tối đa một lần mỗi
WARN_INTERVAL_SECONDS, chỉ kèm loại lỗi (không kèm khóa, IP hay identifier).
"""

import logging
import time
from collections.abc import Awaitable, Callable

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)

REGISTER_WINDOW_SECONDS = 3600
WARN_INTERVAL_SECONDS = 60
MEMORY_MAX_KEYS = 50_000


class RedisCounters:
    """Bộ đếm trên Redis."""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def incr(self, key: str, window: int) -> int:
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, window, nx=True)
            count, _ = await pipe.execute()
        return int(count)

    async def counts(self, keys: list[str]) -> list[int]:
        return [int(v) if v is not None else 0 for v in await self.redis.mget(keys)]

    async def ttl(self, key: str) -> int:
        return await self.redis.ttl(key)

    async def delete(self, key: str) -> None:
        await self.redis.delete(key)


class MemoryCounters:
    """Bộ đếm dự phòng trong bộ nhớ của tiến trình: {khóa: (số đếm, hết hạn theo time.monotonic)}."""

    def __init__(self, clock: Callable[[], float] = time.monotonic):
        self._data: dict[str, tuple[int, float]] = {}
        self._clock = clock

    def _live(self, key: str) -> tuple[int, float] | None:
        item = self._data.get(key)
        if item is not None and item[1] <= self._clock():
            del self._data[key]
            return None
        return item

    def _prune(self) -> None:
        if len(self._data) >= MEMORY_MAX_KEYS:
            now = self._clock()
            for key in [k for k, (_, exp) in self._data.items() if exp <= now]:
                del self._data[key]
            if len(self._data) >= MEMORY_MAX_KEYS:  # vẫn đầy: bỏ các khóa sắp hết hạn nhất
                for key in sorted(self._data, key=lambda k: self._data[k][1])[: MEMORY_MAX_KEYS // 10]:
                    del self._data[key]

    async def incr(self, key: str, window: int) -> int:
        item = self._live(key)
        if item is None:
            self._prune()
            item = (0, self._clock() + window)
        count = item[0] + 1
        self._data[key] = (count, item[1])
        return count

    async def counts(self, keys: list[str]) -> list[int]:
        return [(self._live(k) or (0, 0))[0] for k in keys]

    async def ttl(self, key: str) -> int:
        item = self._live(key)
        return max(int(item[1] - self._clock() + 0.999), 1) if item else -2

    async def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def clear(self) -> None:
        self._data.clear()


memory_counters = MemoryCounters()
_last_warning = float("-inf")


def _warn(reason: str) -> None:
    global _last_warning
    now = time.monotonic()
    if now - _last_warning >= WARN_INTERVAL_SECONDS:
        _last_warning = now
        logger.warning("Redis không dùng được (%s): giới hạn tần suất chuyển sang bộ đếm trong bộ nhớ.", reason)


async def _run[T](redis: Redis | None, op: Callable[[RedisCounters | MemoryCounters], Awaitable[T]]) -> T:
    """Chạy thao tác trên Redis; Redis không có hoặc lỗi thì chạy trên bộ đếm trong bộ nhớ."""
    if redis is not None:
        try:
            return await op(RedisCounters(redis))
        except RedisError as exc:
            _warn(type(exc).__name__)
    else:
        _warn("chưa kết nối")
    return await op(memory_counters)


def _login_keys(ip: str | None, identifier: str) -> list[str]:
    keys = [f"rl:login:id:{identifier.strip().lower()}"]
    if ip:
        keys.insert(0, f"rl:login:ip:{ip}")
    return keys


async def _too_many(counters: RedisCounters | MemoryCounters, keys: list[str]) -> AppError:
    ttl = max([await counters.ttl(k) for k in keys] + [1])
    return AppError("TOO_MANY_ATTEMPTS", details={"retry_after_seconds": ttl}, headers={"Retry-After": str(ttl)})


async def ensure_login_allowed(redis: Redis | None, ip: str | None, identifier: str) -> None:
    keys = _login_keys(ip, identifier)

    async def check(counters) -> AppError | None:
        values = await counters.counts(keys)
        blocked = [k for k, v in zip(keys, values, strict=True) if v >= settings.LOGIN_MAX_ATTEMPTS]
        return await _too_many(counters, blocked) if blocked else None

    error = await _run(redis, check)
    if error is not None:
        raise error


async def record_login_failure(redis: Redis | None, ip: str | None, identifier: str) -> None:
    async def hit(counters) -> None:
        for key in _login_keys(ip, identifier):
            await counters.incr(key, settings.LOGIN_WINDOW_SECONDS)

    await _run(redis, hit)


async def reset_login(redis: Redis | None, identifier: str) -> None:
    key = f"rl:login:id:{identifier.strip().lower()}"

    async def reset(counters) -> None:
        await counters.delete(key)

    await _run(redis, reset)


async def hit_register(redis: Redis | None, ip: str | None) -> None:
    """Đếm một lần đăng ký từ IP; vượt REGISTER_MAX_PER_HOUR thì TOO_MANY_ATTEMPTS."""
    if not ip:
        return
    key = f"rl:register:ip:{ip}"

    async def hit(counters) -> AppError | None:
        if await counters.incr(key, REGISTER_WINDOW_SECONDS) > settings.REGISTER_MAX_PER_HOUR:
            return await _too_many(counters, [key])
        return None

    error = await _run(redis, hit)
    if error is not None:
        raise error


SPIN_WINDOW_SECONDS = 60


async def hit_spin(redis: Redis | None, user_id) -> None:
    """Đếm một request quay thẻ của người dùng; vượt SPIN_RATE_LIMIT_PER_MINUTE thì TOO_MANY_ATTEMPTS."""
    key = f"rl:spin:{user_id}"

    async def hit(counters) -> AppError | None:
        if await counters.incr(key, SPIN_WINDOW_SECONDS) > settings.SPIN_RATE_LIMIT_PER_MINUTE:
            return await _too_many(counters, [key])
        return None

    error = await _run(redis, hit)
    if error is not None:
        raise error
