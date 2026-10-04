"""
Kho từ: Level (A1–C2), Topic (chặng chủ đề), Unit (bài học), Entry (mục từ), UnitEntry (liên kết bài–mục từ, theo nhánh Nền tảng/IELTS/TOEIC).

Đã có: Level (kèm `region_theme`, `boss_landmark_key`, `boss_landmark_name`) và Topic (kèm `landmark_key`, `landmark_name`,
`landmark_image` nullable). Dữ liệu địa danh A1, A2: seeds/seed_landmarks.py.

Entry có hai nguồn (`source`):
- `system`: kho từ của WORDCLASH, `owner_user_id` rỗng; chỉ hiện cho người học khi `status = approved`.
- `user`: từ người dùng tự tạo trong "Khóa học của tôi", `owner_user_id` = người tạo; chỉ chủ sở hữu nhìn thấy.
  Không tính vào rank, không cho lượt quay, không dùng ở Cửa Ải Hôm Nay (xem docs/courses.md).
Mọi truy vấn entries phía người học PHẢI lọc qua `visible_to(user_id)`.

AudioJob: hàng đợi tạo phát âm cho từ tự tạo (chưa gọi TTS thật; frontend dùng Web Speech API khi `audio_url` trống).

Unit (bài học trong một chặng, thứ tự `position`) và UnitEntry (mục từ của bài, chỉ liên kết, không sao chép). Số bài mỗi
chặng và số từ mỗi bài KHÔNG cố định (dữ liệu mẫu dev 2 bài × 15 từ; kho thật 4–5 bài). Hiện chỉ có nhánh Nền tảng;
IELTS/TOEIC chưa có dữ liệu. Ngày đến địa danh (con dấu) lưu ở user_topic_progress.stamped_at (models/academy.py).
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, and_, func, or_, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, str_enum


class Level(Base):
    __tablename__ = "levels"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(2), unique=True)  # A1…C2
    name: Mapped[str] = mapped_column(String(64))
    order: Mapped[int] = mapped_column(unique=True)
    region_theme: Mapped[str | None] = mapped_column(String(32))  # vn-north, vn-central-south, uk…
    boss_landmark_key: Mapped[str | None] = mapped_column(String(64))
    boss_landmark_name: Mapped[str | None] = mapped_column(String(128))

    topics: Mapped[list["Topic"]] = relationship(back_populates="level", order_by="Topic.order")


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("level_id", "order"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    level_id: Mapped[int] = mapped_column(ForeignKey("levels.id", ondelete="CASCADE"), index=True)
    order: Mapped[int]
    title: Mapped[str] = mapped_column(String(128))
    landmark_key: Mapped[str | None] = mapped_column(String(64))
    landmark_name: Mapped[str | None] = mapped_column(String(128))
    landmark_image: Mapped[str | None] = mapped_column(String(512))

    level: Mapped[Level] = relationship(back_populates="topics")


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (UniqueConstraint("topic_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]  # thứ tự trong chặng, bắt đầu từ 1
    title: Mapped[str] = mapped_column(String(128))


class UnitEntry(Base):
    __tablename__ = "unit_entries"
    __table_args__ = (UniqueConstraint("unit_id", "entry_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), index=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(default=0)


class EntryType(enum.StrEnum):
    WORD = "word"
    COLLOCATION = "collocation"
    PHRASAL_VERB = "phrasal_verb"
    IDIOM = "idiom"


class EntryStatus(enum.StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"


class EntrySource(enum.StrEnum):
    SYSTEM = "system"
    USER = "user"


class Entry(Base):
    __tablename__ = "entries"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        # Từ hệ thống không có chủ; từ tự tạo luôn có chủ
        CheckConstraint(
            "(source = 'system' AND owner_user_id IS NULL) OR (source = 'user' AND owner_user_id IS NOT NULL)",
            name="owner_matches_source",
        ),
        # Tìm theo chữ thường (gợi ý khi gõ, khớp kho khi nhập hàng loạt)
        Index("ix_entries_headword_lower", func.lower(text("headword"))),
        # Một người không có hai từ tự tạo trùng nhau (không phân biệt hoa thường)
        Index(
            "uq_entries_owner_headword_lower",
            "owner_user_id",
            func.lower(text("headword")),
            unique=True,
            postgresql_where=text("source = 'user'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    headword: Mapped[str] = mapped_column(String(100))
    entry_type: Mapped[EntryType] = mapped_column(str_enum(EntryType, "entry_type"), default=EntryType.WORD, server_default=EntryType.WORD.value)
    pos: Mapped[str | None] = mapped_column(String(32))
    ipa: Mapped[str | None] = mapped_column(String(100))
    audio_url: Mapped[str | None] = mapped_column(String(512))
    meaning_vi: Mapped[str] = mapped_column(String(300))
    definition_en: Mapped[str | None] = mapped_column(Text)
    example: Mapped[str | None] = mapped_column(String(500))
    collocations: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    word_family: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    synonyms: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    cefr: Mapped[str | None] = mapped_column(String(2))  # từ tự tạo: rỗng
    topic: Mapped[str | None] = mapped_column(String(64))  # chủ đề (vd. "Gia đình"); từ tự tạo: rỗng
    exam_tags: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    image_url: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[EntryStatus] = mapped_column(str_enum(EntryStatus, "entry_status"), default=EntryStatus.DRAFT, server_default=EntryStatus.DRAFT.value)
    source: Mapped[EntrySource] = mapped_column(str_enum(EntrySource, "entry_source"), default=EntrySource.SYSTEM, server_default=EntrySource.SYSTEM.value)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def is_custom(self) -> bool:
        return self.source == EntrySource.USER

    @staticmethod
    def visible_to(user_id: uuid.UUID):
        """Điều kiện bắt buộc cho mọi truy vấn entries phía người học:
        từ hệ thống đã duyệt, hoặc từ tự tạo của chính người đó."""
        return or_(
            and_(Entry.source == EntrySource.SYSTEM, Entry.status == EntryStatus.APPROVED),
            Entry.owner_user_id == user_id,
        )

    @staticmethod
    def system_approved():
        """Chỉ kho hệ thống đã duyệt (gợi ý khi gõ, đáp án nhiễu bổ sung, Cửa Ải Hôm Nay)."""
        return and_(Entry.source == EntrySource.SYSTEM, Entry.status == EntryStatus.APPROVED)


class AudioJobStatus(enum.StrEnum):
    PENDING = "pending"
    DONE = "done"
    FAILED = "failed"


class AudioJob(Base):
    """Hàng đợi tạo file phát âm cho từ tự tạo. Worker TTS chưa viết; job nằm ở `pending`."""

    __tablename__ = "audio_jobs"
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"), index=True)
    status: Mapped[AudioJobStatus] = mapped_column(
        str_enum(AudioJobStatus, "audio_job_status"), default=AudioJobStatus.PENDING, server_default=AudioJobStatus.PENDING.value
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
