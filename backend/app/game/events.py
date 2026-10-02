"""
Đăng ký các sự kiện Socket.IO (xem docs/socket-events.md) và chuyển tới xử lý tương ứng.

- connect: xác thực JWT gửi qua `auth` của client (`io(url, { auth: { token } })`); token sai thì từ chối kết nối.
  id người dùng lưu trong session của socket, các sự kiện sau đọc lại từ đó, không tin dữ liệu client gửi.
- Client → server: join_queue, leave_queue, create_room, join_room, submit_answer.
- Server → client: match_found, round_start, round_result, match_end.
Server là trọng tài: thời gian đo ở server (game/timing.py, time.monotonic), `round_start` không kèm đáp án;
đáp án đúng chỉ có trong `round_result` sau khi lượt chốt. Trạng thái trận lưu trong Redis, chỉ ghi PostgreSQL khi trận kết thúc.

TODO: nối các sự kiện client → server với matchmaking.py và match_room.py; hiện chúng chỉ trả ack báo chưa hỗ trợ.
"""

import logging

from socketio.exceptions import ConnectionRefusedError

from app.core.security import InvalidTokenError, decode_access_token
from app.game.server import sio

logger = logging.getLogger(__name__)

CLIENT_EVENTS = ("join_queue", "leave_queue", "create_room", "join_room", "submit_answer")
SERVER_EVENTS = ("match_found", "round_start", "round_result", "match_end")

NOT_READY = {"success": False, "message": "Tính năng đang phát triển."}


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None):
    token = (auth or {}).get("token") if isinstance(auth, dict) else None
    if not token:
        raise ConnectionRefusedError("Thiếu token đăng nhập.")
    try:
        user_id = decode_access_token(token)
    except InvalidTokenError as exc:
        raise ConnectionRefusedError("Token không hợp lệ hoặc đã hết hạn.") from exc
    await sio.save_session(sid, {"user_id": user_id})
    await sio.enter_room(sid, f"user:{user_id}")
    logger.info("Socket %s kết nối (user %s)", sid, user_id)


@sio.event
async def disconnect(sid: str, *args):
    # TODO: xử lý rớt mạng giữa trận (match_room.py)
    logger.info("Socket %s ngắt kết nối", sid)


def _not_ready(event: str):
    async def handler(sid: str, data=None):
        return NOT_READY

    handler.__name__ = event
    return handler


for _event in CLIENT_EVENTS:
    sio.on(_event, _not_ready(_event))
