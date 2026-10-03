"""
Kiểm thử seed dữ liệu mẫu dev: đủ 60 mục A1, có đủ trường, câu ví dụ chứa đúng từ (để có câu điền vào chỗ trống),
chạy lại vẫn an toàn và hiện ra ở /bank/search.
"""

from sqlalchemy import func, select

from app.models import Entry
from app.services import course_service, question_builder
from seeds.seed_dev_entries import DEV_TAG, ENTRIES, seed
from tests.factories import make_user


async def test_seed_is_idempotent_and_complete(db_session):
    assert await seed(db_session) == (60, 0)
    assert await seed(db_session) == (0, 60)
    entries = list(await db_session.scalars(select(Entry).where(Entry.exam_tags.contains([DEV_TAG]))))
    assert len(entries) == 60 and len(ENTRIES) == 10
    for e in entries:
        assert e.cefr == "A1" and e.topic and e.ipa and e.meaning_vi and e.example and e.definition_en
        assert question_builder.blank_sentence(e.example, e.headword), e.headword


async def test_seeded_words_are_searchable(db_session):
    await seed(db_session)
    user = await make_user(db_session)
    rows = await course_service.bank_search(db_session, user, "mo")
    assert {r["headword"] for r in rows} == {"money", "mother", "morning", "mountain"} and all(r["cefr"] == "A1" for r in rows)
    assert await db_session.scalar(select(func.count()).select_from(Entry)) == 60
