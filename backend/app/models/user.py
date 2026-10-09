"""
Bảng users: tài khoản, mật khẩu (băm), hồ sơ, lựa chọn onboarding, vai trò.
Email và username luôn lưu chữ thường (duy nhất). Múi giờ dùng để tính "ngày" cho Cửa Ải Hôm Nay và streak.

Avatar (`avatar_mascot_id`) và linh vật dùng ở Đấu Trường (`arena_mascot_id`, null = dùng avatar) chỉ được là linh vật
đang sở hữu (user_mascots); kiểm tra ở services/collection_service.py. Streak, lượt quay, mảnh nằm ở user_stats.
Tủ trưng bày hồ sơ (`showcase_mascot_ids`) và cài đặt hiện trên bảng xếp hạng (`show_on_leaderboard`).
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func, true
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.core.config import settings
from app.core.database import Base, str_enum


class Goal(enum.StrEnum):
    GENERAL = "general"
    IELTS = "ielts"
    TOEIC = "toeic"


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    # Đọc lại giá trị do DB sinh (created_at, updated_at) ngay bằng RETURNING, tránh lazy load trong async
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255))
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(64), default=lambda: settings.DEFAULT_TIMEZONE)
    avatar_mascot_id: Mapped[int | None] = mapped_column(ForeignKey("mascots.id"))
    arena_mascot_id: Mapped[int | None] = mapped_column(ForeignKey("mascots.id"))
    # Tủ trưng bày ở hồ sơ: tối đa 3 id linh vật đang sở hữu; NULL = mặc định 3 con hiếm nhất (services/profile_service.py)
    showcase_mascot_ids: Mapped[list[int] | None] = mapped_column(JSONB)
    # Tắt thì không xuất hiện trong bảng xếp hạng (vẫn thấy hạng của mình)
    show_on_leaderboard: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    goal: Mapped[Goal | None] = mapped_column(str_enum(Goal, "user_goal"))
    daily_minutes: Mapped[int | None] = mapped_column(Integer)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    role: Mapped[Role] = mapped_column(str_enum(Role, "user_role"), default=Role.USER, server_default=Role.USER.value)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Số từ đã thuộc (bộ đếm cache, cập nhật khi trạng thái từ đổi qua lại `mastered`):
    # mastered_count chỉ đếm từ HỆ THỐNG, dùng cho rank và lượt quay; custom_mastered_count đếm riêng từ tự tạo.
    mastered_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    custom_mastered_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @validates("email", "username")
    def _lowercase(self, _key: str, value: str) -> str:
        return value.strip().lower()
