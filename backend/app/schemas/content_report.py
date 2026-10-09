"""Schema Báo lỗi nội dung: người học gửi (POST /content-reports), quản trị xem / đổi trạng thái (/admin/content-reports)."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.config import settings
from app.models import ReportKind, ReportStatus

CardSource = Literal["unit_learn", "course", "review", "other"]


class ReportQuestionRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["study", "daily_check"]  # phiên học (Học Viện, ôn, khóa học…) hoặc Cửa Ải Hôm Nay
    session_id: uuid.UUID | None = None  # bắt buộc khi kind = study
    question_id: str = Field(min_length=1, max_length=16)

    @model_validator(mode="after")
    def _session(self):
        if self.kind == "study" and self.session_id is None:
            raise ValueError("Câu hỏi trong phiên học cần session_id")
        return self


class ContentReportIn(BaseModel):
    """Đúng MỘT trong hai: `question` (báo lỗi một câu hỏi vừa làm) hoặc `entry_id` (báo lỗi thẻ học)."""

    model_config = ConfigDict(extra="forbid")

    kind: ReportKind
    note: str = Field(default="", max_length=settings.CONTENT_REPORT_NOTE_MAX)
    question: ReportQuestionRef | None = None
    entry_id: int | None = None
    source: CardSource = "other"  # chỉ dùng cho thẻ học (câu hỏi lấy nguồn từ phiên ở server)

    @model_validator(mode="after")
    def _one_target(self):
        if (self.question is None) == (self.entry_id is None):
            raise ValueError("Gửi đúng một trong hai: question hoặc entry_id")
        return self


class ContentReportCreatedOut(BaseModel):
    created: bool  # false: hôm nay đã báo cùng mục + cùng loại (không tạo dòng mới)


class ReportOut(BaseModel):
    id: uuid.UUID
    kind: ReportKind
    note: str | None
    context: str
    source: str
    content_version: int
    snapshot: dict
    status: ReportStatus
    created_at: datetime
    resolved_at: datetime | None


class ReportGroupOut(BaseModel):
    entry_id: int
    content_key: str | None
    headword: str
    cefr: str | None
    current_version: int  # phiên bản hiện tại của mục (lớn hơn lúc báo → đã sửa sau báo cáo)
    fields: list[str]  # các trường cần xem (gộp mọi báo cáo)
    count: int
    kinds: dict[str, int]
    last_at: datetime
    reports: list[ReportOut]


class ReportListOut(BaseModel):
    status: Literal["open", "resolved", "dismissed", "all"]
    groups: list[ReportGroupOut]


class ReportStatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ReportStatus


class ReportStatusOut(BaseModel):
    updated: int
