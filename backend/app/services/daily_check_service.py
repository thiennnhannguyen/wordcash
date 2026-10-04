"""
Cửa Ải Hôm Nay: bắt buộc ở lần đầu hoạt động trong ngày (ngày tính từ 0 giờ theo múi giờ người học).

- `get_or_create_today`: mỗi người một dòng daily_checks mỗi ngày địa phương (unique; hai request song song không tạo hai dòng).
  Có dưới DAILY_CHECK_MIN_WORDS từ HỆ THỐNG đã học → MIỄN hôm đó (`exempt`): streak giữ nguyên, không tăng.
  Ngược lại hỏi 2–5 từ hệ thống đã học (KHÔNG dùng từ tự tạo): ưu tiên từ sắp đến hạn ôn, trộn DAILY_CHECK_RANDOM_WORDS từ
  ngẫu nhiên. Chỉ câu mức 3 (gõ từ) và mức 4 (điền vào câu). Đáp án chỉ lưu ở server.
- `submit`: chấm từng câu (có thể gửi từng câu một). Sai → progress_service.forget_entry (mất "đã thuộc", trừ
  DAILY_FORGET_PENALTY, từ vào danh sách ôn gấp vì đến hạn ngay hôm sau); đúng → record_answer. Câu đã chấm thì lộ đáp án,
  phiên âm, ví dụ. Xong câu cuối: passed (đúng hết, streak +1) hoặc partial (streak giữ nguyên); chạm bội số 7 → lượt quay.
  Nộp lại trả kết quả cũ; gửi câu mới khi đã xong → DAILY_CHECK_DONE.
- `require_done`: dùng cho dependency chặn route học khi Cửa Ải hôm nay còn `pending` → DAILY_CHECK_REQUIRED (409).
"""

import random
from datetime import date, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import DailyCheck, DailyCheckStatus, Entry, EntryState, User, UserEntryProgress
from app.services import course_service, question_builder as QB, session_engine, stats_service
from app.services.progress_service import forget_entry, record_answer
from app.services.stats_service import Rewards
from app.services.streak import DayOutcome
from app.utils.time import local_date

LEARNED = (EntryState.LEARNING, EntryState.MASTERED, EntryState.FORGOTTEN)


def choose_words(candidates: list[tuple[int, datetime | None]], rng: random.Random) -> list[int]:
    """Chọn từ cho Cửa Ải (hàm thuần). `candidates`: (entry_id, due_at). Trả [] nếu được miễn.

    Số câu = min(DAILY_CHECK_MAX_WORDS, số từ đã học). Lấy từ sắp đến hạn nhất trước, chừa DAILY_CHECK_RANDOM_WORDS chỗ
    cho từ ngẫu nhiên trong phần còn lại (nếu còn).
    """
    if len(candidates) < settings.DAILY_CHECK_MIN_WORDS:
        return []
    count = min(settings.DAILY_CHECK_MAX_WORDS, len(candidates))
    ordered = sorted(candidates, key=lambda c: (c[1] is None, c[1] or datetime.max, c[0]))
    random_slots = min(settings.DAILY_CHECK_RANDOM_WORDS, len(candidates) - count) if len(candidates) > count else 0
    due_part = [c[0] for c in ordered[: count - random_slots]]
    rest = [c[0] for c in ordered[count - random_slots:]]
    return due_part + rng.sample(rest, random_slots)


def _public(row: DailyCheck) -> dict:
    """Phần gửi client: câu hỏi (không đáp án), câu đã trả lời (kèm kết quả và đáp án), trạng thái."""
    recorded = row.answers or {}
    questions = [q["public"] for q in row.questions]
    return {
        "id": row.id, "local_date": row.local_date, "status": row.status, "questions": questions, "total": row.total,
        "answered": [{"question_id": qid, **{k: v for k, v in r.items() if k != "answer"}} for qid, r in recorded.items()],
        "correct_count": row.correct_count, "completed_at": row.completed_at, "result": row.result,
    }


async def _learned_system_words(session: AsyncSession, user: User) -> list[tuple[int, datetime | None]]:
    rows = await session.execute(
        select(UserEntryProgress.entry_id, UserEntryProgress.due_at)
        .join(Entry, Entry.id == UserEntryProgress.entry_id)
        .where(UserEntryProgress.user_id == user.id, UserEntryProgress.status.in_(LEARNED), Entry.system_approved())
    )
    return [tuple(r) for r in rows]


async def get_or_create_today(session: AsyncSession, user: User, now: datetime, rng: random.Random | None = None) -> DailyCheck:
    today = local_date(user, now)
    row = await session.scalar(select(DailyCheck).where(DailyCheck.user_id == user.id, DailyCheck.local_date == today))
    if row is not None:
        return row
    rng = rng or random.Random()
    ids = choose_words(await _learned_system_words(session, user), rng)
    status = DailyCheckStatus.PENDING if ids else DailyCheckStatus.EXEMPT
    questions = []
    if ids:
        entries = {e.id: e for e in await session.scalars(select(Entry).where(Entry.id.in_(ids)))}
        pool = await session_engine.distractor_pool(session, list(entries.values()))
        pairs = [(entries[i], session_engine.strong_level(entries[i], rng)) for i in ids]
        public, keys = session_engine.build_questions(pairs, pool, rng)
        questions = [{"public": p, **k} for p, k in zip(public, keys, strict=True)]
    inserted = await session.scalar(
        pg_insert(DailyCheck)
        .values(user_id=user.id, local_date=today, status=status, questions=questions, answers={}, total=len(questions),
                completed_at=now if status == DailyCheckStatus.EXEMPT else None)
        .on_conflict_do_nothing(index_elements=["user_id", "local_date"])
        .returning(DailyCheck.id)
    )
    if inserted is not None and status == DailyCheckStatus.EXEMPT:
        change, _ = await stats_service.apply_streak(session, user, today, DayOutcome.EXEMPT, now)
        await session.execute(
            DailyCheck.__table__.update().where(DailyCheck.id == inserted)
            .values(result={"streak": change.state.current, "streak_best": change.state.best, "exempt": True})
        )
    await session.commit()
    return await session.scalar(
        select(DailyCheck).where(DailyCheck.user_id == user.id, DailyCheck.local_date == today).execution_options(populate_existing=True)
    )


