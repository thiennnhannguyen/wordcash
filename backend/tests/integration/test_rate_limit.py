"""
Kiểm thử giới hạn đăng nhập sai và đăng ký theo IP (Redis giả bằng fakeredis).
"""

import pytest
from fakeredis import FakeAsyncRedis

from app.core.config import settings
from app.core.errors import AppError
from app.schemas.auth import RegisterIn
from app.services import auth_service as svc
from app.services import rate_limit

PASSWORD = "Wordclash2026"


@pytest.fixture
async def redis():
    client = FakeAsyncRedis(decode_responses=True)
    yield client
    await client.aclose()


async def _register(db, redis, n=0, ip="10.0.0.1"):
    data = RegisterIn(email=f"u{n}@wordclash.vn", username=f"user{n}", display_name="U", password=PASSWORD)
    return await svc.register(db, data, ip, None, redis=redis)


async def _login(db, redis, identifier="user0", password=PASSWORD, ip="10.0.0.1"):
    return await svc.login(db, identifier, password, ip, None, redis=redis)


async def test_sixth_attempt_blocked_even_with_correct_password(db_session, redis):
    await _register(db_session, redis)
    for _ in range(settings.LOGIN_MAX_ATTEMPTS):
        with pytest.raises(AppError) as err:
            await _login(db_session, redis, password="SaiMatKhau1")
        assert err.value.code == "INVALID_CREDENTIALS"
    with pytest.raises(AppError) as err:
        await _login(db_session, redis)
    assert err.value.code == "TOO_MANY_ATTEMPTS" and err.value.status_code == 429
    retry = err.value.details["retry_after_seconds"]
    assert 0 < retry <= settings.LOGIN_WINDOW_SECONDS
    assert err.value.headers == {"Retry-After": str(retry)}
    assert await redis.ttl("rl:login:id:user0") > 0


async def test_identifier_counter_is_case_insensitive_and_shared_across_ips(db_session, redis):
    await _register(db_session, redis)
    for i in range(settings.LOGIN_MAX_ATTEMPTS):
        with pytest.raises(AppError):
            await _login(db_session, redis, identifier="USER0", password="SaiMatKhau1", ip=f"10.0.1.{i}")
    with pytest.raises(AppError) as err:
        await _login(db_session, redis, ip="10.9.9.9")
    assert err.value.code == "TOO_MANY_ATTEMPTS"


async def test_ip_counter_blocks_across_identifiers(db_session, redis):
    await _register(db_session, redis)
    for i in range(settings.LOGIN_MAX_ATTEMPTS):
        with pytest.raises(AppError):
            await _login(db_session, redis, identifier=f"khong-co-{i}", password="x")
    with pytest.raises(AppError) as err:
        await _login(db_session, redis)
    assert err.value.code == "TOO_MANY_ATTEMPTS"
    assert (await _login(db_session, redis, ip="10.0.0.2")).user.username == "user0"


async def test_success_resets_identifier_counter(db_session, redis):
    await _register(db_session, redis)
    for _ in range(settings.LOGIN_MAX_ATTEMPTS - 1):
        with pytest.raises(AppError):
            await _login(db_session, redis, password="SaiMatKhau1", ip="10.0.2.1")
    await _login(db_session, redis, ip="10.0.2.2")
    assert await redis.get("rl:login:id:user0") is None
    with pytest.raises(AppError) as err:
        await _login(db_session, redis, password="SaiMatKhau1", ip="10.0.2.3")
    assert err.value.code == "INVALID_CREDENTIALS"


async def test_register_limit_per_ip(db_session, redis):
    for n in range(settings.REGISTER_MAX_PER_HOUR):
        await _register(db_session, redis, n)
    with pytest.raises(AppError) as err:
        await _register(db_session, redis, 99)
    assert err.value.code == "TOO_MANY_ATTEMPTS"
    assert 3500 < err.value.details["retry_after_seconds"] <= 3600
    await _register(db_session, redis, 100, ip="10.0.0.2")


async def test_counter_expiry_set_once(redis):
    await rate_limit.record_login_failure(redis, "1.1.1.1", "a")
    await redis.expire("rl:login:id:a", 5)
    await rate_limit.record_login_failure(redis, "1.1.1.1", "a")
    assert await redis.get("rl:login:id:a") == "2"
    assert await redis.ttl("rl:login:id:a") <= 5  # lần tăng sau không kéo dài hạn


async def test_without_redis_fails_open(db_session):
    await _register(db_session, None)
    for _ in range(settings.LOGIN_MAX_ATTEMPTS + 1):
        with pytest.raises(AppError) as err:
            await _login(db_session, None, password="SaiMatKhau1")
        assert err.value.code == "INVALID_CREDENTIALS"
    assert (await _login(db_session, None)).user.username == "user0"
