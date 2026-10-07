"""
Tiến độ học từng mục từ: UserEntryProgress (trạng thái từ, lịch ôn SRS, số ngày đúng ở mức 3+).

UserEntryProgress dùng chung cho từ hệ thống và từ tự tạo, khóa (user_id, entry_id): một từ hệ thống học ở Học Viện
hay trong "Khóa học của tôi" đều chung một dòng tiến độ. Chưa có dòng nào nghĩa là từ ở trạng thái `new`.
ReviewLog: nhật ký từng câu trả lời (độ chính xác 7 ngày, từ sai nhiều nhất).

Tiến độ bài / chặng / cấp của Học Viện: models/academy.py.
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum


class EntryState(enum.StrEnum):
    NEW = "new"
    LEARNING = "learning"
    MASTERED = "mastered"
    FORGOTTEN = "forgotten"


class UserEntryProgress(Base):
    __tablename__ = "user_entry_progress"
    __table_args__ = (
        Index("ix_user_entry_progress_user_due", "user_id", "due_at"),
        # Bảng xếp hạng tuần: từ mới đạt "đã thuộc" trong tuần
        Index("ix_user_entry_progress_status_mastered_at", "status", "mastered_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"), primary_key=True, index=True)
    status: Mapped[EntryState] = mapped_column(str_enum(EntryState, "entry_state"), default=EntryState.NEW, server_default=EntryState.NEW.value)
    # SRS (SM-2): hệ số dễ, khoảng ôn hiện tại (ngày), số lần nhớ liên tiếp, thời điểm đến hạn
    ease: Mapped[float] = mapped_column(Float, default=2.5, server_default="2.5")
    interval_days: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    repetitions: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Số lần quên (trả lời sai): mỗi lần sai lịch ôn đặt lại về khoảng ngắn nhất
    lapse_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # "Đã thuộc": số ngày khác nhau (theo múi giờ người học) trả lời đúng ở mức ≥ 3
    strong_days: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    last_strong_day: Mapped[date | None] = mapped_column(Date)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    first_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Ngày (theo múi giờ người học) lần đầu học từ này: dùng cho giới hạn số từ mới mỗi ngày
    first_seen_day: Mapped[date | None] = mapped_column(Date)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    mastered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReviewLog(Base):
    __tablename__ = "review_logs"
    __table_args__ = (Index("ix_review_logs_user_answered", "user_id", "answered_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"), index=True)
    level: Mapped[int] = mapped_column(SmallInteger)
    correct: Mapped[bool] = mapped_column(Boolean)
    source: Mapped[str] = mapped_column(String(16))  # course | academy | daily_check | arena
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