async def today(session: AsyncSession, user: User, now: datetime) -> dict:
    return _public(await get_or_create_today(session, user, now))


async def require_done(session: AsyncSession, user: User, now: datetime) -> None:
    row = await get_or_create_today(session, user, now)
    if row.status == DailyCheckStatus.PENDING:
        raise AppError("DAILY_CHECK_REQUIRED", details={"local_date": row.local_date.isoformat()})


async def submit(session: AsyncSession, user: User, answers: list, now: datetime) -> dict:
    day: date = local_date(user, now)
    await get_or_create_today(session, user, now)
    row = await session.scalar(
        select(DailyCheck).where(DailyCheck.user_id == user.id, DailyCheck.local_date == day).with_for_update()
        .execution_options(populate_existing=True)
    )
    keys = {q["id"]: q for q in row.questions}
    recorded = dict(row.answers or {})
    if row.status != DailyCheckStatus.PENDING and not all(a.question_id in recorded for a in answers):
        raise AppError("DAILY_CHECK_DONE")

    entries = {e.id: e for e in await session.scalars(select(Entry).where(Entry.id.in_([k["entry_id"] for k in keys.values()])))}
    rewards = Rewards()
    results = []
    for item in answers:
        key = keys.get(item.question_id)
        if key is None:
            raise AppError("VALIDATION_ERROR", details=[{"field": "question_id", "message": "Câu hỏi không thuộc Cửa Ải hôm nay"}])
        if item.question_id not in recorded:
            entry = entries.get(key["entry_id"])
            correct = QB.check_answer(key, item.answer)
            lost = False
            if entry is not None:
                if correct:
                    outcome = await record_answer(session, user, entry, key["level"], True, now, source="daily_check")
                else:
                    outcome = await forget_entry(session, user, entry, now)
                    lost = outcome.lost_mastered
                rewards.merge(outcome.rewards)
            recorded[item.question_id] = {
                "answer": item.answer, "correct": correct, "lost_mastered": lost, "correct_answer": key["answer"],
                "entry": course_service.entry_brief(entry) if entry else None,
            }
        r = recorded[item.question_id]
        results.append({"question_id": item.question_id, **{k: v for k, v in r.items() if k != "answer"}, "your_answer": r["answer"]})

    row.answers = recorded
    finished = len(recorded) == len(keys) and row.status == DailyCheckStatus.PENDING
    if finished:
        correct = sum(1 for r in recorded.values() if r["correct"])
        all_right = correct == len(keys)
        row.status = DailyCheckStatus.PASSED if all_right else DailyCheckStatus.PARTIAL
        row.correct_count, row.completed_at = correct, now
        change, streak_rewards = await stats_service.apply_streak(session, user, day, DayOutcome.PASSED if all_right else DayOutcome.PARTIAL, now)
        rewards.merge(streak_rewards)
        stats = await stats_service.lock_stats(session, user.id)
        lost = sum(1 for r in recorded.values() if r["lost_mastered"])
        row.result = {
            "passed": all_right, "correct": correct, "total": len(keys),
            "streak": change.state.current, "streak_best": change.state.best, "streak_milestone": change.milestone,
            "streak_reset": change.reset, "lost_words": lost, "mastered_lost": lost * settings.DAILY_FORGET_PENALTY,
            "mastered_count": await stats_service.mastered_count(session, user.id),
            "rank": {"current": stats.current_rank, "shaky": stats.rank_shaky_deadline is not None,
                     "shaky_deadline": stats.rank_shaky_deadline.isoformat() if stats.rank_shaky_deadline else None},
            "rewards": rewards.as_dict(),
        }
    await session.commit()
    return {"results": results, "answered": len(recorded), "total": len(keys), "finished": row.status != DailyCheckStatus.PENDING,
            "status": row.status, "result": row.result, "rewards": rewards.as_dict()}


async def week_status(session: AsyncSession, user: User, days: list[date]) -> dict[date, DailyCheckStatus]:
    rows = await session.execute(
        select(DailyCheck.local_date, DailyCheck.status).where(DailyCheck.user_id == user.id, DailyCheck.local_date.in_(days))
    )
    return dict(rows.all())


async def learned_count(session: AsyncSession, user: User) -> int:
    return await session.scalar(
        select(func.count()).select_from(UserEntryProgress).join(Entry, Entry.id == UserEntryProgress.entry_id)
        .where(and_(UserEntryProgress.user_id == user.id, UserEntryProgress.status.in_(LEARNED), Entry.system_approved()))
    ) or 0
