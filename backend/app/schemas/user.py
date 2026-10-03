"""
Schema hồ sơ người dùng: dữ liệu trả về (UserOut), sửa hồ sơ, onboarding.
UserOut không bao giờ chứa password_hash; nhận thẳng đối tượng User (router trả model ORM cũng được).
"""

import uuid
from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import Goal, Role, User


def check_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError("Múi giờ không hợp lệ") from exc
    return value


def clean_display_name(value):
    return value.strip() if isinstance(value, str) else value


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    display_name: str
    timezone: str
    avatar_mascot_id: int | None
    goal: Goal | None
    daily_minutes: int | None
    onboarding_completed: bool
    email_verified: bool
    role: Role
    # Số từ đã thuộc: mastered_count chỉ tính từ hệ thống (rank, lượt quay); custom_mastered_count là từ tự tạo
    mastered_count: int = 0
    custom_mastered_count: int = 0
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def _from_user(cls, data):
        if isinstance(data, User):
            return {
                "id": data.id,
                "email": data.email,
                "username": data.username,
                "display_name": data.display_name,
                "timezone": data.timezone,
                "avatar_mascot_id": data.avatar_mascot_id,
                "goal": data.goal,
                "daily_minutes": data.daily_minutes,
                "onboarding_completed": data.onboarding_completed_at is not None,
                "email_verified": data.email_verified_at is not None,
                "role": data.role,
                "mastered_count": data.mastered_count or 0,
                "custom_mastered_count": data.custom_mastered_count or 0,
                "created_at": data.created_at,
            }
        return data


class UserUpdateIn(BaseModel):
    """Mọi trường tùy chọn; chỉ trường được gửi lên mới được cập nhật. Trường lạ (role, email…) bị từ chối."""

    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=30)
    timezone: str | None = None
    # Quyền sở hữu kiểm tra ở service (MASCOT_NOT_OWNED); null = bỏ ảnh đại diện
    avatar_mascot_id: int | None = Field(default=None, ge=1, le=100)

    _strip = field_validator("display_name", mode="before")(clean_display_name)

    @field_validator("display_name", "timezone")
    @classmethod
    def _not_null(cls, value: str | None) -> str:
        # Chỉ chạy khi trường được gửi lên: gửi null cho tên hoặc múi giờ là không hợp lệ
        if value is None:
            raise ValueError("Không được để trống")
        return value

    @field_validator("timezone")
    @classmethod
    def _timezone(cls, value: str) -> str:
        return check_timezone(value)


class OnboardingIn(BaseModel):
    goal: Goal
    daily_minutes: Literal[5, 10, 15, 20]
    starter_mascot_id: Literal[1, 2, 3]
    start_mode: Literal["a1", "placement"]


class OnboardingOut(BaseModel):
    user: UserOut
    next_step: Literal["roadmap_a1", "placement_test"]
