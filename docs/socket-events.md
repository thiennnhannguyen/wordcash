# socket-events.md

Đặc tả các sự kiện WebSocket trong trận đấu.

TODO:
- join_queue, leave_queue, create_room, join_room
- match_found, round_start, submit_answer, round_result, match_end

Kết nối: client gửi JWT qua `auth` (`io(url, { auth: { token } })`); server kiểm tra trong sự kiện `connect`, token thiếu hoặc sai thì từ chối kết nối.
Máy chủ: python-socketio `AsyncServer` (ASGI) gắn cùng FastAPI ở `backend/app/main.py`, đồng bộ nhiều tiến trình qua Redis (`AsyncRedisManager`).
