"""
Bảng xếp hạng (GET /leaderboard?board=weekly|alltime&limit=).

- weekly: số mục từ HỆ THỐNG mà người đó đạt "đã thuộc" LẦN ĐẦU TIÊN trong tuần hiện tại và vẫn đang thuộc
  (`user_entry_progress.status = mastered` và `first_mastered_at` trong tuần). Tuần ISO theo giờ LEADERBOARD_TIMEZONE
  (Asia/Ho_Chi_Minh), từ thứ Hai 00:00 tới thứ Hai tuần sau 00:00 (không tính mốc cuối). Từ tự tạo KHÔNG tính.
  Từ quên rồi thuộc lại KHÔNG được cộng điểm tuần lần nữa (`first_mastered_at` không đổi khi thuộc lại; `mastered_at`
  là lần thuộc gần nhất, không dùng ở đây).
- alltime: `users.mastered_count` (bộ đếm chỉ gồm từ hệ thống).
- Chỉ người dùng đang hoạt động, đã xong onboarding, bật `show_on_leaderboard`, điểm > 0 xuất hiện trong danh sách.
- Hạng kiểu thi đấu: bằng điểm thì cùng hạng (1, 1, 3); trong cùng điểm sắp theo username.
- `my_entry`: hạng của chính mình = 1 + số người HIỆN trên bảng có điểm cao hơn mình (đúng cả khi ngoài top hoặc đã tắt hiện
  trên bảng); điểm 0 → hạng null.
- Danh sách top (dùng chung cho mọi người) lưu cache LEADERBOARD_CACHE_SECONDS giây (services/cache.py: Redis, dự phòng
  trong bộ nhớ). `my_entry` luôn tính lại. Tier (rank Tân Binh…) hiển thị qua `rank.effective` (chỉ đọc).
- Đồng hồ: `seconds_left` tới hết tuần tính ở server từ clock.now().
"""

import uuid
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from redis.asyncio import Redis
from sqlalchemy import Select, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Entry, EntryState, User, UserEntryProgress, UserStats
from app.services import cache, rank

BOARDS = ("weekly", "alltime")


def week_bounds(now: datetime) -> tuple[datetime, datetime]:
    """[thứ Hai 00:00, thứ Hai tuần sau 00:00) của tuần ISO chứa `now`, theo giờ LEADERBOARD_TIMEZONE. Hàm thuần."""
    zone = ZoneInfo(settings.LEADERBOARD_TIMEZONE)
    local = now.astimezone(zone)
    monday = local.date() - timedelta(days=local.isoweekday() - 1)
    start = datetime.combine(monday, time.min, tzinfo=zone)
    return start, datetime.combine(monday + timedelta(days=7), time.min, tzinfo=zone)


def _eligible():
    return and_(User.is_active.is_(True), User.onboarding_completed_at.is_not(None))


def _scores(board: str, start: datetime | None, end: datetime | None) -> Select:
    """(user_id, score) của mọi người đủ điều kiện có điểm > 0 (chưa lọc show_on_leaderboard)."""
    if board == "alltime":
        return select(User.id.label("user_id"), User.mastered_count.label("score")).where(_eligible(), User.mastered_count > 0)
    return (
        select(UserEntryProgress.user_id.label("user_id"), func.count().label("score"))
        .join(Entry, Entry.id == UserEntryProgress.entry_id)
        .join(User, User.id == UserEntryProgress.user_id)
        .where(_eligible(), UserEntryProgress.status == EntryState.MASTERED, Entry.system_approved(),
               UserEntryProgress.first_mastered_at >= start, UserEntryProgress.first_mastered_at < end)
        .group_by(UserEntryProgress.user_id)
    )


async def _top(session: AsyncSession, board: str, start, end, limit: int, now: datetime) -> list[dict]:
    scores = _scores(board, start, end).subquery()
    rows = (await session.execute(
        select(User, scores.c.score, UserStats.current_rank, UserStats.rank_shaky_deadline)
        .join(scores, scores.c.user_id == User.id)
        .outerjoin(UserStats, UserStats.user_id == User.id)
        .where(User.show_on_leaderboard.is_(True))
        .order_by(scores.c.score.desc(), User.username)
        .limit(limit)
    )).all()
    out, last_score, last_rank = [], None, 0
    for i, (user, score, current, deadline) in enumerate(rows, start=1):
        if score != last_score:
            last_score, last_rank = score, i
        tier = rank.effective(current or "tan_binh", deadline, user.mastered_count or 0, now)
        out.append({"rank": last_rank, "display_name": user.display_name, "username": user.username,
                    "avatar_mascot_id": user.avatar_mascot_id, "tier": tier, "score": int(score)})
    return out


async def _my_entry(session: AsyncSession, user_id: uuid.UUID, board: str, start, end) -> dict:
    scores = _scores(board, start, end).subquery()
    mine = await session.scalar(select(scores.c.score).where(scores.c.user_id == user_id)) or 0
    hidden = not await session.scalar(select(User.show_on_leaderboard).where(User.id == user_id))
    if not mine:
        return {"rank": None, "score": 0, "hidden": hidden}
    above = await session.scalar(
        select(func.count()).select_from(scores).join(User, User.id == scores.c.user_id)
        .where(User.show_on_leaderboard.is_(True), scores.c.score > mine, User.id != user_id)
    ) or 0
    return {"rank": above + 1, "score": int(mine), "hidden": hidden}


async def get_leaderboard(session: AsyncSession, redis: Redis | None, user: User, board: str, limit: int, now: datetime) -> dict:
    start, end = week_bounds(now) if board == "weekly" else (None, None)
    key = f"lb:{board}:{start.date().isoformat() if start else 'all'}:{limit}"
    entries = await cache.get_or_compute(redis, key, settings.LEADERBOARD_CACHE_SECONDS,
                                         lambda: _top(session, board, start, end, limit, now))
    return {
        "board": board,
        "week_start": start,
        "week_end": end,
        "seconds_left": max(int((end - now).total_seconds()), 0) if end else None,
        "entries": entries,
        "my_entry": await _my_entry(session, user.id, board, start, end),
    }
