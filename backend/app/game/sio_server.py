"""
Máy chủ Socket.IO bất đồng bộ (python-socketio, ASGI), gắn cùng FastAPI ở app/main.py.

- Khi bật SIO_USE_REDIS, nhiều tiến trình đồng bộ sự kiện qua Redis (AsyncRedisManager).
- connect: client gửi access token qua `auth` (`io(url, { auth: { token } })`). Token thiếu/sai/hết hạn thì từ chối kết nối;
  client nhận `connect_error` với `message` = TOKEN_INVALID | TOKEN_EXPIRED và `data` = {code, message}. Hết hạn thì client làm mới token rồi nối lại.
- Thành công: session của socket lưu {user_id, role}; socket vào room "user:{user_id}" để server gửi riêng cho người đó.
  Các sự kiện sau đọc user_id từ session, không tin dữ liệu client gửi.
- "whoami" trả user_id (để kiểm thử).
Logic trận đấu nằm ở game/events.py (chưa làm).
"""

import logging

import socketio
from socketio.exceptions import ConnectionRefusedError

from app.core.config import settings
from app.core.errors import AuthError
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[settings.FRONTEND_URL],
    client_manager=socketio.AsyncRedisManager(settings.REDIS_URL) if settings.SIO_USE_REDIS else None,
)


def _refused(code: str, message: str) -> ConnectionRefusedError:
    # Client JS nhận connect_error với err.message = mã lỗi, err.data = {code, message}
    return ConnectionRefusedError(code, {"code": code, "message": message})


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None):
    token = auth.get("token") if isinstance(auth, dict) else None
    if not token:
        raise _refused("TOKEN_INVALID", "Bạn cần đăng nhập.")
    try:
        claims = decode_access_token(token)
    except AuthError as exc:
        raise _refused(exc.code, exc.message) from None
    user_id = str(claims["sub"])
    await sio.save_session(sid, {"user_id": user_id, "role": claims.get("role")})
    await sio.enter_room(sid, f"user:{user_id}")
    logger.info("Socket %s kết nối (user %s)", sid, user_id)


@sio.event
async def disconnect(sid: str, *args):
    # TODO: xử lý rớt mạng giữa trận (match_room.py)
    logger.info("Socket %s ngắt kết nối", sid)


@sio.event
async def whoami(sid: str, data=None):
    session = await sio.get_session(sid)
    return {"user_id": session["user_id"]}
