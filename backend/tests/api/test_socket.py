"""
Kiểm thử xác thực Socket.IO bằng access token (auth.token) trên server uvicorn chạy trong test.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
import socketio

from app.core.config import settings
from app.core.security import create_access_token


async def _connect(url: str, auth) -> socketio.AsyncClient:
    client = socketio.AsyncClient(reconnection=False)
    await client.connect(url, auth=auth, transports=["websocket"], wait_timeout=5)
    return client


async def test_connect_with_valid_token_and_whoami(live_server):
    user_id = uuid.uuid4()
    token, _ = create_access_token(user_id, "user")
    client = await _connect(live_server, {"token": token})
    try:
        assert client.connected
        assert await client.call("whoami", timeout=5) == {"user_id": str(user_id)}
        # Sự kiện trận đấu giữ nguyên tên, chưa có logic
        assert (await client.call("join_queue", {}, timeout=5))["success"] is False
    finally:
        await client.disconnect()


def _expired_token() -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(uuid.uuid4()), "role": "user", "type": "access", "iat": now - timedelta(hours=1), "exp": now - timedelta(minutes=5)}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


@pytest.mark.parametrize(
    ("auth", "code"),
    [(None, "TOKEN_INVALID"), ({}, "TOKEN_INVALID"), ({"token": "rac"}, "TOKEN_INVALID"), ("expired", "TOKEN_EXPIRED")],
)
async def test_connect_rejected(live_server, auth, code):
    if auth == "expired":
        auth = {"token": _expired_token()}
    client = socketio.AsyncClient(reconnection=False)
    errors = []
    client.on("connect_error", lambda data: errors.append(data))
    with pytest.raises(socketio.exceptions.ConnectionError):
        await client.connect(live_server, auth=auth, transports=["websocket"], wait_timeout=5)
    assert not client.connected
    assert errors and errors[0]["message"] == code
    assert errors[0]["data"]["code"] == code and errors[0]["data"]["message"]
