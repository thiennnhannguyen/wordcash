"""
Ghi một câu trả lời vào tiến độ học (dùng chung cho Khóa học của tôi, sau này cho Học Viện, Đấu Trường).

Mỗi câu trả lời: cập nhật lịch ôn (services/srs.py), trạng thái thuộc (services/mastery.py), số lần đúng/sai, nhật ký ReviewLog,
và bộ đếm trên users. Từ hệ thống cộng vào `mastered_count` (rank, lượt quay); từ tự tạo chỉ cộng `custom_mastered_count`.
Bộ đếm cập nhật bằng biểu thức SQL (`mastered_count + n`) để hai request song song không ghi đè nhau.
"""

from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Entry, EntryState, ReviewLog, User, UserEntryProgress
from app.services import mastery, srs


@dataclass(frozen=True)
class AnswerOutcome:
    status: EntryState
    became_mastered: bool


def local_day(user: User, now: datetime) -> date:
    """Ngày theo múi giờ của người học."""
    return now.astimezone(ZoneInfo(user.timezone)).date()


async def record_answer(session: AsyncSession, user: User, entry: Entry, level: int, correct: bool, now: datetime,
                        source: str) -> AnswerOutcome:
    progress = await session.get(UserEntryProgress, (user.id, entry.id))
    if progress is None:
        progress = UserEntryProgress(user_id=user.id, entry_id=entry.id, status=EntryState.NEW, ease=srs.initial_state().ease,
                                     interval_days=0, repetitions=0, strong_days=0, correct_count=0, wrong_count=0)
        session.add(progress)

    today = local_day(user, now)
    if progress.first_seen_at is None:
        progress.first_seen_at, progress.first_seen_day = now, today
    progress.last_seen_at = now
    if correct:
        progress.correct_count += 1
    else:
        progress.wrong_count += 1

    state = srs.schedule(
        srs.SrsState(progress.ease, progress.interval_days, progress.repetitions, progress.due_at),
        srs.quality_from(correct, level),
        now,
    )
    progress.ease, progress.interval_days, progress.repetitions, progress.due_at = state.ease, state.interval_days, state.repetitions, state.due_at

    change = mastery.apply_answer(mastery.MasteryState(progress.status, progress.strong_days, progress.last_strong_day), level, correct, today)
    progress.status, progress.strong_days, progress.last_strong_day = change.state.status, change.state.strong_days, change.state.last_strong_day
    if change.became_mastered:
        progress.mastered_at = now

    system_delta, custom_delta = mastery.counter_deltas(change, entry.is_custom)
    if system_delta or custom_delta:
        await session.execute(
            update(User)
            .where(User.id == user.id)
            .values(mastered_count=User.mastered_count + system_delta, custom_mastered_count=User.custom_mastered_count + custom_delta)
        )

    session.add(ReviewLog(user_id=user.id, entry_id=entry.id, level=level, correct=correct, source=source, answered_at=now))
    return AnswerOutcome(progress.status, change.became_mastered)
