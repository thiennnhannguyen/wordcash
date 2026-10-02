"""
Bảng users: tài khoản, mật khẩu (băm), hồ sơ, lựa chọn onboarding, vai trò.
Email và username luôn lưu chữ thường (duy nhất). Múi giờ dùng để tính "ngày" cho Cửa Ải Hôm Nay và streak.

TODO:
- `avatar_mascot_id` thêm khóa ngoại tới bảng mascots khi model Mascot được viết.
- streak, số lượt quay còn lại: thêm khi làm Cửa Ải và vòng quay.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func, true
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.core.config import settings
from app.core.database import Base


class Goal(enum.StrEnum):
    GENERAL = "general"
    IELTS = "ielts"
    TOEIC = "toeic"


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


def _enum(cls: type[enum.StrEnum], name: str) -> Enum:
    # Lưu dạng VARCHAR + CHECK (không dùng ENUM riêng của PostgreSQL) để migration lùi/tiến không vướng kiểu dữ liệu
    return Enum(cls, name=name, native_enum=False, create_constraint=True, length=16, values_callable=lambda e: [m.value for m in e])


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255))
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(64), default=lambda: settings.DEFAULT_TIMEZONE)
    avatar_mascot_id: Mapped[int | None] = mapped_column(Integer)  # TODO: FK mascots.id
    goal: Mapped[Goal | None] = mapped_column(_enum(Goal, "user_goal"))
    daily_minutes: Mapped[int | None] = mapped_column(Integer)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    role: Mapped[Role] = mapped_column(_enum(Role, "user_role"), default=Role.USER, server_default=Role.USER.value)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @validates("email", "username")
    def _lowercase(self, _key: str, value: str) -> str:
        return value.strip().lower()
