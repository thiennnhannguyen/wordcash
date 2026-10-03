"""
Kiểm thử hành vi khác nhau giữa môi trường dev và production: tài liệu API, Origin cho phép.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import create_app

DOC_PATHS = ("/docs", "/redoc", "/openapi.json")


async def _status(app, path: str) -> int:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        return (await c.get(path)).status_code


@pytest.mark.parametrize("path", DOC_PATHS)
async def test_docs_enabled_in_development(monkeypatch, path):
    monkeypatch.setattr(settings, "ENV", "development")
    assert await _status(create_app(), path) == 200


@pytest.mark.parametrize("path", DOC_PATHS)
async def test_docs_disabled_in_production(monkeypatch, path):
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "ENABLE_DOCS", False)
    assert await _status(create_app(), path) == 404


@pytest.mark.parametrize("path", DOC_PATHS)
async def test_docs_can_be_enabled_in_production(monkeypatch, path):
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "ENABLE_DOCS", True)
    assert await _status(create_app(), path) == 200


async def _refresh(client, token: str, origin: str):
    client.cookies.clear()
    return await client.post("/api/v1/auth/refresh", headers={"Cookie": f"{settings.COOKIE_NAME}={token}", "Origin": origin})


async def test_own_origin_allowed_outside_production(client, auth_user, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "development")
    res = await _refresh(client, auth_user["refresh_token"], "http://test")
    assert res.status_code == 200


async def test_own_origin_rejected_in_production(client, auth_user, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    res = await _refresh(client, auth_user["refresh_token"], "http://test")
    assert res.status_code == 403 and res.json()["error"]["code"] == "FORBIDDEN_ORIGIN"
    res = await _refresh(client, auth_user["refresh_token"], settings.FRONTEND_URL)
    assert res.status_code == 200


async def test_production_without_origin_header_still_works(client, auth_user, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    client.cookies.clear()
    res = await client.post("/api/v1/auth/refresh", headers={"Cookie": f"{settings.COOKIE_NAME}={auth_user['refresh_token']}"})
    assert res.status_code == 200
