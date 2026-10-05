"""
Tổng hợp số liệu cho Sảnh (GET /me/stats): số từ đã thuộc, rank (kèm lung lay), streak + lịch tuần, lượt quay + tiến độ x/50,
mục tiêu hôm nay, Cửa Ải hôm nay, vị trí học hiện tại, Hộ chiếu.

Đọc stats theo kiểu "lười": trước khi trả, stats_service.refresh hạ rank nếu lung lay quá hạn và đưa streak về 0 nếu đã bỏ
một ngày. Mục tiêu từ mới theo `daily_minutes` (DAILY_GOAL_BY_MINUTES: 5→10, 10→12, 15→15, 20→20).
Ôn hôm nay: đã ôn = số câu ôn (từ học từ hôm trước) trong ngày; tổng = đã ôn + số từ còn đến hạn.
"""

from datetime import datetime

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import DailyCheck, DailyCheckStatus, Entry, EntryState, User, UserDailyActivity, UserEntryProgress
from app.services import daily_check_service, rank, roadmap_service, spins, stats_service, streak
from app.utils.time import local_date


def daily_goal(minutes: int | None) -> int:
    table = settings.DAILY_GOAL_BY_MINUTES
    if minutes in table:
        return table[minutes]
    smaller = [m for m in table if minutes is not None and m <= minutes]
    return table[max(smaller)] if smaller else table[min(table)]


async def get_stats(session: AsyncSession, user: User, now: datetime) -> dict:
    today = local_date(user, now)
    # Thứ tự khóa thống nhất: khởi tạo lộ trình (khóa advisory) → users → user_stats, tránh deadlock với /collection
    st = await roadmap_service.load_structure(session)
    await roadmap_service.ensure_initialized(session, user, now, st)
    stats, _ = await stats_service.refresh(session, user, now, today)
    counters = (await session.execute(select(User.mastered_count, User.custom_mastered_count).where(User.id == user.id))).one()
    mastered, custom = counters

    days = streak.week_days(today)
    checks = await daily_check_service.week_status(session, user, days)
    week = []
    for day in days:
        status = checks.get(day)
        if day > today:
            state = "future"
        elif status is not None:
            state = status.value
        else:
            state = "pending" if day == today else "missed"
        week.append({"date": day, "status": state, "today": day == today})

    activity = await session.get(UserDailyActivity, (user.id, today))
    check = await session.scalar(select(DailyCheck).where(DailyCheck.user_id == user.id, DailyCheck.local_date == today))
    due_now = await session.scalar(
        select(func.count()).select_from(UserEntryProgress).join(Entry, Entry.id == UserEntryProgress.entry_id)
        .where(and_(UserEntryProgress.user_id == user.id, Entry.visible_to(user.id), UserEntryProgress.status != EntryState.NEW,
                    UserEntryProgress.due_at <= now))
    ) or 0
    reviewed = activity.reviews if activity else 0

    progress = await roadmap_service.load_progress(session, user.id)
    deadline = stats.rank_shaky_deadline
    out = {
        "mastered_count": mastered,
        "custom_mastered_count": custom,
        "rank": {
            "current": stats.current_rank, "highest": stats.highest_rank, "by_words": rank.rank_for(mastered),
            **rank.progress(stats.current_rank, mastered),
            "shaky": deadline is not None, "shaky_since": stats.rank_shaky_since, "shaky_deadline": deadline,
            # tính theo giờ server để client đếm ngược đúng cả khi giờ máy lệch
            "shaky_seconds_left": max(int((deadline - now).total_seconds()), 0) if deadline else None,
            "words_to_recover": max(rank.threshold(stats.current_rank) - mastered, 0) if deadline else 0,
        },
        "streak": {"current": stats_service.effective_streak(stats, today), "best": stats.streak_best, "last_date": stats.streak_last_date, "week": week},
        "spins": {"normal": stats.spins_normal, "special": stats.spins_special,
                  "progress": spins.next_spin_progress(mastered, stats.max_spin_milestone)},
        "today": {
            "date": today,
            "new_words": activity.new_words if activity else 0, "new_words_goal": daily_goal(user.daily_minutes),
            "new_words_cap": settings.NEW_WORDS_DAILY_CAP,
            "reviews_done": reviewed, "reviews_total": reviewed + due_now, "due_now": due_now,
            "answers": activity.total if activity else 0, "correct": activity.correct if activity else 0,
            "daily_check": checks.get(today, DailyCheckStatus.PENDING),
            "daily_check_correct": check.correct_count if check else 0,
            "daily_check_total": check.total if check else 0,
        },
        "position": roadmap_service.current_position(st, progress),
        "passport": roadmap_service.passport(st, progress),
    }
    await session.commit()
    return out
