"""
API phụ cho Đấu Trường (lịch sử trận, tạo mã phòng). Phần đấu thật chạy qua WebSocket trong app/game/.

Mọi route của Đấu Trường cần đã vượt Cửa Ải hôm nay (dependency cấp router).
TODO: chưa có endpoint; sự kiện socket join_queue/create_room cũng phải kiểm tra Cửa Ải khi viết.
"""

from fastapi import APIRouter

from app.api.deps import DailyCheckDone

router = APIRouter(prefix="/arena", tags=["Đấu Trường"], dependencies=[DailyCheckDone])
