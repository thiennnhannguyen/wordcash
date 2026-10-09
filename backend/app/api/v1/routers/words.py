"""
Từ của ngày: GET /words/daily (một mục từ hệ thống dạy được thuộc cấp đã mở, cùng ngày cùng cấp thì cùng từ) kèm trạng thái của
người dùng với từ đó. Không bị chặn bởi Cửa Ải (chỉ đọc). Nghiệp vụ: services/word_of_day.py.
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.core import clock
from app.schemas.social import DailyWordOut
from app.services import word_of_day

router = APIRouter(prefix="/words", tags=["Từ vựng"])


@router.get("/daily", response_model=DailyWordOut, summary="Từ của ngày",
            description="`entry = null` khi chưa có mục từ nào ở các cấp đã mở. `status`: new | learning | mastered.",
            responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED"))
async def daily(user: CurrentUser, session: DbSession):
    return await word_of_day.get_daily(session, user, clock.now())
