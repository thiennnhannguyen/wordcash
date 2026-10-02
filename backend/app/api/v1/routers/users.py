"""
Hồ sơ người dùng hiện tại: xem, sửa (tên hiển thị, múi giờ, avatar), hoàn tất onboarding.
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.schemas.user import OnboardingIn, OnboardingOut, UserOut, UserUpdateIn
from app.services import auth_service

router = APIRouter(prefix="/users", tags=["Người dùng"])

AUTH_ERRORS = ("TOKEN_INVALID", "TOKEN_EXPIRED", "ACCOUNT_DISABLED")


@router.get("/me", response_model=UserOut, summary="Thông tin tài khoản hiện tại", responses=error_responses(*AUTH_ERRORS))
async def me(user: CurrentUser):
    return user


@router.patch(
    "/me",
    response_model=UserOut,
    summary="Sửa hồ sơ",
    description="Chỉ cập nhật các trường được gửi lên: display_name, timezone, avatar_mascot_id.",
    responses=error_responses(*AUTH_ERRORS, "VALIDATION_ERROR"),
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
