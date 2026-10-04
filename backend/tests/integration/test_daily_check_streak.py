"""
Cửa Ải Hôm Nay và streak trên PostgreSQL thật.
- 2–5 câu, chỉ từ HỆ THỐNG đã học, chỉ mức 3/4; miễn khi < 2 từ (từ tự tạo không tính).
- Sai: mất "đã thuộc", trừ đúng DAILY_FORGET_PENALTY. Ranh giới 0 giờ theo múi giờ người dùng (23:59 / 00:01).
- Streak: tăng khi đúng hết; giữ nguyên khi có câu sai; về 0 khi bỏ một ngày; ngày miễn không làm mất; chạm 7, 14 cấp lượt quay.
"""

from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import func, select, update

from app.core.config import settings
from app.models import DailyCheck, EntryState, SpinGrant, User, UserEntryProgress, UserStats
from app.schemas.course import AnswerIn
from app.services import daily_check_service, stats_service
from tests.factories import make_custom, make_entry, make_user

T0 = datetime(2026, 10, 4, 3, 0, tzinfo=UTC)  # 10:00 ngày 04/10 giờ Việt Nam


async def learned(db, user, n, *, status=EntryState.LEARNING, prefix="w"):
    entries = []
    for i in range(n):
        e = await make_entry(db, f"{prefix}{i}word", f"nghĩa {prefix}{i}", example=f"I like the {prefix}{i}word a lot.")
        db.add(UserEntryProgress(user_id=user.id, entry_id=e.id, status=status, due_at=T0 - timedelta(hours=i),
                                 strong_days=3 if status == EntryState.MASTERED else 1))
        entries.append(e)
    if status == EntryState.MASTERED:
        await db.execute(update(User).where(User.id == user.id).values(mastered_count=User.mastered_count + n))
    await db.flush()
    return entries


async def play(db, user, now, wrong: int = 0):
    """Lấy Cửa Ải hôm nay và trả lời: `wrong` câu đầu sai."""
    row = await daily_check_service.get_or_create_today(db, user, now)
    answers = [AnswerIn(question_id=q["id"], answer="sai" if i < wrong else q["answer"]) for i, q in enumerate(row.questions)]
    return await daily_check_service.submit(db, user, answers, now)


async def stats_of(db, user) -> UserStats:
    return await db.scalar(select(UserStats).where(UserStats.user_id == user.id).execution_options(populate_existing=True))


async def test_exempt_when_fewer_than_two_system_words(db_session):
    user = await make_user(db_session)
    await learned(db_session, user, 1)
    custom = await make_custom(db_session, user, "mycustom", "từ riêng")
    db_session.add(UserEntryProgress(user_id=user.id, entry_id=custom.id, status=EntryState.MASTERED))
    await db_session.flush()
    row = await daily_check_service.get_or_create_today(db_session, user, T0)
    assert row.status == "exempt" and row.questions == []  # từ tự tạo không tính
    assert (await stats_of(db_session, user)).streak_current == 0


@pytest.mark.parametrize(("have", "asked"), [(2, 2), (3, 3), (5, 5), (12, 5)])
async def test_two_to_five_questions_level_3_or_4_system_only(db_session, have, asked):
    user = await make_user(db_session)
    words = await learned(db_session, user, have)
    custom = await make_custom(db_session, user, "mycustom", "từ riêng")
    db_session.add(UserEntryProgress(user_id=user.id, entry_id=custom.id, status=EntryState.LEARNING, due_at=T0 - timedelta(days=9)))
    await db_session.flush()
    row = await daily_check_service.get_or_create_today(db_session, user, T0)
    assert row.status == "pending" and row.total == asked
    assert {q["level"] for q in row.questions} <= {3, 4}
    assert custom.id not in {q["entry_id"] for q in row.questions}
    assert all("answer" not in q["public"] for q in row.questions)
    if have > asked:
        # Ưu tiên từ sắp đến hạn: 3 từ đến hạn sớm nhất luôn có mặt (+2 ngẫu nhiên)
        soonest = {w.id for w in sorted(words, key=lambda w: w.id)[-3:]}
        assert soonest <= {q["entry_id"] for q in row.questions}
    public = await daily_check_service.today(db_session, user, T0)
    assert all("answer" not in q and "entry_id" not in q for q in public["questions"])


async def test_wrong_answer_loses_mastered_with_penalty(db_session):
    user = await make_user(db_session)
    await learned(db_session, user, 4, status=EntryState.MASTERED)
    res = await play(db_session, user, T0, wrong=1)
    assert res["status"] == "partial" and res["result"]["lost_words"] == 1
    assert res["result"]["mastered_count"] == 4 - settings.DAILY_FORGET_PENALTY
    wrong_entry = res["results"][0]["entry"]["id"]
    progress = await db_session.get(UserEntryProgress, (user.id, wrong_entry), populate_existing=True)
    assert progress.status == EntryState.FORGOTTEN and progress.strong_days == 0
    assert res["results"][0]["correct_answer"] and res["results"][0]["lost_mastered"] is True


