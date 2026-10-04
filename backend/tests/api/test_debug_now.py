"""
Header X-Debug-Now: chỉ có tác dụng khi ENV development/e2e. Ở production (và testing) bị bỏ qua hoàn toàn.
Dùng một app nhỏ gắn DebugNowMiddleware, trả lại clock.now() mà route nhìn thấy.
"""

from datetime import UTC, datetime

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core import clock
from app.core.config import settings
from app.core.debug_time import DebugNowMiddleware
from app.main import app as real_app

FAKE = "2030-01-01T00:00:00+00:00"


def _probe_app() -> FastAPI:
    probe = FastAPI()
    probe.add_middleware(DebugNowMiddleware)

    @probe.get("/now")
    async def now():
        return {"now": clock.now().isoformat()}

    return probe


async def _now_seen(headers: dict) -> tuple[int, dict]:
    async with AsyncClient(transport=ASGITransport(app=_probe_app()), base_url="http://test") as c:
        res = await c.get("/now", headers=headers)
        return res.status_code, res.json()


@pytest.mark.parametrize("env", ["development", "e2e"])
async def test_header_overrides_now_in_dev_and_e2e(monkeypatch, env):
    monkeypatch.setattr(settings, "ENV", env)
    status, body = await _now_seen({"X-Debug-Now": FAKE})
    assert status == 200 and datetime.fromisoformat(body["now"]) == datetime(2030, 1, 1, tzinfo=UTC)
    # Request sau không mang header thì về giờ thật
    _, body = await _now_seen({})
    assert datetime.fromisoformat(body["now"]).year != 2030


@pytest.mark.parametrize("env", ["production", "testing"])
async def test_header_ignored_in_production(monkeypatch, env):
    monkeypatch.setattr(settings, "ENV", env)
    status, body = await _now_seen({"X-Debug-Now": FAKE})
    assert status == 200 and datetime.fromisoformat(body["now"]).year != 2030
    # Kể cả giá trị rác cũng không bị đọc
    status, _ = await _now_seen({"X-Debug-Now": "not-a-date"})
    assert status == 200


async def test_invalid_header_in_dev_is_validation_error(monkeypatch):
    monkeypatch.setattr(settings, "ENV", "development")
    status, body = await _now_seen({"X-Debug-Now": "yesterday"})
    assert status == 422 and body["error"]["code"] == "VALIDATION_ERROR"


def test_real_app_has_middleware():
    assert any(m.cls is DebugNowMiddleware for m in real_app.user_middleware)
