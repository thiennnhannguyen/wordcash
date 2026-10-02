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


from app.game.server import sio

logger = logging.getLogger(__name__)

CLIENT_EVENTS = ("join_queue", "leave_queue", "create_room", "join_room", "submit_answer")
SERVER_EVENTS = ("match_found", "round_start", "round_result", "match_end")

NOT_READY = {"success": False, "message": "Tính năng đang phát triển."}


def _not_ready(event: str):
    async def handler(sid: str, data=None):
        return NOT_READY

    handler.__name__ = event
    return handler


for _event in CLIENT_EVENTS:
    sio.on(_event, _not_ready(_event))
