"""
Hồ sơ người chơi: GET /me/profile (của tôi) và GET /users/{username}/profile (người khác).

- Phần CÔNG KHAI (`public_part`, dùng cho cả hai): tên hiển thị, username, avatar, rank, số từ đã thuộc (chỉ từ hệ thống),
  streak hiện tại (`stats_service.effective_streak`) và cao nhất, cấp hiện tại, số linh vật sở hữu, tủ trưng bày.
  Hồ sơ người khác đọc thuần (không khóa dòng, không ghi DB của người đó); rank qua `rank.effective`.
- Phần RIÊNG (chỉ /me/profile): tiến độ từng cấp (đã thuộc / tổng mục dạy được), lịch hoạt động 12 tuần (user_daily_activity,
  ngày theo múi giờ người dùng), tỉ lệ đúng Cửa Ải 30 ngày, 5 từ hay quên nhất (lapse_count), số khóa học đang học,
  custom_mastered_count, cài đặt bảng xếp hạng, lung lay, ngày đạt lần đầu rank hiện tại (sổ spin_grants, lý do rank_up).
  Email, khóa học, từ hay quên của người khác KHÔNG BAO GIỜ được trả (schema PublicProfileOut).
- Tủ trưng bày: `users.showcase_mascot_ids` (đã kiểm tra sở hữu khi lưu); NULL = 3 linh vật hiếm nhất đang sở hữu
  (độ hiếm giảm dần, rồi số thứ tự tăng dần).
- Người dùng chưa xong onboarding hoặc bị khóa: coi như không tồn tại (USER_NOT_FOUND).
"""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models import (
    DailyCheck,
    DailyCheckStatus,
    Entry,
    EntryState,
    Level,
    Mascot,
    MascotRarity,
    ProgressStatus,
    SpinGrant,
    SpinReason,
    User,
    UserCourse,
    UserDailyActivity,
    UserEntryProgress,
    UserLevelProgress,
    UserMascot,
    UserStats,
)
from app.services import rank, roadmap_service, stats_service
from app.utils.time import local_date

ACTIVITY_DAYS = 84  # 12 tuần
ACCURACY_DAYS = 30
FORGOTTEN_LIMIT = 5
SHOWCASE_SIZE = 3
RARITY_WEIGHT = {MascotRarity.LEGENDARY: 4, MascotRarity.EPIC: 3, MascotRarity.RARE: 2, MascotRarity.COMMON: 1}


async def find_public_user(session: AsyncSession, username: str) -> User:
    user = await session.scalar(select(User).where(
        User.username == username.strip().lower(), User.is_active.is_(True), User.onboarding_completed_at.is_not(None)
    ))
    if user is None:
        raise AppError("USER_NOT_FOUND")
    return user


async def current_level(session: AsyncSession, user_id: uuid.UUID) -> str | None:
    """Cấp đã mở cao nhất (chỉ đọc). Người chưa có lộ trình → None."""
    return await session.scalar(
        select(Level.code).join(UserLevelProgress, UserLevelProgress.level_id == Level.id)
        .where(UserLevelProgress.user_id == user_id, UserLevelProgress.status.in_([ProgressStatus.UNLOCKED, ProgressStatus.COMPLETED]))
        .order_by(Level.order.desc()).limit(1)
    )


async def showcase(session: AsyncSession, user: User) -> list[dict]:
    rows = (await session.execute(
        select(UserMascot.mascot_id, UserMascot.copies, Mascot.rarity).join(Mascot, Mascot.id == UserMascot.mascot_id)
        .where(UserMascot.user_id == user.id)
    )).all()
    owned = {r.mascot_id: r for r in rows}
    if user.showcase_mascot_ids is not None:
        picked = [owned[i] for i in user.showcase_mascot_ids if i in owned]
    else:
        picked = sorted(rows, key=lambda r: (-RARITY_WEIGHT[r.rarity], r.mascot_id))[:SHOWCASE_SIZE]
    return [{"mascot_id": r.mascot_id, "copies": r.copies} for r in picked]


async def public_part(session: AsyncSession, user: User, stats: UserStats | None, now: datetime, *, tier: str | None = None) -> dict:
    mastered = user.mastered_count or 0
    if tier is None:
        tier = rank.effective(stats.current_rank, stats.rank_shaky_deadline, mastered, now) if stats else rank.rank_for(mastered)
    return {
        "display_name": user.display_name,
        "username": user.username,
        "avatar_mascot_id": user.avatar_mascot_id,
        "rank": tier,
        "mastered_count": mastered,
        "streak_current": stats_service.effective_streak(stats, local_date(user, now)),
        "streak_best": stats.streak_best if stats else 0,
        "current_level": await current_level(session, user.id),
        "mascots_owned": await session.scalar(select(func.count()).select_from(UserMascot).where(UserMascot.user_id == user.id)) or 0,
        "showcase": await showcase(session, user),
    }


async def get_public_profile(session: AsyncSession, username: str, now: datetime) -> dict:
    user = await find_public_user(session, username)
    stats = await session.get(UserStats, user.id)
    return await public_part(session, user, stats, now)


