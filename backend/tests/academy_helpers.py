"""
Tiện ích cho test Học Viện: nạp lộ trình mẫu, trả lời một phiên với tỉ lệ đúng mong muốn (đọc đáp án từ server trong test),
đẩy nhanh người học tới Trận Boss.
"""

import math
from datetime import datetime

from sqlalchemy import select

from app.models import Level, ProgressStatus, StudySession, Topic, Unit, User, UserLevelProgress
from app.schemas.course import AnswerIn
from app.services import roadmap_service, study_service
from seeds.seed_dev_roadmap import seed as seed_roadmap


async def seeded(db) -> None:
    await seed_roadmap(db)


async def level(db, code: str) -> Level:
    return await db.scalar(select(Level).where(Level.code == code))


async def topics(db, code: str) -> list[Topic]:
    lv = await level(db, code)
    return list(await db.scalars(select(Topic).where(Topic.level_id == lv.id).order_by(Topic.order)))


async def units(db, topic: Topic) -> list[Unit]:
    return list(await db.scalars(select(Unit).where(Unit.topic_id == topic.id).order_by(Unit.position)))


async def keys_of(db, session_id) -> list[dict]:
    study = await db.scalar(select(StudySession).where(StudySession.id == session_id).execution_options(populate_existing=True))
    return study.questions


async def answer(db, user: User, out: dict, correct: int | None = None, wrong_ids: set[int] | None = None) -> dict:
    """Nộp cả phiên: `correct` câu đầu đúng (mặc định tất cả), hoặc sai đúng các câu hỏi về `wrong_ids` (entry id)."""
    keys = await keys_of(db, out["id"])
    correct = len(keys) if correct is None else correct
    answers = []
    for i, key in enumerate(keys):
        right = (key["entry_id"] not in wrong_ids) if wrong_ids is not None else i < correct
        answers.append(AnswerIn(question_id=key["id"], answer=key["answer"] if right else "sai-hoan-toan"))
    return await study_service.submit_answers(db, user, out["id"], answers)


def enough(total: int, rate: float) -> int:
    return math.ceil(total * rate - 1e-9)


async def fast_forward_to_boss(db, user: User, code: str, now: datetime) -> None:
    """Đánh dấu xong mọi bài và chặng của cấp (bỏ qua học thật) để test Boss."""
    st = await roadmap_service.load_structure(db)
    await roadmap_service.ensure_initialized(db, user, now, st)
    lv = await level(db, code)
    await roadmap_service.raise_status(db, UserLevelProgress, user.id, ProgressStatus.UNLOCKED, now, level_id=lv.id)
    for topic in st.topics[lv.id]:
        for unit in st.units[topic.id]:
            await roadmap_service.complete_unit(db, user, st, unit, now)
        await roadmap_service.complete_topic(db, user, st, topic, now)
    await db.flush()
