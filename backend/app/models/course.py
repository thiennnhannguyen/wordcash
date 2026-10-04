"""
"Khóa học của tôi": bộ từ vựng người dùng tự tạo (UserCourse), các mục từ trong bộ (UserCourseEntry) và phiên học (StudySession).

- UserCourseEntry chỉ LIÊN KẾT tới mục từ (từ hệ thống hoặc từ tự tạo), không sao chép nội dung. Xóa khỏi khóa học không xóa mục từ.
- `word_count` là bộ đếm cache, service cập nhật mỗi khi thêm/bớt từ.
- Khóa học hiện luôn riêng tư; `visibility = shared` để sẵn cho tính năng chia sẻ sau này.
- StudySession giữ bộ câu hỏi KÈM ĐÁP ÁN ở server (`questions`), client chỉ nhận phần đề; `answers` ghi câu đã nộp.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum


class CourseVisibility(enum.StrEnum):
    PRIVATE = "private"
    SHARED = "shared"


class StudyMode(enum.StrEnum):
    LEARN = "learn"
    REVIEW = "review"
    QUICK = "quick"
    HARD = "hard"
    TEST = "test"


class UserCourse(Base):
    __tablename__ = "user_courses"
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(String(300))
    icon: Mapped[str] = mapped_column(String(32))  # tên icon Phosphor (kebab-case), danh sách hợp lệ ở schemas/course.py
    color: Mapped[str] = mapped_column(String(16))  # token màu: primary, sky, accent…
    visibility: Mapped[CourseVisibility] = mapped_column(
        str_enum(CourseVisibility, "course_visibility"), default=CourseVisibility.PRIVATE, server_default=CourseVisibility.PRIVATE.value
    )
    word_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserCourseEntry(Base):
    __tablename__ = "user_course_entries"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (UniqueConstraint("course_id", "entry_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_courses.id", ondelete="CASCADE"), index=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    personal_note: Mapped[str | None] = mapped_column(String(300))
    is_starred: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StudySession(Base):
    __tablename__ = "study_sessions"
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_courses.id", ondelete="CASCADE"), index=True)
    mode: Mapped[StudyMode] = mapped_column(str_enum(StudyMode, "study_mode"))
    # [{id, entry_id, level, answer, ...}]: CHỈ ở server, không bao giờ trả nguyên văn cho client
    questions: Mapped[list[dict]] = mapped_column(JSONB)
    # {question_id: {"answer": str, "correct": bool}}
    answers: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