async def _levels(session: AsyncSession, user: User) -> list[dict]:
    levels = list(await session.scalars(select(Level).order_by(Level.order)))
    totals = dict((await session.execute(
        select(Entry.cefr, func.count()).where(Entry.teachable()).group_by(Entry.cefr)
    )).all())
    mastered = dict((await session.execute(
        select(Entry.cefr, func.count()).select_from(UserEntryProgress).join(Entry, Entry.id == UserEntryProgress.entry_id)
        .where(UserEntryProgress.user_id == user.id, UserEntryProgress.status == EntryState.MASTERED, Entry.system_approved())
        .group_by(Entry.cefr)
    )).all())
    unlocked = set(await session.scalars(
        select(UserLevelProgress.level_id).where(UserLevelProgress.user_id == user.id,
                                                 UserLevelProgress.status.in_([ProgressStatus.UNLOCKED, ProgressStatus.COMPLETED]))
    ))
    return [{"code": lv.code, "name": lv.name, "mastered": mastered.get(lv.code, 0), "total": totals.get(lv.code, 0),
             "unlocked": lv.id in unlocked} for lv in levels]


async def _activity(session: AsyncSession, user: User, now: datetime) -> list[dict]:
    today = local_date(user, now)
    start = today - timedelta(days=ACTIVITY_DAYS - 1)
    rows = {r.local_date: r for r in await session.scalars(
        select(UserDailyActivity).where(UserDailyActivity.user_id == user.id, UserDailyActivity.local_date.between(start, today))
    )}
    out = []
    for i in range(ACTIVITY_DAYS):
        day = start + timedelta(days=i)
        r = rows.get(day)
        out.append({"date": day, "new_words": r.new_words if r else 0, "reviews": r.reviews if r else 0, "answers": r.total if r else 0})
    return out


async def _daily_check_accuracy(session: AsyncSession, user: User, now: datetime) -> dict:
    today = local_date(user, now)
    correct, total = (await session.execute(
        select(func.coalesce(func.sum(DailyCheck.correct_count), 0), func.coalesce(func.sum(DailyCheck.total), 0))
        .where(DailyCheck.user_id == user.id, DailyCheck.local_date.between(today - timedelta(days=ACCURACY_DAYS - 1), today),
               DailyCheck.status.in_([DailyCheckStatus.PASSED, DailyCheckStatus.PARTIAL]))
    )).one()
    return {"days": ACCURACY_DAYS, "correct": int(correct), "total": int(total), "rate": round(correct / total, 4) if total else None}


async def _most_forgotten(session: AsyncSession, user: User) -> list[dict]:
    rows = (await session.execute(
        select(Entry.id, Entry.headword, Entry.meaning_vi, UserEntryProgress.lapse_count)
        .join(UserEntryProgress, UserEntryProgress.entry_id == Entry.id)
        .where(UserEntryProgress.user_id == user.id, UserEntryProgress.lapse_count > 0, Entry.visible_to(user.id))
        .order_by(UserEntryProgress.lapse_count.desc(), UserEntryProgress.last_seen_at.desc().nulls_last(), Entry.id)
        .limit(FORGOTTEN_LIMIT)
    )).all()
    return [{"entry_id": r.id, "headword": r.headword, "meaning_vi": r.meaning_vi, "lapse_count": r.lapse_count} for r in rows]


async def get_my_profile(session: AsyncSession, user: User, now: datetime) -> dict:
    # Thứ tự khóa thống nhất: khởi tạo lộ trình (advisory) → users → user_stats (giống /me/stats)
    await roadmap_service.ensure_initialized(session, user, now)
    stats, _ = await stats_service.refresh(session, user, now, local_date(user, now))
    mastered = await stats_service.mastered_count(session, user.id)
    await session.refresh(user, ["mastered_count", "custom_mastered_count"])
    deadline = stats.rank_shaky_deadline
    first_reached = await session.scalar(select(SpinGrant.created_at).where(
        SpinGrant.user_id == user.id, SpinGrant.reason == SpinReason.RANK_UP, SpinGrant.ref == stats.current_rank
    ))
    courses = await session.scalar(select(func.count()).select_from(UserCourse).where(
        and_(UserCourse.user_id == user.id, UserCourse.archived_at.is_(None))
    )) or 0
    out = {
        **await public_part(session, user, stats, now, tier=stats.current_rank),
        "rank_progress": rank.progress(stats.current_rank, mastered),
        "rank_shaky": deadline is not None,
        "shaky_seconds_left": max(int((deadline - now).total_seconds()), 0) if deadline else None,
        "words_to_recover": max(rank.threshold(stats.current_rank) - mastered, 0) if deadline else 0,
        "custom_mastered_count": user.custom_mastered_count or 0,
        "courses_count": courses,
        "show_on_leaderboard": user.show_on_leaderboard,
        "showcase_mascot_ids": user.showcase_mascot_ids,
        "levels": await _levels(session, user),
        "activity": await _activity(session, user, now),
        "daily_check_accuracy": await _daily_check_accuracy(session, user, now),
        "most_forgotten": await _most_forgotten(session, user),
        "rank_first_reached_at": first_reached,
        "created_at": user.created_at,
    }
    await session.commit()
    return out