async def test_midnight_boundary_uses_user_timezone(db_session):
    user = await make_user(db_session)  # Asia/Ho_Chi_Minh
    await learned(db_session, user, 3)
    before = datetime(2026, 10, 4, 16, 59, tzinfo=UTC)  # 23:59 ngày 04/10 giờ VN
    after = datetime(2026, 10, 4, 17, 1, tzinfo=UTC)  # 00:01 ngày 05/10 giờ VN
    await play(db_session, user, before)
    assert (await daily_check_service.get_or_create_today(db_session, user, before)).local_date == date(2026, 10, 4)
    row = await daily_check_service.get_or_create_today(db_session, user, after)
    assert row.local_date == date(2026, 10, 5) and row.status == "pending"

    ny = await make_user(db_session, "ny")
    await db_session.execute(update(User).where(User.id == ny.id).values(timezone="America/New_York"))
    await db_session.refresh(ny)
    await learned(db_session, ny, 3, prefix="n")
    # 03:00 UTC ngày 04/10 vẫn là 23:00 ngày 03/10 ở New York (EDT)
    assert (await daily_check_service.get_or_create_today(db_session, ny, T0)).local_date == date(2026, 10, 3)


async def test_streak_increments_holds_and_resets(db_session):
    user = await make_user(db_session)
    await learned(db_session, user, 3)
    day = lambda n: T0 + timedelta(days=n)  # noqa: E731
    assert (await play(db_session, user, day(0)))["result"]["streak"] == 1
    assert (await play(db_session, user, day(1)))["result"]["streak"] == 2
    held = await play(db_session, user, day(2), wrong=1)
    assert held["status"] == "partial" and held["result"]["streak"] == 2  # có câu sai: giữ nguyên
    # Bỏ ngày 3; ngày 4 đọc stats thấy streak = 0, làm Cửa Ải đúng hết thì lên 1
    _, _ = await stats_service.refresh(db_session, user, day(4), date(2026, 10, 8))
    assert (await stats_of(db_session, user)).streak_current == 0
    res = await play(db_session, user, day(4))
    assert res["result"]["streak"] == 1 and res["result"]["streak_best"] == 2


async def test_exempt_day_keeps_streak(db_session):
    user = await make_user(db_session)
    words = await learned(db_session, user, 2)
    assert (await play(db_session, user, T0))["result"]["streak"] == 1
    # Ngày 2: còn dưới 2 từ đã học (giả lập bằng cách đưa 1 từ về new) → được miễn, streak giữ
    await db_session.execute(update(UserEntryProgress).where(UserEntryProgress.entry_id == words[0].id).values(status=EntryState.NEW))
    row = await daily_check_service.get_or_create_today(db_session, user, T0 + timedelta(days=1))
    assert row.status == "exempt" and row.result["streak"] == 1
    await db_session.execute(update(UserEntryProgress).where(UserEntryProgress.entry_id == words[0].id).values(status=EntryState.LEARNING))
    assert (await play(db_session, user, T0 + timedelta(days=2)))["result"]["streak"] == 2


async def test_streak_seven_and_fourteen_grant_normal_spin(db_session):
    user = await make_user(db_session)
    await learned(db_session, user, 3)
    stats = await stats_service.lock_stats(db_session, user.id)
    stats.streak_current, stats.streak_best, stats.streak_last_date = 6, 6, date(2026, 10, 3)
    await db_session.flush()
    res = await play(db_session, user, T0)
    assert res["result"]["streak"] == 7 and res["result"]["streak_milestone"] == 7
    assert res["rewards"]["spins"] == [{"kind": "normal", "reason": "streak", "ref": "2026-10-04"}]
    for n in range(1, 7):
        assert (await play(db_session, user, T0 + timedelta(days=n)))["rewards"]["spins"] == []
    res = await play(db_session, user, T0 + timedelta(days=7))
    assert res["result"]["streak"] == 14 and len(res["rewards"]["spins"]) == 1
    assert (await stats_of(db_session, user)).spins_normal == 2
    assert await db_session.scalar(select(func.count()).select_from(SpinGrant).where(SpinGrant.user_id == user.id)) == 2


async def test_submit_twice_is_idempotent_and_done_blocks_new(db_session):
    user = await make_user(db_session)
    await learned(db_session, user, 3)
    first = await play(db_session, user, T0)
    again = await play(db_session, user, T0)
    assert again["result"] == first["result"] and (await stats_of(db_session, user)).streak_current == 1
    assert await db_session.scalar(select(func.count()).select_from(DailyCheck).where(DailyCheck.user_id == user.id)) == 1
