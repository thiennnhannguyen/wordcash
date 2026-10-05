"""
Kiểm thử API tài khoản qua HTTP (httpx + ASGITransport): đăng ký, đăng nhập, phiên refresh, đăng xuất, đổi mật khẩu,
hồ sơ, onboarding, giới hạn tần suất, kiểm tra Origin. Socket.IO ở test_socket.py.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models import User

API = "/api/v1"
COOKIE = settings.COOKIE_NAME
PASSWORD = "Wordclash2026"
NEW_USER = {"email": "minh.thu@wordclash.vn", "username": "minh.thu", "display_name": "Minh Thư", "password": PASSWORD}


def error_code(res) -> str:
    return res.json()["error"]["code"]


async def refresh(client, token: str | None, origin: str | None = None):
    """Gọi /auth/refresh với đúng refresh token chỉ định (bỏ cookie đang có trong client)."""
    client.cookies.clear()
    headers = {}
    if token:
        headers["Cookie"] = f"{COOKIE}={token}"
    if origin:
        headers["Origin"] = origin
    return await client.post(f"{API}/auth/refresh", headers=headers)


async def login(client, identifier="nhan.wc", password=PASSWORD):
    client.cookies.clear()
    return await client.post(f"{API}/auth/login", json={"identifier": identifier, "password": password})


# 1. Đăng ký
async def test_register_success_sets_httponly_cookie(client):
    res = await client.post(f"{API}/auth/register", json={**NEW_USER, "timezone": "Asia/Bangkok"})
    assert res.status_code == 201
    body = res.json()
    assert body["token_type"] == "bearer" and body["expires_in"] == 900 and body["access_token"]
    user = body["user"]
    assert user["email"] == "minh.thu@wordclash.vn" and user["username"] == "minh.thu"
    assert user["timezone"] == "Asia/Bangkok"
    assert user["onboarding_completed"] is False and user["email_verified"] is False and user["role"] == "user"
    uuid.UUID(user["id"])
    assert "password" not in res.text and "password_hash" not in res.text
    set_cookie = res.headers["set-cookie"]
    assert set_cookie.startswith(f"{COOKIE}=")
    assert "HttpOnly" in set_cookie and "Path=/api/v1/auth" in set_cookie and "SameSite=lax" in set_cookie
    assert f"Max-Age={30 * 24 * 3600}" in set_cookie


# 2. Trùng email / username
async def test_register_duplicate_email_case_insensitive(client, auth_user):
    res = await client.post(f"{API}/auth/register", json={**NEW_USER, "email": "NHAN@WordClash.vn"})
    assert res.status_code == 409
    assert res.json() == {"error": {"code": "EMAIL_TAKEN", "message": "Email này đã được dùng", "details": {"field": "email"}}}


async def test_register_duplicate_username(client, auth_user):
    res = await client.post(f"{API}/auth/register", json={**NEW_USER, "username": "NHAN.WC"})
    assert res.status_code == 409
    assert error_code(res) == "USERNAME_TAKEN"
    assert res.json()["error"]["message"] == "Tên người dùng đã có người chọn"


# 3. Dữ liệu sai quy tắc
@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"username": "ab"}, "username"),
        ({"username": "nhan-wc"}, "username"),
        ({"username": ".nhan"}, "username"),
        ({"password": "ngan"}, "password"),
        ({"password": "MINH.THU"}, "password"),  # trùng username (không phân biệt hoa thường)
        ({"timezone": "Sao/Hoa"}, "timezone"),
        ({"email": "khong-phai-email"}, "email"),
        ({"display_name": "   "}, "display_name"),
    ],
)
async def test_register_validation_error(client, overrides, field):
    res = await client.post(f"{API}/auth/register", json={**NEW_USER, **overrides})
    assert res.status_code == 422
    error = res.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert [d["field"] for d in error["details"]] == [field]
    assert error["details"][0]["message"]


# 4. Đăng nhập
async def test_login_with_email_and_username(client, auth_user):
    for identifier in ("nhan@wordclash.vn", "NHAN@WORDCLASH.VN", "nhan.wc", "Nhan.WC"):
        res = await login(client, identifier)
        assert res.status_code == 200, identifier
        assert res.json()["user"]["id"] == auth_user["user"]["id"]
        assert res.cookies.get(COOKIE)


async def test_login_wrong_password_and_unknown_account_same_error(client, auth_user):
    wrong = await login(client, "nhan.wc", "SaiMatKhau1")
    unknown = await login(client, "ai.do.khong.co", PASSWORD)
    unknown_email = await login(client, "ai@khong.co", PASSWORD)
    assert wrong.status_code == unknown.status_code == unknown_email.status_code == 401
    assert wrong.json() == unknown.json() == unknown_email.json()
    assert error_code(wrong) == "INVALID_CREDENTIALS"
    assert wrong.json()["error"]["message"] == "Thông tin đăng nhập không đúng"


# 5. Tài khoản bị khóa
async def test_disabled_account(client, auth_user, db_session):
    user = await db_session.scalar(select(User).where(User.username == "nhan.wc"))
    user.is_active = False
    await db_session.commit()
    res = await login(client)
    assert res.status_code == 403 and error_code(res) == "ACCOUNT_DISABLED"
    res = await client.get(f"{API}/users/me", headers=auth_user["headers"])
    assert res.status_code == 403 and error_code(res) == "ACCOUNT_DISABLED"
    res = await refresh(client, auth_user["refresh_token"])
    assert error_code(res) == "ACCOUNT_DISABLED"


# 6. /users/me và access token
async def test_me_with_token(client, auth_user):
    res = await client.get(f"{API}/users/me", headers=auth_user["headers"])
    assert res.status_code == 200
    assert res.json() == auth_user["user"]


def _jwt(sub: str, **overrides) -> str:
    now = datetime.now(UTC)
    payload = {"sub": sub, "role": "user", "type": "access", "iat": now, "exp": now + timedelta(minutes=5), **overrides}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


@pytest.mark.parametrize(
    ("make_token", "code"),
    [
        (lambda u: None, "TOKEN_INVALID"),
        (lambda u: _jwt(u, exp=datetime.now(UTC) - timedelta(minutes=1)), "TOKEN_EXPIRED"),
        (lambda u: _jwt(u)[:-3] + "abc", "TOKEN_INVALID"),
        (lambda u: _jwt(u, type="refresh"), "TOKEN_INVALID"),
        (lambda u: _jwt(str(uuid.uuid4())), "TOKEN_INVALID"),  # người dùng không tồn tại
        (lambda u: "rac", "TOKEN_INVALID"),
    ],
    ids=["no-token", "expired", "tampered", "wrong-type", "unknown-user", "garbage"],
)
async def test_me_rejects_bad_tokens(client, auth_user, make_token, code):
    token = make_token(auth_user["user"]["id"])
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    res = await client.get(f"{API}/users/me", headers=headers)
    assert res.status_code == 401
    assert error_code(res) == code
    assert res.headers["www-authenticate"] == "Bearer"


# 7. Refresh xoay vòng và phát hiện dùng lại
async def test_refresh_rotation_and_reuse_detection(client, auth_user, time_travel):
    old = auth_user["refresh_token"]
    res = await refresh(client, old)
    assert res.status_code == 200
    new = res.cookies[COOKIE]
    assert new != old
    assert res.json()["access_token"] != auth_user["access_token"]
    assert res.json()["user"]["id"] == auth_user["user"]["id"]

    time_travel(settings.REFRESH_REUSE_GRACE_SECONDS + 1)  # 31 giây sau
    reused = await refresh(client, old)
    assert reused.status_code == 401 and error_code(reused) == "SESSION_REVOKED"
    # Cả family bị hủy: cookie mới cũng không dùng được nữa
    after = await refresh(client, new)
    assert after.status_code == 401 and error_code(after) == "SESSION_REVOKED"


async def test_two_tabs_refresh_with_same_cookie(client, auth_user):
    """Hai tab cùng gửi một cookie (trong khoảng ân hạn): cả hai đều nhận phiên mới hợp lệ."""
    first = await refresh(client, auth_user["refresh_token"])
    second = await refresh(client, auth_user["refresh_token"])
    assert first.status_code == second.status_code == 200
    assert first.cookies[COOKIE] != second.cookies[COOKIE]
    for res in (first, second):
        me = await client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {res.json()['access_token']}"})
        assert me.status_code == 200
        assert (await refresh(client, res.cookies[COOKIE])).status_code == 200


async def test_refresh_without_or_with_unknown_cookie(client):
    res = await refresh(client, None)
    assert res.status_code == 401 and error_code(res) == "TOKEN_INVALID"
    res = await refresh(client, "khong-ton-tai")
    assert res.status_code == 401 and error_code(res) == "TOKEN_INVALID"


async def test_refresh_uses_client_cookie_jar(client, auth_user):
    client.cookies.set(COOKIE, auth_user["refresh_token"], path="/api/v1/auth")
    res = await client.post(f"{API}/auth/refresh")
    assert res.status_code == 200


# 8. Đăng xuất
async def test_logout_then_refresh_fails(client, auth_user):
    client.cookies.clear()
    res = await client.post(f"{API}/auth/logout", headers={"Cookie": f"{COOKIE}={auth_user['refresh_token']}"})
    assert res.status_code == 204 and res.content == b""
    assert f'{COOKIE}=""' in res.headers["set-cookie"] and "Max-Age=0" in res.headers["set-cookie"]
    res = await refresh(client, auth_user["refresh_token"])
    assert res.status_code == 401 and error_code(res) in ("SESSION_REVOKED", "TOKEN_INVALID")


async def test_logout_with_invalid_or_missing_cookie_still_204(client):
    client.cookies.clear()
    assert (await client.post(f"{API}/auth/logout")).status_code == 204
    assert (await client.post(f"{API}/auth/logout", headers={"Cookie": f"{COOKIE}=rac"})).status_code == 204


async def test_logout_all_revokes_every_session(client, auth_user):
    second = (await login(client)).cookies[COOKIE]
    third = (await login(client)).cookies[COOKIE]
    client.cookies.clear()
    res = await client.post(f"{API}/auth/logout-all", headers=auth_user["headers"])
    assert res.status_code == 204
    for token in (auth_user["refresh_token"], second, third):
        assert (await refresh(client, token)).status_code == 401


async def test_logout_all_requires_login(client):
    res = await client.post(f"{API}/auth/logout-all")
    assert res.status_code == 401 and error_code(res) == "TOKEN_INVALID"


# 9. Đổi mật khẩu
async def test_change_password_wrong_current(client, auth_user):
    res = await client.post(
        f"{API}/auth/change-password",
        headers=auth_user["headers"],
        json={"current_password": "SaiMatKhau1", "new_password": "MatKhauMoi2026"},
    )
    assert res.status_code == 400 and error_code(res) == "WRONG_PASSWORD"


async def test_change_password_weak(client, auth_user):
    res = await client.post(
        f"{API}/auth/change-password",
        headers=auth_user["headers"],
        json={"current_password": PASSWORD, "new_password": "NHAN.WC"},
    )
    assert res.status_code == 422  # quá ngắn → VALIDATION_ERROR
    res = await client.post(
        f"{API}/auth/change-password",
        headers=auth_user["headers"],
        json={"current_password": PASSWORD, "new_password": "NHAN@wordclash.vn"},
    )
    assert res.status_code == 422 and error_code(res) == "WEAK_PASSWORD"


async def test_change_password_keeps_current_session_only(client, auth_user):
    other = (await login(client)).cookies[COOKIE]
    client.cookies.clear()
    res = await client.post(
        f"{API}/auth/change-password",
        headers={**auth_user["headers"], "Cookie": f"{COOKIE}={auth_user['refresh_token']}"},
        json={"current_password": PASSWORD, "new_password": "MatKhauMoi2026"},
    )
    assert res.status_code == 200
    new_access = res.json()["access_token"]
    assert (await client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {new_access}"})).status_code == 200
    # Phiên khác bị hủy, phiên hiện tại vẫn làm mới được
    assert (await refresh(client, other)).status_code == 401
    assert (await refresh(client, auth_user["refresh_token"])).status_code == 200
    # Mật khẩu mới có hiệu lực
    assert (await login(client, password=PASSWORD)).status_code == 401
    assert (await login(client, password="MatKhauMoi2026")).status_code == 200


# 10. Hồ sơ và onboarding
async def test_onboarding(client, auth_user):
    payload = {"goal": "ielts", "daily_minutes": 15, "starter_mascot_id": 2, "start_mode": "placement"}
    res = await client.patch(f"{API}/users/me/onboarding", headers=auth_user["headers"], json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["next_step"] == "placement_test"
    user = body["user"]
    assert (user["goal"], user["daily_minutes"], user["avatar_mascot_id"], user["onboarding_completed"]) == ("ielts", 15, 2, True)
    res = await client.patch(f"{API}/users/me/onboarding", headers=auth_user["headers"], json={**payload, "start_mode": "a1"})
    assert res.json()["next_step"] == "roadmap_a1"


@pytest.mark.parametrize("overrides", [{"daily_minutes": 7}, {"starter_mascot_id": 9}, {"goal": "sat"}, {"start_mode": "b1"}])
async def test_onboarding_invalid_values(client, auth_user, overrides):
    payload = {"goal": "general", "daily_minutes": 10, "starter_mascot_id": 1, "start_mode": "a1", **overrides}
    res = await client.patch(f"{API}/users/me/onboarding", headers=auth_user["headers"], json=payload)
    assert res.status_code == 422 and error_code(res) == "VALIDATION_ERROR"
    assert [d["field"] for d in res.json()["error"]["details"]] == list(overrides)


async def _onboard(client, auth_user, starter: int = 3):
    payload = {"goal": "general", "daily_minutes": 10, "start_mode": "a1", "starter_mascot_id": starter}
    assert (await client.patch(f"{API}/users/me/onboarding", headers=auth_user["headers"], json=payload)).status_code == 200


async def test_update_profile(client, auth_user):
    await _onboard(client, auth_user, 3)  # sở hữu #003 → đặt làm avatar được
    res = await client.patch(f"{API}/users/me", headers=auth_user["headers"], json={"display_name": " Nhân WC ", "avatar_mascot_id": 3})
    assert res.status_code == 200
    assert (res.json()["display_name"], res.json()["avatar_mascot_id"], res.json()["timezone"]) == ("Nhân WC", 3, "Asia/Ho_Chi_Minh")
    for bad in ({"role": "admin"}, {"email": "x@y.vn"}, {"display_name": None}, {"timezone": "Sao/Hoa"}):
        res = await client.patch(f"{API}/users/me", headers=auth_user["headers"], json=bad)
        assert res.status_code == 422, bad
    assert (await client.get(f"{API}/users/me", headers=auth_user["headers"])).json()["role"] == "user"


@pytest.mark.parametrize("mascot_id", [1, 2, 3])
async def test_avatar_requires_real_ownership(client, auth_user, mascot_id):
    """Quy tắc tạm "linh vật 1–3 luôn được" đã bỏ: chỉ linh vật đang sở hữu (vd. khởi đầu chọn ở onboarding)."""
    other = 1 if mascot_id != 1 else 2
    await _onboard(client, auth_user, mascot_id)
    res = await client.patch(f"{API}/users/me", headers=auth_user["headers"], json={"avatar_mascot_id": mascot_id, "arena_mascot_id": mascot_id})
    assert res.status_code == 200 and (res.json()["avatar_mascot_id"], res.json()["arena_mascot_id"]) == (mascot_id, mascot_id)
    for field in ("avatar_mascot_id", "arena_mascot_id"):
        res = await client.patch(f"{API}/users/me", headers=auth_user["headers"], json={field: other})
        error = res.json()["error"]
        assert res.status_code == 403 and (error["code"], error["details"]) == ("MASCOT_NOT_OWNED", {"field": field})


@pytest.mark.parametrize("mascot_id", [4, 37, 100])
async def test_avatar_not_owned(client, auth_user, mascot_id):
    res = await client.patch(f"{API}/users/me", headers=auth_user["headers"], json={"avatar_mascot_id": mascot_id, "display_name": "Đổi"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "MASCOT_NOT_OWNED"
    assert res.json()["error"]["details"] == {"field": "avatar_mascot_id"}
    # Không lưu gì khi bị từ chối
    me = (await client.get(f"{API}/users/me", headers=auth_user["headers"])).json()
    assert me["avatar_mascot_id"] is None and me["display_name"] == "Nhân"


async def test_avatar_can_be_cleared(client, auth_user):
    await _onboard(client, auth_user, 2)
    await client.patch(f"{API}/users/me", headers=auth_user["headers"], json={"avatar_mascot_id": 2})
    res = await client.patch(f"{API}/users/me", headers=auth_user["headers"], json={"avatar_mascot_id": None})
    assert res.status_code == 200 and res.json()["avatar_mascot_id"] is None


# 11. Giới hạn tần suất
async def test_login_rate_limit(client, auth_user):
    for _ in range(settings.LOGIN_MAX_ATTEMPTS):
        assert (await login(client, password="SaiMatKhau1")).status_code == 401
    res = await login(client)  # lần 6, mật khẩu đúng
    assert res.status_code == 429
    assert error_code(res) == "TOO_MANY_ATTEMPTS"
    retry = res.json()["error"]["details"]["retry_after_seconds"]
    assert 0 < retry <= settings.LOGIN_WINDOW_SECONDS
    assert res.headers["retry-after"] == str(retry)


async def test_token_endpoint_shares_rate_limit(client, auth_user):
    for _ in range(settings.LOGIN_MAX_ATTEMPTS):
        res = await client.post(f"{API}/auth/token", data={"username": "nhan.wc", "password": "SaiMatKhau1"})
        assert res.status_code == 401
    res = await client.post(f"{API}/auth/token", data={"username": "nhan.wc", "password": PASSWORD})
    assert res.status_code == 429


async def test_register_rate_limit(client):
    for n in range(settings.REGISTER_MAX_PER_HOUR):
        res = await client.post(f"{API}/auth/register", json={**NEW_USER, "email": f"u{n}@wordclash.vn", "username": f"user{n}"})
        assert res.status_code == 201
    res = await client.post(f"{API}/auth/register", json={**NEW_USER, "email": "u99@wordclash.vn", "username": "user99"})
    assert res.status_code == 429 and error_code(res) == "TOO_MANY_ATTEMPTS"
    assert int(res.headers["retry-after"]) > 0


# 12. Kiểm tra Origin
@pytest.mark.parametrize("path", ["/auth/refresh", "/auth/logout", "/auth/logout-all"])
async def test_foreign_origin_rejected(client, auth_user, path):
    client.cookies.clear()
    headers = {**auth_user["headers"], "Cookie": f"{COOKIE}={auth_user['refresh_token']}", "Origin": "https://evil.example"}
    res = await client.post(f"{API}{path}", headers=headers)
    assert res.status_code == 403 and error_code(res) == "FORBIDDEN_ORIGIN"
    # Phiên không bị ảnh hưởng
    assert (await refresh(client, auth_user["refresh_token"], origin=settings.FRONTEND_URL)).status_code == 200


async def test_frontend_and_same_origin_allowed(client, auth_user):
    res = await refresh(client, auth_user["refresh_token"], origin=settings.FRONTEND_URL)
    assert res.status_code == 200
    res = await refresh(client, res.cookies[COOKIE], origin="http://test")  # chính API (ví dụ /docs)
    assert res.status_code == 200


# Khác
async def test_token_form_for_docs(client, auth_user):
    res = await client.post(f"{API}/auth/token", data={"username": "nhan@wordclash.vn", "password": PASSWORD})
    assert res.status_code == 200
    assert set(res.json()) == {"access_token", "token_type"}
    assert COOKIE not in res.headers.get("set-cookie", "")


async def test_health_and_openapi(client):
    res = await client.get(f"{API}/health")
    assert res.status_code == 200 and res.json()["status"] == "ok"
    paths = (await client.get("/openapi.json")).json()["paths"]
    for path in ("register", "login", "token", "refresh", "logout", "logout-all", "change-password"):
        assert f"{API}/auth/{path}" in paths
    assert {f"{API}/users/me", f"{API}/users/me/onboarding"} <= set(paths)
    assert "409" in paths[f"{API}/auth/register"]["post"]["responses"]
