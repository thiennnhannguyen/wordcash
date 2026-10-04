"""
Rank, lung lay và lượt quay trên PostgreSQL thật, đi qua đúng đường code: record_answer (thuộc thêm từ) và forget_entry
(Cửa Ải làm mất từ) → stats_service trong cùng transaction.
- Lên rank: +1 lượt đặc biệt đúng một lần; lung lay rồi gỡ lại; lung lay quá 3 ngày thì hạ; lên lại rank cũ không cấp lại.
- Mốc 50: 49 → 50 cấp; 50 → 49 → 50 không cấp lại; nhảy 98 → 102 cấp đúng 1.
- Hai request song song cập nhật user_stats không lệch (kết nối DB riêng, commit thật).
"""

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EntryState, SpinGrant, SpinKind, SpinReason, User, UserEntryProgress, UserStats
from app.services import progress_service, stats_service
from tests.factories import make_entry, make_user

T0 = datetime(2026, 10, 4, 3, 0, tzinfo=UTC)


async def set_mastered(db, user, n):
    await db.execute(update(User).where(User.id == user.id).values(mastered_count=n))


async def almost_mastered(db, user, word="almost"):
    """Một từ chỉ còn thiếu 1 ngày đúng ở mức 3 là thành `mastered`."""
    e = await make_entry(db, f"{word}{uuid.uuid4().hex[:4]}", "gần thuộc")
    db.add(UserEntryProgress(user_id=user.id, entry_id=e.id, status=EntryState.LEARNING, strong_days=2,
                             last_strong_day=date(2026, 10, 1), due_at=T0 - timedelta(hours=1), first_seen_day=date(2026, 9, 1)))
    await db.flush()
    return e


async def master(db, user, entry, now):
    out = await progress_service.record_answer(db, user, entry, 3, True, now, source="academy")
    assert out.became_mastered
    return out.rewards


async def forget(db, user, entry, now):
    return (await progress_service.forget_entry(db, user, entry, now)).rewards


async def stats_of(db, user) -> UserStats:
    return await db.scalar(select(UserStats).where(UserStats.user_id == user.id).execution_options(populate_existing=True))


async def grants(db, user, reason):
    return await db.scalar(select(func.count()).select_from(SpinGrant).where(SpinGrant.user_id == user.id, SpinGrant.reason == reason))


async def test_rank_up_grants_special_once_and_shaky_recover_demote(db_session):
    db = db_session
    user = await make_user(db)
    await set_mastered(db, user, 99)
    word = await almost_mastered(db, user)
    rewards = await master(db, user, word, T0)
    assert rewards.rank["ranked_up"] and rewards.rank["to"] == "dong"
    assert {"kind": "special", "reason": "rank_up", "ref": "dong"} in rewards.spins
    s = await stats_of(db, user)
    assert (s.current_rank, s.highest_rank, s.spins_special) == ("dong", "dong", 1)

    # Cửa Ải làm mất từ → dưới 100 → lung lay 3 ngày, rank chưa đổi
    rewards = await forget(db, user, word, T0 + timedelta(hours=1))
    assert rewards.rank["became_shaky"] and rewards.rank["to"] == "dong"
    s = await stats_of(db, user)
    assert s.current_rank == "dong" and s.rank_shaky_deadline == T0 + timedelta(hours=1, days=3)

    # Gỡ lại kịp: thuộc thêm một từ → hết lung lay, không cấp lượt đặc biệt lần nữa
    other = await almost_mastered(db, user, "save")
    rewards = await master(db, user, other, T0 + timedelta(days=2))
    assert rewards.rank["recovered"] and not rewards.rank["shaky"]
    assert (await stats_of(db, user)).rank_shaky_deadline is None and await grants(db, user, "rank_up") == 1

    # Lung lay lại và để quá 3 ngày → hạ rank theo số từ
    await forget(db, user, other, T0 + timedelta(days=2, hours=1))
    _, rewards = await stats_service.refresh(db, user, T0 + timedelta(days=5, hours=2), date(2026, 10, 9))
    assert rewards.rank["demoted"] and rewards.rank["to"] == "tan_binh"
    s = await stats_of(db, user)
    assert (s.current_rank, s.highest_rank, s.rank_shaky_deadline) == ("tan_binh", "dong", None)

    # Lên lại Đồng: không cấp lượt đặc biệt lần hai
    third = await almost_mastered(db, user, "back")
    rewards = await master(db, user, third, T0 + timedelta(days=6))
    assert rewards.rank["to"] == "dong" and rewards.spins == []
    assert await grants(db, user, "rank_up") == 1 and (await stats_of(db, user)).spins_special == 1


