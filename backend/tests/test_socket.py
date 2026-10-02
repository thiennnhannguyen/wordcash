"""
Kiểm thử kết nối Socket.IO: xác thực JWT trong sự kiện connect.
"""

import pytest
import socketio

from tests.conftest import make_token


async def test_connect_with_valid_token(live_server):
    client = socketio.AsyncClient()
    await client.connect(live_server, auth={"token": make_token(1)}, transports=["websocket"])
    assert client.connected
    # Sự kiện giữ nguyên tên; chưa có logic thì trả ack báo chưa hỗ trợ
    ack = await client.call("join_queue", {}, timeout=5)
    assert ack == {"success": False, "message": "Tính năng đang phát triển."}
    await client.disconnect()


@pytest.mark.parametrize("auth", [None, {"token": "rac"}])
async def test_connect_rejected_without_valid_token(live_server, auth):
    client = socketio.AsyncClient()
    with pytest.raises(socketio.exceptions.ConnectionError):
        await client.connect(live_server, auth=auth, transports=["websocket"], wait_timeout=5)
    assert not client.connected
