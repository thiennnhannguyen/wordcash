"""
Bảng xếp hạng: GET /leaderboard?board=weekly|alltime&limit=50.
weekly = số từ hệ thống mới đạt "đã thuộc" trong tuần ISO hiện tại (giờ Việt Nam, từ thứ Hai 00:00); alltime = mastered_count.
Từ tự tạo không tính. Kèm `my_entry` (hạng, điểm của tôi, kể cả khi ngoài top hoặc đã tắt hiện trên bảng).
Danh sách top cache 60 giây. Nghiệp vụ: services/leaderboard_service.py.
"""

from typing import Literal

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, RedisClient
from app.api.responses import error_responses
from app.core import clock
from app.core.config import settings
from app.schemas.social import LeaderboardOut
from app.services import leaderboard_service

router = APIRouter(prefix="/leaderboard", tags=["Bảng xếp hạng"])


@router.get("", response_model=LeaderboardOut, summary="Bảng xếp hạng",
            description="`seconds_left`: số giây tới hết tuần (chỉ bảng weekly), client đếm ngược từ số này.",
            responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED", "VALIDATION_ERROR"))
async def leaderboard(user: CurrentUser, session: DbSession, redis: RedisClient,
                      board: Literal["weekly", "alltime"] = "weekly",
                      limit: int = Query(50, ge=1, le=settings.LEADERBOARD_MAX_LIMIT)):
    return await leaderboard_service.get_leaderboard(session, redis, user, board, limit, clock.now())
