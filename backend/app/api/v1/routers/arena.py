"""
API phụ cho Đấu Trường (lịch sử trận, tạo mã phòng). Phần đấu thật chạy qua WebSocket trong app/game/.

TODO: chưa có endpoint.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/arena", tags=["Đấu Trường"])
