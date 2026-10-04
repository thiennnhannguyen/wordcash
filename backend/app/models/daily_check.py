"""
Lịch sử Cửa Ải Hôm Nay: ngày, các từ được hỏi, kết quả.

Mỗi người một dòng mỗi ngày địa phương (unique user_id + local_date). `questions` lưu bộ câu hỏi KÈM ĐÁP ÁN chỉ ở server
(như StudySession.questions); client chỉ nhận phần đề. `answers`: {question_id: {answer, correct}}.
Trạng thái: pending (chưa làm xong) · passed (đúng hết) · partial (có câu sai) · exempt (được miễn: dưới 2 từ hệ thống đã học).
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum


class DailyCheckStatus(enum.StrEnum):
    PENDING = "pending"
    PASSED = "passed"
    PARTIAL = "partial"
    EXEMPT = "exempt"


class DailyCheck(Base):
    __tablename__ = "daily_checks"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (UniqueConstraint("user_id", "local_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    local_date: Mapped[date] = mapped_column(Date)
    status: Mapped[DailyCheckStatus] = mapped_column(str_enum(DailyCheckStatus, "daily_check_status"))
    questions: Mapped[list[dict]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    answers: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"))
    # Kết quả đã tính khi xong (streak mới, số từ bị trừ, lượt quay…), trả lại nguyên văn khi nộp lại
    result: Mapped[dict | None] = mapped_column(JSONB)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
