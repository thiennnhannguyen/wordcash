"""
Giới hạn tần suất bằng Redis (chống dò mật khẩu, chống spam đăng ký).

- Đăng nhập sai: tăng 2 bộ đếm `rl:login:ip:{ip}` và `rl:login:id:{identifier}`, mỗi bộ sống LOGIN_WINDOW_SECONDS.
  Trước khi kiểm tra mật khẩu, một trong hai bộ ≥ LOGIN_MAX_ATTEMPTS thì từ chối (TOO_MANY_ATTEMPTS), kể cả khi mật khẩu đúng.
  Đăng nhập đúng thì xóa bộ đếm của identifier.
- Đăng ký: tối đa REGISTER_MAX_PER_HOUR lần mỗi IP mỗi giờ (`rl:register:ip:{ip}`).
Tăng bộ đếm bằng INCR + EXPIRE NX trong một pipeline MULTI (nguyên tử; NX = chỉ đặt hạn khi khóa vừa được tạo).
Redis không chạy hoặc lỗi giữa chừng thì bỏ qua giới hạn và ghi cảnh báo (không chặn người dùng đăng nhập).
"""

import logging

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)

REGISTER_WINDOW_SECONDS = 3600


def _login_keys(ip: str | None, identifier: str) -> list[str]:
    keys = [f"rl:login:id:{identifier.strip().lower()}"]
    if ip:
        keys.insert(0, f"rl:login:ip:{ip}")
    return keys


async def _incr(redis: Redis, key: str, window: int) -> int:
    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(key)
        pipe.expire(key, window, nx=True)
        count, _ = await pipe.execute()
    return int(count)


async def _too_many(redis: Redis, keys: list[str]) -> AppError:
    ttl = max([await redis.ttl(k) for k in keys] + [1])
    return AppError("TOO_MANY_ATTEMPTS", details={"retry_after_seconds": ttl}, headers={"Retry-After": str(ttl)})


def _skip(redis: Redis | None, exc: Exception | None = None) -> None:
    logger.warning("Bỏ qua giới hạn tần suất vì Redis không sẵn sàng%s", f" ({type(exc).__name__})" if exc else "")


async def ensure_login_allowed(redis: Redis | None, ip: str | None, identifier: str) -> None:
    if redis is None:
        return _skip(redis)
    keys = _login_keys(ip, identifier)
    try:
        values = await redis.mget(keys)
        blocked = [k for k, v in zip(keys, values, strict=True) if v is not None and int(v) >= settings.LOGIN_MAX_ATTEMPTS]
        if blocked:
            raise await _too_many(redis, blocked)
    except RedisError as exc:
        _skip(redis, exc)


async def record_login_failure(redis: Redis | None, ip: str | None, identifier: str) -> None:
    if redis is None:
        return
    try:
        for key in _login_keys(ip, identifier):
            await _incr(redis, key, settings.LOGIN_WINDOW_SECONDS)
    except RedisError as exc:
        _skip(redis, exc)


async def reset_login(redis: Redis | None, identifier: str) -> None:
    if redis is None:
        return
    try:
        await redis.delete(f"rl:login:id:{identifier.strip().lower()}")
    except RedisError as exc:
        _skip(redis, exc)


async def hit_register(redis: Redis | None, ip: str | None) -> None:
    """Đếm một lần đăng ký từ IP; vượt REGISTER_MAX_PER_HOUR thì TOO_MANY_ATTEMPTS."""
    if redis is None or not ip:
        return _skip(redis) if redis is None else None
    key = f"rl:register:ip:{ip}"
    try:
        if await _incr(redis, key, REGISTER_WINDOW_SECONDS) > settings.REGISTER_MAX_PER_HOUR:
            raise await _too_many(redis, [key])
    except RedisError as exc:
        _skip(redis, exc)
