"""
Hồ sơ người dùng hiện tại: xem, sửa (tên hiển thị, múi giờ, avatar, linh vật Đấu Trường, tủ trưng bày, hiện trên bảng xếp hạng),
hoàn tất onboarding (cấp linh vật khởi đầu). Hồ sơ công khai của người khác: GET /users/{username}/profile (chỉ phần công khai).
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.core import clock
from app.schemas.social import PublicProfileOut
from app.schemas.user import OnboardingIn, OnboardingOut, UserOut, UserUpdateIn
from app.services import auth_service, profile_service

router = APIRouter(prefix="/users", tags=["Người dùng"])

AUTH_ERRORS = ("TOKEN_INVALID", "TOKEN_EXPIRED", "ACCOUNT_DISABLED")


@router.get("/me", response_model=UserOut, summary="Thông tin tài khoản hiện tại", responses=error_responses(*AUTH_ERRORS))
async def me(user: CurrentUser):
    return user


@router.patch(
    "/me",
    response_model=UserOut,
    summary="Sửa hồ sơ",
    description="Chỉ cập nhật các trường được gửi lên: display_name, timezone, avatar_mascot_id, arena_mascot_id, "
    "showcase_mascot_ids (tối đa 3, null = mặc định 3 con hiếm nhất), show_on_leaderboard. Avatar, linh vật Đấu Trường và tủ "
    "trưng bày chỉ được là linh vật đang sở hữu (MASCOT_NOT_OWNED); null = bỏ avatar / Đấu Trường dùng avatar.",
    responses=error_responses(*AUTH_ERRORS, "VALIDATION_ERROR", "MASCOT_NOT_OWNED"),
)
async def update_me(data: UserUpdateIn, user: CurrentUser, session: DbSession):
    return await auth_service.update_profile(session, user, data)


@router.patch(
    "/me/onboarding",
    response_model=OnboardingOut,
    summary="Hoàn tất onboarding",
    description="Lưu mục tiêu, thời lượng mỗi ngày, linh vật khởi đầu; trả bước tiếp theo (roadmap_a1 hoặc placement_test).",
    responses=error_responses(*AUTH_ERRORS, "VALIDATION_ERROR"),
)
async def onboarding(data: OnboardingIn, user: CurrentUser, session: DbSession):
    user, next_step = await auth_service.complete_onboarding(session, user, data)
    return OnboardingOut(user=UserOut.model_validate(user), next_step=next_step)


@router.get("/{username}/profile", response_model=PublicProfileOut, summary="Hồ sơ công khai của một người chơi",
            description="Chỉ phần công khai: không có email, khóa học, từ hay quên, lịch hoạt động.",
            responses=error_responses(*AUTH_ERRORS, "USER_NOT_FOUND"))
async def public_profile(username: str, _user: CurrentUser, session: DbSession):
    return await profile_service.get_public_profile(session, username, clock.now())
