"""
Ghi một câu trả lời vào tiến độ học (dùng chung cho Khóa học của tôi, sau này cho Học Viện, Đấu Trường).

Luật ghi nhớ thống nhất: `record_answer` (mọi nơi trừ Cửa Ải) trả lời sai chỉ đặt lại lịch SRS và tăng `lapse_count`,
giữ nguyên `mastered`. Chỉ `forget_entry` (Cửa Ải Hôm Nay) được chuyển từ sang `forgotten` và trừ số từ đã thuộc
(DAILY_FORGET_PENALTY, chỉ áp cho từ hệ thống; Cửa Ải không bao giờ hỏi từ tự tạo).

Mỗi câu trả lời: cập nhật lịch ôn (services/srs.py), trạng thái thuộc (services/mastery.py), số lần đúng/sai, nhật ký ReviewLog,
và bộ đếm trên users. Từ hệ thống cộng vào `mastered_count` (rank, lượt quay); từ tự tạo chỉ cộng `custom_mastered_count`.
Bộ đếm cập nhật bằng biểu thức SQL (`mastered_count + n`) để hai request song song không ghi đè nhau.
Khi mastered_count đổi (lên hoặc xuống), gọi stats_service.on_mastered_changed trong CÙNG transaction: rank, lung lay, lượt quay
theo mốc; kết quả nằm ở `AnswerOutcome.rewards`. Mỗi câu trả lời cũng cộng vào user_daily_activity (ngày địa phương):
lần đầu gặp từ → new_words; câu về từ đã gặp từ hôm trước → reviews (luyện lại từ mới trong ngày không tính là ôn).
"""

from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Entry, EntryState, ReviewLog, User, UserDailyActivity, UserEntryProgress
from app.services import mastery, srs, stats_service
from app.services.stats_service import Rewards
from app.utils.time import local_date


@dataclass(frozen=True)
class AnswerOutcome:
    status: EntryState
    became_mastered: bool
    lost_mastered: bool = False
    rewards: Rewards | None = None


async def _track_activity(session: AsyncSession, user: User, day: date, *, new_word: bool, review: bool, correct: bool) -> None:
    values = {"new_words": int(new_word), "reviews": int(review), "correct": int(correct), "total": 1}
    stmt = pg_insert(UserDailyActivity).values(user_id=user.id, local_date=day, **values)
    await session.execute(stmt.on_conflict_do_update(
        index_elements=["user_id", "local_date"],
        set_={k: getattr(UserDailyActivity, k) + v for k, v in values.items()},
    ))


async def _counters_changed(session: AsyncSession, user: User, system_delta: int, custom_delta: int, now: datetime) -> Rewards | None:
    if not (system_delta or custom_delta):
        return None
    await session.execute(
        update(User)
        .where(User.id == user.id)
        .values(mastered_count=User.mastered_count + system_delta, custom_mastered_count=User.custom_mastered_count + custom_delta)
    )
    # Từ tự tạo không đổi rank / lượt quay
    return await stats_service.on_mastered_changed(session, user, now) if system_delta else None


def local_day(user: User, now: datetime) -> date:
    """Ngày theo múi giờ của người học (giữ tên cũ cho nơi gọi; xem utils/time.py)."""
    return local_date(user, now)


async def _get_progress(session: AsyncSession, user: User, entry: Entry) -> UserEntryProgress:
    progress = await session.get(UserEntryProgress, (user.id, entry.id))
    if progress is None:
        progress = UserEntryProgress(user_id=user.id, entry_id=entry.id, status=EntryState.NEW, ease=srs.initial_state().ease,
                                     interval_days=0, repetitions=0, lapse_count=0, strong_days=0, correct_count=0, wrong_count=0)
        session.add(progress)
    return progress


def _apply_srs(progress: UserEntryProgress, quality: int, now: datetime) -> None:
    state = srs.schedule(
        srs.SrsState(progress.ease, progress.interval_days, progress.repetitions, progress.due_at, progress.lapse_count), quality, now
    )
    progress.ease, progress.interval_days, progress.repetitions = state.ease, state.interval_days, state.repetitions
    progress.due_at, progress.lapse_count = state.due_at, state.lapses


async def record_answer(session: AsyncSession, user: User, entry: Entry, level: int, correct: bool, now: datetime,
                        source: str) -> AnswerOutcome:
    """Học/ôn ở mọi nơi trừ Cửa Ải: sai thì đặt lại lịch SRS, KHÔNG làm mất `mastered`."""
    progress = await _get_progress(session, user, entry)

    today = local_day(user, now)
    first_time = progress.first_seen_at is None
    if first_time:
        progress.first_seen_at, progress.first_seen_day = now, today
    progress.last_seen_at = now
    if correct:
        progress.correct_count += 1
    else:
        progress.wrong_count += 1

    _apply_srs(progress, srs.quality_from(correct, level), now)

    change = mastery.apply_answer(mastery.MasteryState(progress.status, progress.strong_days, progress.last_strong_day), level, correct, today)
    progress.status, progress.strong_days, progress.last_strong_day = change.state.status, change.state.strong_days, change.state.last_strong_day
    if change.became_mastered:
        progress.mastered_at = now

    rewards = await _counters_changed(session, user, *mastery.counter_deltas(change, entry.is_custom), now)
    await _track_activity(session, user, today, new_word=first_time, review=progress.first_seen_day != today, correct=correct)
    session.add(ReviewLog(user_id=user.id, entry_id=entry.id, level=level, correct=correct, source=source, answered_at=now))
    return AnswerOutcome(progress.status, change.became_mastered, rewards=rewards)


async def forget_entry(session: AsyncSession, user: User, entry: Entry, now: datetime) -> AnswerOutcome:
    """Cửa Ải Hôm Nay trả lời sai: từ chuyển `forgotten`, lịch ôn đặt lại, trừ DAILY_FORGET_PENALTY từ đã thuộc nếu từ đang thuộc.

    Chỉ Cửa Ải được gọi hàm này. Cửa Ải chỉ hỏi từ hệ thống; từ tự tạo (nếu lỡ truyền vào) chỉ trừ custom_mastered_count.
    """
    progress = await _get_progress(session, user, entry)
    progress.last_seen_at = now
    progress.wrong_count += 1
    _apply_srs(progress, srs.quality_from(False, 3), now)
    change = mastery.forget(mastery.MasteryState(progress.status, progress.strong_days, progress.last_strong_day))
    progress.status, progress.strong_days, progress.last_strong_day = change.state.status, change.state.strong_days, change.state.last_strong_day
    rewards = None
    if change.lost_mastered:
        if entry.is_custom:
            rewards = await _counters_changed(session, user, 0, -1, now)
        else:
            rewards = await _counters_changed(session, user, -settings.DAILY_FORGET_PENALTY, 0, now)
    await _track_activity(session, user, local_day(user, now), new_word=False, review=True, correct=False)
    session.add(ReviewLog(user_id=user.id, entry_id=entry.id, level=3, correct=False, source="daily_check", answered_at=now))
    return AnswerOutcome(progress.status, False, lost_mastered=change.lost_mastered, rewards=rewards)
