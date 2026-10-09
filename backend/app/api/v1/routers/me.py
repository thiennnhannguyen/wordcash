"""
Hồ sơ của tôi: GET /me/profile (phần công khai + tiến độ từng cấp, lịch hoạt động 12 tuần, tỉ lệ đúng Cửa Ải 30 ngày, từ hay quên
nhất, số khóa học…). Nghiệp vụ: services/profile_service.py.

Số liệu của người dùng hiện tại cho Sảnh: GET /me/stats (số từ đã thuộc, rank + lung lay, streak + lịch tuần, lượt quay,
mục tiêu hôm nay, Cửa Ải hôm nay, vị trí học, Hộ chiếu). Không bị chặn bởi Cửa Ải. Nghiệp vụ: services/me_service.py.
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.core import clock
from app.schemas.academy import MeStatsOut
from app.schemas.social import MyProfileOut
from app.services import me_service, profile_service

router = APIRouter(prefix="/me", tags=["Người dùng"])


@router.get("/stats", response_model=MeStatsOut, summary="Số liệu Sảnh của tôi",
            responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED"))
async def stats(user: CurrentUser, session: DbSession):
    return await me_service.get_stats(session, user, clock.now())


@router.get("/profile", response_model=MyProfileOut, summary="Hồ sơ của tôi",
            responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED"))
async def my_profile(user: CurrentUser, session: DbSession):
    return await profile_service.get_my_profile(session, user, clock.now())
