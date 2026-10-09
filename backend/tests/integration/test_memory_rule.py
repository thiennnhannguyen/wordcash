"""
Luật ghi nhớ thống nhất: chỉ Cửa Ải Hôm Nay được làm mất "đã thuộc".
- Ôn ở nơi khác (khóa học, Học Viện, Đấu Trường) trả lời sai: lịch SRS đặt lại (khoảng ngắn nhất, ease giảm, lapse +1),
  trạng thái vẫn `mastered`, mastered_count không đổi.
- Cửa Ải trả lời sai: `forgotten`, mastered_count trừ DAILY_FORGET_PENALTY.
- `first_mastered_at` ghi lần đầu thuộc và không đổi khi quên rồi thuộc lại; `mastered_at` là lần thuộc gần nhất.
"""

from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.config import settings
from app.models import EntryState, User, UserEntryProgress
from app.services import progress_service
from tests.factories import make_custom, make_entry, make_user

NOW = datetime(2026, 10, 3, 9, 0, tzinfo=UTC)


async def _mastered(db, user, entry):
    """Tiến độ đã thuộc, đang ở lần ôn thứ 4 (khoảng 16 ngày)."""
    progress = UserEntryProgress(
        user_id=user.id, entry_id=entry.id, status=EntryState.MASTERED, ease=2.6, interval_days=16, repetitions=4,
        lapse_count=0, due_at=NOW - timedelta(hours=1), strong_days=3, last_strong_day=date(2026, 9, 20),
        correct_count=6, wrong_count=0,
    )
    db.add(progress)
    await db.execute(User.__table__.update().where(User.id == user.id).values(
        **({"custom_mastered_count": 1} if entry.is_custom else {"mastered_count": 1})
    ))
    await db.flush()
    return progress


@pytest.mark.parametrize("source", ["course", "academy", "arena"])
async def test_wrong_answer_outside_daily_check_keeps_mastered(db_session, source):
    user = await make_user(db_session)
    entry = await make_entry(db_session, "deadline", "hạn chót")
    progress = await _mastered(db_session, user, entry)

    outcome = await progress_service.record_answer(db_session, user, entry, 3, False, NOW, source=source)
    assert outcome.status == EntryState.MASTERED
    assert progress.status == EntryState.MASTERED and progress.strong_days == 3
    assert progress.interval_days == settings.SRS_INTERVALS[0] and progress.repetitions == 0
    assert progress.due_at == NOW + timedelta(days=settings.SRS_INTERVALS[0])
    assert progress.ease < 2.6 and progress.lapse_count == 1
    await db_session.refresh(user)
    assert user.mastered_count == 1


async def test_daily_check_wrong_answer_forgets_and_penalizes(db_session):
    user = await make_user(db_session)
    entry = await make_entry(db_session, "deadline", "hạn chót")
    progress = await _mastered(db_session, user, entry)

    outcome = await progress_service.forget_entry(db_session, user, entry, NOW)
    assert outcome.status == EntryState.FORGOTTEN
    assert progress.status == EntryState.FORGOTTEN and progress.strong_days == 0 and progress.lapse_count == 1
    assert progress.interval_days == settings.SRS_INTERVALS[0]
    await db_session.refresh(user)
    assert user.mastered_count == 1 - settings.DAILY_FORGET_PENALTY


async def test_daily_check_on_learning_word_does_not_touch_counter(db_session):
    user = await make_user(db_session)
    entry = await make_entry(db_session, "salary", "lương")
    await progress_service.record_answer(db_session, user, entry, 1, True, NOW, source="academy")
    await progress_service.forget_entry(db_session, user, entry, NOW)
    await db_session.refresh(user)
    assert user.mastered_count == 0


async def test_custom_word_forget_only_touches_custom_counter(db_session):
    user = await make_user(db_session)
    entry = await make_custom(db_session, user, "refactor", "tái cấu trúc")
    await _mastered(db_session, user, entry)
    await progress_service.forget_entry(db_session, user, entry, NOW)
    await db_session.refresh(user)
    assert (user.mastered_count, user.custom_mastered_count) == (0, 0)


async def _answer_strong_on_days(db, user, entry, start, days):
    for d in range(days):
        await progress_service.record_answer(db, user, entry, 3, True, start + timedelta(days=d), source="academy")


async def test_first_mastered_at_kept_after_forget_and_remaster(db_session):
    user = await make_user(db_session)
    entry = await make_entry(db_session, "harbor", "bến cảng")
    await _answer_strong_on_days(db_session, user, entry, NOW, 3)
    progress = await db_session.get(UserEntryProgress, (user.id, entry.id))
    first = NOW + timedelta(days=2)
    assert progress.status == EntryState.MASTERED
    assert progress.first_mastered_at == first and progress.mastered_at == first

    await progress_service.forget_entry(db_session, user, entry, NOW + timedelta(days=5))
    again = NOW + timedelta(days=6)
    await _answer_strong_on_days(db_session, user, entry, again, 3)
    assert progress.status == EntryState.MASTERED
    assert progress.mastered_at == again + timedelta(days=2)
    assert progress.first_mastered_at == first
