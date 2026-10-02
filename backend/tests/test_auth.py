"""
Kiểm thử đăng ký, đăng nhập, /auth/me và định dạng lỗi chung.
"""

from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings


async def test_health(client):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["status"] == "online"
    assert body["data"]["database"] is True


async def test_register_returns_token_and_user(registered_user):
    payload, data = registered_user
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["expires_in"] == settings.JWT_EXPIRE_MINUTES * 60
    user = data["user"]
    assert user["email"] == payload["email"]
    assert user["display_name"] == "Nhân"
    assert user["current_streak"] == 0 and user["spins_normal"] == 0
    assert "password_hash" not in user and "password" not in user


async def test_register_duplicate_email_case_insensitive(client, registered_user):
    payload, _ = registered_user
    res = await client.post("/api/v1/auth/register", json={**payload, "email": "NHAN@wordclash.vn"})
    assert res.status_code == 409
    body = res.json()
    assert body == {"success": False, "message": "Email này đã được dùng.", "errors": {"email": "Email này đã được dùng."}}


async def test_register_validation_errors(client):
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "khong-phai-email", "password": "ngan", "display_name": "   ", "timezone": "Sao/Hoa"},
    )
    assert res.status_code == 422
    body = res.json()
    assert body["success"] is False
    assert set(body["errors"]) == {"email", "password", "display_name", "timezone"}


async def test_password_is_hashed(client, registered_user):
    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.models import User

    payload, _ = registered_user
    async with SessionLocal() as session:
        user = await session.scalar(select(User))
    assert user.password_hash != payload["password"]
    assert user.password_hash.startswith("$argon2")


async def test_login_success(client, registered_user):
    payload, _ = registered_user
    res = await client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["access_token"]
    assert body["data"]["user"]["email"] == payload["email"]


async def test_login_wrong_password_and_unknown_email_same_error(client, registered_user):
    payload, _ = registered_user
    wrong = await client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "SaiMatKhau1"})
    unknown = await client.post("/api/v1/auth/login", json={"email": "ai@wordclash.vn", "password": "SaiMatKhau1"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"success": False, "message": "Email hoặc mật khẩu không đúng."}


async def test_token_form_for_docs(client, registered_user):
    payload, _ = registered_user
    res = await client.post("/api/v1/auth/token", data={"username": payload["email"], "password": payload["password"]})
    assert res.status_code == 200
    assert res.json()["token_type"] == "bearer"


async def test_me_with_token(client, registered_user):
    _, data = registered_user
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert res.status_code == 200
    assert res.json()["data"]["id"] == data["user"]["id"]


async def test_me_without_token(client):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.json() == {"success": False, "message": "Bạn cần đăng nhập."}


async def test_me_with_invalid_or_expired_token(client, registered_user):
    _, data = registered_user
    expired = jwt.encode(
        {"sub": str(data["user"]["id"]), "exp": datetime.now(UTC) - timedelta(minutes=1), "type": "access"},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    for token in ("rac", expired):
        res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401
        assert res.headers["www-authenticate"] == "Bearer"
        assert res.json()["success"] is False


async def test_unknown_route_uses_error_format(client):
    res = await client.get("/api/v1/khong-co")
    assert res.status_code == 404
    assert res.json() == {"success": False, "message": "Không tìm thấy."}
