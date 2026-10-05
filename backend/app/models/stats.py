"""
Chỉ số game của người dùng: UserStats (1–1 với users), sổ cấp lượt quay SpinGrant, hoạt động theo ngày UserDailyActivity.

- Số từ đã thuộc vẫn nằm ở `users.mastered_count` / `users.custom_mastered_count` (đã có, dùng lại; cập nhật bằng biểu thức
  SQL trong progress_service). UserStats giữ phần còn lại: rank (hiện tại, cao nhất từng đạt, lung lay), streak, mốc lượt quay
  cao nhất từng đạt, số lượt quay còn lại, số mảnh, bộ đếm pity, tổng số lượt đã quay. Mọi cập nhật UserStats khóa dòng (SELECT … FOR UPDATE) trong services/stats_service.py.
- SpinGrant: mỗi lần cấp lượt quay ghi một dòng, duy nhất theo (user_id, reason, ref) để chạy lại không cấp hai lần.
  reason: milestone (ref = mốc, vd. "100") · rank_up (ref = mã rank) · boss (ref = mã cấp) · streak (ref = ngày địa phương).
- UserDailyActivity: số từ mới, số câu ôn, số câu đúng/tổng theo ngày địa phương (lịch tuần, mục tiêu hôm nay).
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum


class SpinKind(enum.StrEnum):
    NORMAL = "normal"
    SPECIAL = "special"


class SpinReason(enum.StrEnum):
    MILESTONE = "milestone"
    RANK_UP = "rank_up"
    BOSS = "boss"
    STREAK = "streak"


class UserStats(Base):
    __tablename__ = "user_stats"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (CheckConstraint("shards >= 0", name="shards_non_negative"), CheckConstraint("pity_counter >= 0", name="pity_non_negative"))

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_rank: Mapped[str] = mapped_column(String(16), default="tan_binh", server_default="tan_binh")
    highest_rank: Mapped[str] = mapped_column(String(16), default="tan_binh", server_default="tan_binh")
    # Lung lay: số từ thuộc rơi dưới mốc của rank hiện tại; quá hạn mà chưa gỡ lại thì hạ rank theo số từ
    rank_shaky_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rank_shaky_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    streak_current: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    streak_best: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Ngày địa phương gần nhất streak còn "sống" (Cửa Ải đúng hết, có câu sai, hoặc được miễn)
    streak_last_date: Mapped[date | None] = mapped_column(Date)
    max_spin_milestone: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    spins_normal: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    spins_special: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Vòng quay (services/collection_service.py): mảnh từ thẻ trùng, bộ đếm pity chung cho mọi loại lượt, tổng lượt đã quay
    shards: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    pity_counter: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_spins: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SpinGrant(Base):
    __tablename__ = "spin_grants"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (UniqueConstraint("user_id", "reason", "ref"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[SpinKind] = mapped_column(str_enum(SpinKind, "spin_kind"))
    reason: Mapped[SpinReason] = mapped_column(str_enum(SpinReason, "spin_reason"))
    ref: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UserDailyActivity(Base):
    __tablename__ = "user_daily_activity"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    local_date: Mapped[date] = mapped_column(Date, primary_key=True)
    new_words: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    reviews: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    correct: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
