"""
Ôn tập chung (Học Viện): mọi từ đến hạn ôn theo SRS, gồm cả từ hệ thống và từ tự tạo của chính người học (Entry.visible_to).

- `due_overview`: số từ đến hạn, số từ theo trạng thái (kèm số từ mới = mục từ trong các bài đã mở chưa học), lịch 7 ngày tới
  (theo ngày địa phương), danh sách ôn gấp (từ `forgotten` hoặc quá hạn từ 2 ngày), danh sách đến hạn và sổ từ (mọi từ
  đã học, sắp theo hạn ôn, tối đa 300).
- `start_review`: phiên ôn REVIEW_SESSION_LIMIT từ đến hạn sớm nhất, mỗi từ một câu (từ mới học dùng mức 1–2, còn lại 3–4).
  Trả lời sai chỉ đặt lại lịch SRS (luật ghi nhớ thống nhất), không làm mất "đã thuộc".
"""

import random
from datetime import datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import (
    Entry,
    EntryState,
    ProgressStatus,
    SessionKind,
    StudyMode,
    UnitEntry,
    User,
    UserEntryProgress,
    UserUnitProgress,
)
from app.services import course_service, session_engine
from app.utils.time import day_bounds, local_date


def _base(user: User):
    return (
        select(Entry, UserEntryProgress)
        .join(UserEntryProgress, and_(UserEntryProgress.entry_id == Entry.id, UserEntryProgress.user_id == user.id))
        .where(Entry.visible_to(user.id), UserEntryProgress.status != EntryState.NEW)
    )


async def due_overview(session: AsyncSession, user: User, now: datetime) -> dict:
    due_rows = list(await session.execute(_base(user).where(UserEntryProgress.due_at <= now).order_by(UserEntryProgress.due_at)))
    counts = dict((await session.execute(
        select(UserEntryProgress.status, func.count()).join(Entry, Entry.id == UserEntryProgress.entry_id)
        .where(UserEntryProgress.user_id == user.id, Entry.visible_to(user.id)).group_by(UserEntryProgress.status)
    )).all())
    today = local_date(user, now)
    schedule = []
    for offset in range(1, 8):
        day = today + timedelta(days=offset)
        start, end = day_bounds(user, day)
        n = await session.scalar(
            select(func.count()).select_from(UserEntryProgress).join(Entry, Entry.id == UserEntryProgress.entry_id)
            .where(UserEntryProgress.user_id == user.id, Entry.visible_to(user.id), UserEntryProgress.status != EntryState.NEW,
                   UserEntryProgress.due_at >= start, UserEntryProgress.due_at < end)
        )
        schedule.append({"date": day, "count": n or 0})

    def item(entry: Entry, p: UserEntryProgress) -> dict:
        return {**course_service.entry_brief(entry), "status": p.status, "due_at": p.due_at, "wrong_count": p.wrong_count,
                "lapse_count": p.lapse_count}

    urgent = [item(e, p) for e, p in due_rows if p.status == EntryState.FORGOTTEN or (now - p.due_at) >= timedelta(days=2)]
    # Từ mới: mục từ trong các bài đã mở mà chưa học
    new_count = await session.scalar(
        select(func.count(func.distinct(UnitEntry.entry_id)))
        .join(UserUnitProgress, and_(UserUnitProgress.unit_id == UnitEntry.unit_id, UserUnitProgress.user_id == user.id))
        .outerjoin(UserEntryProgress, and_(UserEntryProgress.entry_id == UnitEntry.entry_id, UserEntryProgress.user_id == user.id))
        .where(UserUnitProgress.status != ProgressStatus.LOCKED,
               (UserEntryProgress.entry_id.is_(None)) | (UserEntryProgress.status == EntryState.NEW))
    ) or 0
    book = list(await session.execute(_base(user).order_by(UserEntryProgress.due_at.asc().nulls_last()).limit(300)))
    return {
        "due_count": len(due_rows),
        "status_counts": {**{s.value: counts.get(s, 0) for s in (EntryState.LEARNING, EntryState.MASTERED, EntryState.FORGOTTEN)},
                          "new": new_count},
        "schedule": schedule,
        "urgent": urgent[:20],
        "due": [item(e, p) for e, p in due_rows[:50]],
        "words": [item(e, p) for e, p in book],
    }


async def start_review(session: AsyncSession, user: User, now: datetime, limit: int | None = None,
                       rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    limit = min(limit or settings.REVIEW_SESSION_LIMIT, settings.STUDY_MAX_LIMIT)
    rows = list(await session.execute(_base(user).where(UserEntryProgress.due_at <= now).order_by(UserEntryProgress.due_at).limit(limit)))
    if not rows:
        raise AppError("NOTHING_TO_STUDY", details={"mode": "review", "reason": "empty"})
    pairs = []
    for entry, progress in rows:
        fresh = progress.correct_count < 2
        pairs.append((entry, session_engine.easy_level(entry, rng) if fresh else session_engine.strong_level(entry, rng)))
    rng.shuffle(pairs)
    pool = await session_engine.distractor_pool(session, [e for e, _ in rows])
    public, keys = session_engine.build_questions(pairs, pool, rng)
    study = await session_engine.create_session(session, user, kind=SessionKind.REVIEW, mode=StudyMode.REVIEW, keys=keys, now=now)
    await session.commit()
    return {"id": study.id, "kind": study.kind, "mode": study.mode, "cards": [], "questions": public, "total": len(public),
            "expires_at": study.expires_at}
