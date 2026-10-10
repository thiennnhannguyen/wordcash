"""
Báo lỗi nội dung từ người học (nút "Báo lỗi" ở thẻ học và tấm phản hồi sau mỗi câu; chỉ mục từ HỆ THỐNG).

- Mỗi dòng ghi: loại lỗi, ghi chú, `content_key` + `content_version` của mục lúc báo, ngữ cảnh (thẻ học / câu hỏi), nguồn
  (học bài, kiểm tra, ôn, Cửa Ải, khóa học…) và `snapshot` NỘI DUNG ĐÚNG NHƯ NGƯỜI HỌC ĐÃ THẤY (câu hỏi: đề + các lựa chọn +
  đáp án đúng, lấy từ bản server đã lưu của phiên, không tin client; thẻ học: các trường của thẻ) để tái hiện lỗi.
  KHÔNG lưu đáp án người học đã chọn.
- `fields`: các trường nội dung cần xem (vd. "Đáp án gây nhầm" → cloze_en, cloze_distractors).
- Cùng người + cùng mục + cùng loại chỉ một dòng mỗi ngày địa phương (unique); trạng thái open → resolved / dismissed.
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum


class ReportKind(enum.StrEnum):
    CONFUSING_ANSWER = "confusing_answer"  # Đáp án gây nhầm (có hơn một đáp án đúng / đáp án nhiễu cũng đúng)
    WRONG_MEANING = "wrong_meaning"  # Nghĩa sai
    WRONG_EXAMPLE = "wrong_example"  # Câu ví dụ sai
    WRONG_AUDIO = "wrong_audio"  # Phát âm sai
    OTHER = "other"


class ReportContext(enum.StrEnum):
    CARD = "card"
    QUESTION = "question"


class ReportStatus(enum.StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ContentReport(Base):
    __tablename__ = "content_reports"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        UniqueConstraint("user_id", "entry_id", "kind", "local_day"),
        Index("ix_content_reports_user_day", "user_id", "local_day"),
        Index("ix_content_reports_entry_status", "entry_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"))
    content_key: Mapped[str | None] = mapped_column(String(160))
    content_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    kind: Mapped[ReportKind] = mapped_column(str_enum(ReportKind, "report_kind"))
    note: Mapped[str | None] = mapped_column(String(500))
    context: Mapped[ReportContext] = mapped_column(str_enum(ReportContext, "report_context"))
    source: Mapped[str] = mapped_column(String(32))  # unit_learn, unit_test, review, daily_check, course, card…
    snapshot: Mapped[dict] = mapped_column(JSONB)
    fields: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    status: Mapped[ReportStatus] = mapped_column(str_enum(ReportStatus, "report_status"), default=ReportStatus.OPEN,
                                                 server_default=ReportStatus.OPEN.value)
    local_day: Mapped[date] = mapped_column(Date)  # ngày theo múi giờ người báo (giới hạn / chống trùng mỗi ngày)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
