"""
Kiểm thử định dạng lỗi thống nhất {"error": {code, message, details}}.
"""

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.errors import ERRORS, AppError, AuthError, register_exception_handlers
from app.schemas.auth import RegisterIn


def _app() -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/taken")
    async def taken():
        raise AppError("EMAIL_TAKEN")

    @app.get("/limited")
    async def limited():
        raise AppError("TOO_MANY_ATTEMPTS", details={"retry_after_seconds": 42}, headers={"Retry-After": "42"})

    @app.get("/expired")
    async def expired():
        raise AuthError("TOKEN_EXPIRED")

    @app.post("/register")
    async def register(data: RegisterIn):
        return {}

    @app.get("/boom")
    async def boom():
        raise RuntimeError("bí mật không được lộ")

    return app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=_app(), raise_app_exceptions=False), base_url="http://test") as c:
        yield c


async def test_app_error_format(client):
    res = await client.get("/taken")
    assert res.status_code == 409
    assert res.json() == {"error": {"code": "EMAIL_TAKEN", "message": "Email này đã được dùng", "details": None}}


async def test_too_many_attempts_details_and_header(client):
    res = await client.get("/limited")
    assert res.status_code == 429
    assert res.headers["retry-after"] == "42"
    assert res.json()["error"]["details"] == {"retry_after_seconds": 42}


async def test_auth_error_has_bearer_header(client):
    res = await client.get("/expired")
    assert res.status_code == 401
    assert res.headers["www-authenticate"] == "Bearer"
    assert res.json()["error"]["code"] == "TOKEN_EXPIRED"


async def test_validation_error_lists_fields_in_vietnamese(client):
    res = await client.post("/register", json={"email": "sai", "username": "Nhan-WC", "display_name": "", "password": "nhan-wc1"})
    assert res.status_code == 422
    error = res.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    by_field = {d["field"]: d["message"] for d in error["details"]}
    assert by_field == {
        "email": "Email không hợp lệ",
        "username": "Chỉ dùng chữ thường không dấu, số, dấu chấm và gạch dưới",
        "display_name": "Cần ít nhất 1 ký tự",
    }


async def test_password_same_as_username_is_field_error(client):
    res = await client.post("/register", json={"email": "a@wordclash.vn", "username": "nhan.wc2026", "display_name": "N", "password": "NHAN.WC2026"})
    assert res.json()["error"]["details"] == [{"field": "password", "message": "Mật khẩu không được trùng email hoặc tên người dùng"}]


async def test_missing_body_fields(client):
    res = await client.post("/register", json={})
    fields = {d["field"]: d["message"] for d in res.json()["error"]["details"]}
    assert set(fields) == {"email", "username", "display_name", "password"}
    assert set(fields.values()) == {"Trường này là bắt buộc"}


async def test_not_found_and_method(client):
    res = await client.get("/khong-co")
    assert res.status_code == 404 and res.json()["error"]["code"] == "NOT_FOUND"
    res = await client.delete("/taken")
    assert res.status_code == 405 and res.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


async def test_unhandled_error_hides_detail(client):
    res = await client.get("/boom")
    assert res.status_code == 500
    assert res.json() == {"error": {"code": "INTERNAL_ERROR", "message": ERRORS["INTERNAL_ERROR"][1], "details": None}}
    assert "bí mật" not in res.text
