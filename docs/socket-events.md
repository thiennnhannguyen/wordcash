# socket-events.md

Đặc tả các sự kiện WebSocket trong trận đấu.

TODO:
- join_queue, leave_queue, create_room, join_room
- match_found, round_start, submit_answer, round_result, match_end

Kết nối: client gửi access token qua `auth` (`io(url, { auth: { token } })`); server kiểm tra trong sự kiện `connect` (`backend/app/game/sio_server.py`). Token thiếu, sai hoặc hết hạn thì từ chối: `connect_error` có `err.message` = `TOKEN_INVALID` | `TOKEN_EXPIRED`, `err.data` = `{code, message}`. Kết nối được thì socket vào room `user:{id}`; sự kiện `whoami` trả `{user_id}` (để kiểm thử). Xem thêm `docs/auth.md`.
Máy chủ: python-socketio `AsyncServer` (ASGI) gắn cùng FastAPI ở `backend/app/main.py`; bật `SIO_USE_REDIS` để đồng bộ nhiều tiến trình qua Redis (`AsyncRedisManager`).
