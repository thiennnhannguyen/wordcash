"""
Tiến độ Học Viện của từng người: bài, chặng, cấp; lượt đánh Trận Boss; nhật ký luyện chặng yếu.

Trạng thái chung (`ProgressStatus`): locked → unlocked → completed. Mở TUẦN TỰ: bài trong chặng, chặng trong cấp; cấp sau
chỉ mở khi thắng Boss cấp trước (services/unlock.py). Phần đã mở KHÔNG BAO GIỜ khóa lại. Chưa có dòng = locked.
- Chặng: mở bài tổng hợp khi mọi bài của chặng completed (suy ra, không lưu riêng); qua bài tổng hợp → completed và đóng dấu
  địa danh (`stamped_at`).
- Cấp: Boss mở khi mọi chặng completed (suy ra); thắng Boss → completed, `boss_won_at` (cũng là ngày đóng dấu địa danh Boss).
- BossAttempt: mỗi lần đánh Boss; thua thì `weak_topic_ids` = 2 chặng có độ chính xác thấp nhất.
- TopicPracticeLog: hoàn thành một phiên luyện chặng yếu sau một lần thua (gắn `boss_attempt_id`) → xét quyền thử lại ngay.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, Float, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum


class ProgressStatus(enum.StrEnum):
    LOCKED = "locked"
    UNLOCKED = "unlocked"
    COMPLETED = "completed"


class UserUnitProgress(Base):
    __tablename__ = "user_unit_progress"
    __mapper_args__ = {"eager_defaults": True}

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), primary_key=True, index=True)
    status: Mapped[ProgressStatus] = mapped_column(str_enum(ProgressStatus, "progress_status"), default=ProgressStatus.UNLOCKED)
    best_score: Mapped[int | None] = mapped_column(Integer)  # % cao nhất của kiểm tra cuối bài
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserTopicProgress(Base):
    __tablename__ = "user_topic_progress"
    __mapper_args__ = {"eager_defaults": True}

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True, index=True)
    status: Mapped[ProgressStatus] = mapped_column(str_enum(ProgressStatus, "progress_status"), default=ProgressStatus.UNLOCKED)
    topic_test_best: Mapped[int | None] = mapped_column(Integer)
    topic_test_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stamped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # thời điểm đóng dấu hộ chiếu


class UserLevelProgress(Base):
    __tablename__ = "user_level_progress"
    __mapper_args__ = {"eager_defaults": True}

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    level_id: Mapped[int] = mapped_column(ForeignKey("levels.id", ondelete="CASCADE"), primary_key=True, index=True)
    status: Mapped[ProgressStatus] = mapped_column(str_enum(ProgressStatus, "progress_status"), default=ProgressStatus.UNLOCKED)
    boss_best: Mapped[int | None] = mapped_column(Integer)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    boss_won_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class BossAttempt(Base):
    __tablename__ = "boss_attempts"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (Index("ix_boss_attempts_user_level_created", "user_id", "level_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    level_id: Mapped[int] = mapped_column(ForeignKey("levels.id", ondelete="CASCADE"))
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("study_sessions.id", ondelete="SET NULL"), unique=True)
    score: Mapped[int] = mapped_column(Integer)  # %
    passed: Mapped[bool] = mapped_column(Boolean)
    weak_topic_ids: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=list, server_default="{}")
    # Độ chính xác từng chặng trong lần đánh này: {topic_id: tỉ lệ đúng}
    topic_accuracy: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class TopicPracticeLog(Base):
    __tablename__ = "topic_practice_log"
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    boss_attempt_id: Mapped[int | None] = mapped_column(ForeignKey("boss_attempts.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("study_sessions.id", ondelete="SET NULL"))
    score: Mapped[float | None] = mapped_column(Float)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
