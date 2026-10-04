"""
Seed lộ trình mẫu dev (seeds/seed_dev_roadmap.py): A1, A2 mỗi cấp 10 chặng × 2 bài × 15 mục; dùng lại 60 mục DEV_SAMPLE
không tạo trùng; mọi câu ví dụ chứa đúng mục từ (có câu mức 4); A2 có cụm từ; chạy lại an toàn; purge xóa sạch bài
và tiến độ Học Viện liên quan.
"""

from sqlalchemy import func, select

from app.models import (
    BossAttempt,
    Entry,
    EntryType,
    Level,
    ProgressStatus,
    Topic,
    Unit,
    UnitEntry,
    UserLevelProgress,
    UserTopicProgress,
    UserUnitProgress,
)
from app.services import question_builder
from seeds import dev_roadmap_words
from seeds.purge_dev_entries import purge
from seeds.seed_dev_entries import DEV_TAG
from seeds.seed_dev_roadmap import roadmap_plan, seed
from tests.factories import make_user


async def _count(db, model, *where):
    return await db.scalar(select(func.count()).select_from(model).where(*where))


def test_plan_has_real_content():
    plan = roadmap_plan()
    headwords = []
    for code, topics in plan.items():
        assert len(topics) == 10, code
        for title, (unit_titles, rows) in topics.items():
            assert len(unit_titles) == 2 and len(rows) == 30, (code, title)
            for row in rows:
                headword, pos, ipa, meaning, example = row[:5]
                assert pos and ipa.startswith("/") and meaning and example, headword
                assert question_builder.blank_sentence(example, headword), f"Câu ví dụ thiếu '{headword}': {example}"
                headwords.append(headword.lower())
    assert len(headwords) == 600 and len(set(headwords)) == 600  # không trùng
    a2_phrases = [r for _, rows in dev_roadmap_words.A2.values() for r in rows if len(r) > 5]
    assert len(a2_phrases) >= 30 and any(r[5] == "pv" for r in a2_phrases) and any(r[5] == "col" for r in a2_phrases)


async def test_seed_creates_roadmap_and_is_idempotent(db_session):
    first = await seed(db_session)
    assert (first.entries_created, first.entries_updated) == (540, 60)  # 60 mục A1 cũ được dùng lại
    second = await seed(db_session)
    assert (second.entries_created, second.entries_updated) == (0, 600)

    assert await _count(db_session, Entry, Entry.exam_tags.contains([DEV_TAG])) == 600
    assert await _count(db_session, Unit) == 40 and await _count(db_session, UnitEntry) == 600
    for code in ("A1", "A2"):
        level = await db_session.scalar(select(Level).where(Level.code == code))
        topics = list(await db_session.scalars(select(Topic).where(Topic.level_id == level.id).order_by(Topic.order)))
        assert len(topics) == 10
        for topic in topics:
            units = list(await db_session.scalars(select(Unit).where(Unit.topic_id == topic.id).order_by(Unit.position)))
            assert [u.position for u in units] == [1, 2]
            for unit in units:
                assert await _count(db_session, UnitEntry, UnitEntry.unit_id == unit.id) == 15
    hello = await db_session.scalar(select(Entry).where(Entry.headword == "hello"))
    assert hello.definition_en  # mục cũ giữ định nghĩa tiếng Anh
    get_up = await db_session.scalar(select(Entry).where(Entry.headword == "get up"))
    assert get_up.entry_type == EntryType.PHRASAL_VERB and get_up.cefr == "A2"


async def test_purge_removes_units_and_academy_progress(db_session):
    await seed(db_session)
    user = await make_user(db_session)
    a1 = await db_session.scalar(select(Level).where(Level.code == "A1"))
    topic = await db_session.scalar(select(Topic).where(Topic.level_id == a1.id, Topic.order == 1))
    unit = await db_session.scalar(select(Unit).where(Unit.topic_id == topic.id, Unit.position == 1))
    db_session.add_all([
        UserLevelProgress(user_id=user.id, level_id=a1.id, status=ProgressStatus.UNLOCKED),
        UserTopicProgress(user_id=user.id, topic_id=topic.id, status=ProgressStatus.UNLOCKED),
        UserUnitProgress(user_id=user.id, unit_id=unit.id, status=ProgressStatus.UNLOCKED),
    ])
    await db_session.flush()

    result = await purge(db_session)
    assert (result.entries, result.units, result.topic_progress, result.level_progress) == (600, 40, 1, 1)
    for model in (Unit, UnitEntry, UserUnitProgress, UserTopicProgress, UserLevelProgress, BossAttempt):
        assert await _count(db_session, model) == 0, model.__name__
    assert await _count(db_session, Topic) == 20  # địa danh giữ nguyên
    again = await purge(db_session)
    assert (again.entries, again.units) == (0, 0)
