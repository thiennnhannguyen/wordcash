"""
Chỉ số game của người học: rank (kèm lung lay), lượt quay, streak. Đọc/ghi bảng user_stats và sổ spin_grants.

- Mọi cập nhật user_stats khóa dòng (`SELECT … FOR UPDATE`, `lock_stats`) để hai request song song không ghi đè nhau.
  Thứ tự khóa luôn là users (cập nhật mastered_count trong progress_service) → user_stats, tránh deadlock.
- `on_mastered_changed`: gọi trong CÙNG transaction mỗi khi users.mastered_count đổi (lên hoặc xuống): đánh giá lại rank,
  cấp lượt đặc biệt khi lần đầu lên một rank, cấp lượt thường khi vượt mốc 50 cao nhất từng đạt.
- `refresh`: đánh giá "lười" khi đọc stats: rank lung lay quá hạn thì hạ, streak bỏ một ngày thì về 0.
- `grant`: ghi sổ spin_grants (duy nhất theo user, reason, ref; trùng thì bỏ qua) rồi mới cộng lượt, nên chạy lại không cấp hai lần.
- Từ tự tạo không bao giờ ảnh hưởng ở đây (mastered_count chỉ đếm từ hệ thống).
"""

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SpinGrant, SpinKind, SpinReason, User, UserStats
from app.services import rank, spins, streak
from app.services.streak import DayOutcome, StreakState


@dataclass
class Rewards:
    """Thay đổi trả về client sau một thao tác: lượt quay mới, thay đổi rank."""

    spins: list[dict] = field(default_factory=list)
    rank: dict | None = None

    def merge(self, other: "Rewards | None") -> "Rewards":
        if other:
            self.spins += other.spins
            if other.rank:
                # Giữ "from" của lần đầu, phần còn lại theo lần mới nhất
                self.rank = {**other.rank, "from": self.rank["from"]} if self.rank else other.rank
        return self

    def as_dict(self) -> dict:
        return {"spins": self.spins, "rank": self.rank}


async def lock_stats(session: AsyncSession, user_id: uuid.UUID) -> UserStats:
    """Lấy (tạo nếu chưa có) dòng user_stats và khóa nó tới hết transaction."""
    await session.execute(pg_insert(UserStats).values(user_id=user_id).on_conflict_do_nothing(index_elements=["user_id"]))
    return await session.scalar(
        select(UserStats).where(UserStats.user_id == user_id).with_for_update().execution_options(populate_existing=True)
    )


async def mastered_count(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Đọc thẳng từ DB (không lấy giá trị cũ trong bộ nhớ của đối tượng User)."""
    return await session.scalar(select(User.mastered_count).where(User.id == user_id)) or 0


async def grant(session: AsyncSession, stats: UserStats, kind: SpinKind, reason: SpinReason, ref: str, now: datetime) -> dict | None:
    inserted = await session.scalar(
        pg_insert(SpinGrant)
        .values(user_id=stats.user_id, kind=kind, reason=reason, ref=ref, created_at=now)
        .on_conflict_do_nothing(index_elements=["user_id", "reason", "ref"])
        .returning(SpinGrant.id)
    )
    if inserted is None:
        return None
    if kind == SpinKind.NORMAL:
        stats.spins_normal += 1
    else:
        stats.spins_special += 1
    return {"kind": kind.value, "reason": reason.value, "ref": ref}


def _rank_event(change: rank.RankChange) -> dict | None:
    if not (change.changed or change.became_shaky or change.recovered or change.demoted):
        return None
    deadline = change.state.shaky_deadline
    return {
        "from": change.previous,
        "to": change.state.current,
        "ranked_up": change.ranked_up,
        "demoted": change.demoted,
        "shaky": deadline is not None,
        "became_shaky": change.became_shaky,
        "recovered": change.recovered,
        "shaky_deadline": deadline.isoformat() if deadline else None,
    }


async def _evaluate(session: AsyncSession, stats: UserStats, mastered: int, now: datetime) -> Rewards:
    rewards = Rewards()
    change = rank.evaluate(
        rank.RankState(stats.current_rank, stats.highest_rank, stats.rank_shaky_since, stats.rank_shaky_deadline), mastered, now
    )
    stats.current_rank, stats.highest_rank = change.state.current, change.state.highest
    stats.rank_shaky_since, stats.rank_shaky_deadline = change.state.shaky_since, change.state.shaky_deadline
    for code in change.first_reached:
        if granted := await grant(session, stats, SpinKind.SPECIAL, SpinReason.RANK_UP, code, now):
            rewards.spins.append(granted)
    rewards.rank = _rank_event(change)

    milestones = spins.new_milestones(stats.max_spin_milestone, mastered)
    for milestone in milestones:
        if granted := await grant(session, stats, SpinKind.NORMAL, SpinReason.MILESTONE, str(milestone), now):
            rewards.spins.append(granted)
    if milestones:
        stats.max_spin_milestone = milestones[-1]
    return rewards


async def on_mastered_changed(session: AsyncSession, user: User, now: datetime) -> Rewards:
    stats = await lock_stats(session, user.id)
    return await _evaluate(session, stats, await mastered_count(session, user.id), now)


async def refresh(session: AsyncSession, user: User, now: datetime, today: date) -> tuple[UserStats, Rewards]:
    """Đánh giá lười khi đọc stats: hạ rank nếu lung lay quá hạn, streak về 0 nếu đã bỏ một ngày."""
    stats = await lock_stats(session, user.id)
    rewards = await _evaluate(session, stats, await mastered_count(session, user.id), now)
    decayed = streak.decay(StreakState(stats.streak_current, stats.streak_best, stats.streak_last_date), today)
    stats.streak_current = decayed.state.current
    return stats, rewards


async def apply_streak(session: AsyncSession, user: User, today: date, outcome: DayOutcome, now: datetime) -> tuple[streak.StreakChange, Rewards]:
    stats = await lock_stats(session, user.id)
    change = streak.apply_day(StreakState(stats.streak_current, stats.streak_best, stats.streak_last_date), today, outcome)
    stats.streak_current, stats.streak_best, stats.streak_last_date = change.state.current, change.state.best, change.state.last_date
    rewards = Rewards()
    if change.milestone and (granted := await grant(session, stats, SpinKind.NORMAL, SpinReason.STREAK, today.isoformat(), now)):
        rewards.spins.append(granted)
    return change, rewards


async def grant_boss(session: AsyncSession, user: User, level_code: str, now: datetime) -> Rewards:
    """Lần ĐẦU thắng Boss mỗi cấp: +1 lượt đặc biệt (thắng lại không cấp thêm)."""
    stats = await lock_stats(session, user.id)
    rewards = Rewards()
    if granted := await grant(session, stats, SpinKind.SPECIAL, SpinReason.BOSS, level_code, now):
        rewards.spins.append(granted)
    return rewards
