"""
"Khóa học của tôi": bộ từ vựng người dùng tự tạo (UserCourse), các mục từ trong bộ (UserCourseEntry) và phiên học (StudySession).

- UserCourseEntry chỉ LIÊN KẾT tới mục từ (từ hệ thống hoặc từ tự tạo), không sao chép nội dung. Xóa khỏi khóa học không xóa mục từ.
- `word_count` là bộ đếm cache, service cập nhật mỗi khi thêm/bớt từ.
- Khóa học hiện luôn riêng tư; `visibility = shared` để sẵn cho tính năng chia sẻ sau này.
- StudySession giữ bộ câu hỏi KÈM ĐÁP ÁN ở server (`questions`), client chỉ nhận phần đề; `answers` ghi câu đã nộp.
  Dùng chung cho Khóa học của tôi và Học Viện: `kind` cho biết phiên thuộc đâu (course | unit_learn | unit_test | topic_test
  | topic_practice | boss | review), `ref_id` là id bài / chặng / cấp tương ứng (course_id chỉ có ở phiên khóa học).
  `mode` quyết định cách lộ đáp án (test: chỉ lộ khi nộp hết). `result` lưu kết quả cuối (điểm, phần vừa mở khóa, con dấu,
  lượt quay, thay đổi rank) để nộp lại trả đúng kết quả cũ, không tính hai lần.
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


class SessionKind(enum.StrEnum):
    COURSE = "course"
    UNIT_LEARN = "unit_learn"
    UNIT_TEST = "unit_test"
    TOPIC_TEST = "topic_test"
    TOPIC_PRACTICE = "topic_practice"
    BOSS = "boss"
    REVIEW = "review"


class StudySession(Base):
    __tablename__ = "study_sessions"
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("user_courses.id", ondelete="CASCADE"), index=True)
    kind: Mapped[SessionKind] = mapped_column(str_enum(SessionKind, "session_kind"), default=SessionKind.COURSE,
                                              server_default=SessionKind.COURSE.value)
    ref_id: Mapped[int | None] = mapped_column(Integer)
    mode: Mapped[StudyMode] = mapped_column(str_enum(StudyMode, "study_mode"))
    # [{id, entry_id, level, answer, ...}]: CHỈ ở server, không bao giờ trả nguyên văn cho client
    questions: Mapped[list[dict]] = mapped_column(JSONB)
    # {question_id: {"answer": str, "correct": bool}}
    answers: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    result: Mapped[dict | None] = mapped_column(JSONB)
