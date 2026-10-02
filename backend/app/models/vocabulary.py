"""
Kho từ: Level (A1–C2), Topic (chặng chủ đề), Unit (bài học), Entry (mục từ), UnitEntry (liên kết bài–mục từ, theo nhánh Nền tảng/IELTS/TOEIC).

Đã có: Level (kèm `region_theme`, `boss_landmark_key`, `boss_landmark_name`) và Topic (kèm `landmark_key`, `landmark_name`,
`landmark_image` nullable). Dữ liệu địa danh A1, A2: seeds/seed_landmarks.py.

TODO:
- Unit, Entry, UnitEntry.
- Ngày đến địa danh lấy từ tiến độ người học (ngày hoàn thành chặng), trả về dạng ISO; API bản đồ trả các trường trên.
- Entry gồm: headword, entry_type, pos, ipa, audio_url, meaning_vi, definition_en, example, collocations, word_family, synonyms, cefr, tags, image_url, status (nháp/đã duyệt)
"""

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


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