async def test_milestone_49_to_50_and_no_regrant_after_losing_word(db_session):
    db = db_session
    user = await make_user(db)
    await set_mastered(db, user, 49)
    word = await almost_mastered(db, user)
    rewards = await master(db, user, word, T0)
    assert rewards.spins == [{"kind": "normal", "reason": "milestone", "ref": "50"}]
    await forget(db, user, word, T0 + timedelta(hours=1))  # 50 → 49
    again = await almost_mastered(db, user, "again")
    rewards = await master(db, user, again, T0 + timedelta(days=1))  # 49 → 50
    assert rewards.spins == []
    s = await stats_of(db, user)
    assert s.spins_normal == 1 and s.max_spin_milestone == 50 and await grants(db, user, "milestone") == 1


async def test_milestone_jump_98_to_102_grants_exactly_one(db_session):
    db = db_session
    user = await make_user(db)
    await set_mastered(db, user, 98)
    stats = await stats_service.lock_stats(db, user.id)
    stats.max_spin_milestone, stats.current_rank, stats.highest_rank = 50, "tan_binh", "tan_binh"
    await set_mastered(db, user, 102)
    rewards = await stats_service.on_mastered_changed(db, user, T0)
    assert [g for g in rewards.spins if g["reason"] == "milestone"] == [{"kind": "normal", "reason": "milestone", "ref": "100"}]
    assert (await stats_of(db, user)).max_spin_milestone == 100


async def test_custom_words_never_touch_rank_or_spins(db_session):
    db = db_session
    from tests.factories import make_custom

    user = await make_user(db)
    await set_mastered(db, user, 49)
    custom = await make_custom(db, user, "mine", "của tôi")
    db.add(UserEntryProgress(user_id=user.id, entry_id=custom.id, status=EntryState.LEARNING, strong_days=2,
                             last_strong_day=date(2026, 10, 1)))
    await db.flush()
    out = await progress_service.record_answer(db, user, custom, 3, True, T0, source="course")
    assert out.became_mastered and out.rewards is None
    assert await grants(db, user, "milestone") == 0


async def test_parallel_updates_to_user_stats_do_not_diverge(test_engine):
    """Hai transaction song song (kết nối riêng, commit thật) cùng cộng lượt quay: không mất cập nhật, không cấp trùng."""
    async with AsyncSession(test_engine, expire_on_commit=False) as s:
        user = User(email=f"par-{uuid.uuid4().hex[:6]}@wordclash.vn", username=f"par{uuid.uuid4().hex[:6]}", display_name="Par",
                    password_hash="x")
        s.add(user)
        await s.commit()

    async def give(reason: SpinReason, ref: str):
        async with AsyncSession(test_engine, expire_on_commit=False) as s:
            stats = await stats_service.lock_stats(s, user.id)
            await asyncio.sleep(0.05)  # giữ khóa một lúc để hai transaction chắc chắn chồng nhau
            await stats_service.grant(s, stats, SpinKind.NORMAL, reason, ref, T0)
            await s.commit()

    try:
        await asyncio.gather(give(SpinReason.MILESTONE, "50"), give(SpinReason.STREAK, "2026-10-04"))
        await asyncio.gather(give(SpinReason.MILESTONE, "100"), give(SpinReason.MILESTONE, "100"))  # cùng mốc: chỉ cấp một
        async with AsyncSession(test_engine) as s:
            stats = await s.scalar(select(UserStats).where(UserStats.user_id == user.id))
            count = await s.scalar(select(func.count()).select_from(SpinGrant).where(SpinGrant.user_id == user.id))
            assert stats.spins_normal == 3 and count == 3
    finally:
        async with AsyncSession(test_engine) as s:
            await s.execute(delete(User).where(User.id == user.id))
            await s.commit()
