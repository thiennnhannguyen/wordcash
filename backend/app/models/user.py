"""
Bảng users: tài khoản, mật khẩu (băm), avatar linh vật, streak, số lượt quay còn lại.
Múi giờ người dùng dùng để tính "ngày" cho Cửa Ải Hôm Nay và streak.

TODO: `avatar_mascot_id` thêm khóa ngoại tới bảng mascots khi model Mascot được viết.
"""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(40))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Ho_Chi_Minh")
    avatar_mascot_id: Mapped[int | None] = mapped_column(Integer)
    current_streak: Mapped[int] = mapped_column(default=0, server_default="0")
    best_streak: Mapped[int] = mapped_column(default=0, server_default="0")
    spins_normal: Mapped[int] = mapped_column(default=0, server_default="0")
    spins_special: Mapped[int] = mapped_column(default=0, server_default="0")
