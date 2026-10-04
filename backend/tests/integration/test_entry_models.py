"""
Kiểm thử ràng buộc dữ liệu của kho mục từ: nguồn/chủ sở hữu, trùng từ tự tạo, bộ lọc hiển thị `Entry.visible_to`.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Entry, EntrySource, EntryStatus
from tests.factories import make_custom, make_entry, make_user


async def test_system_entry_cannot_have_owner(db_session):
    owner = await make_user(db_session)
    db_session.add(Entry(headword="bug", meaning_vi="lỗi", source=EntrySource.SYSTEM, owner_user_id=owner.id))
    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_custom_entry_requires_owner(db_session):
    db_session.add(Entry(headword="bug", meaning_vi="lỗi", source=EntrySource.USER))
    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_custom_headword_unique_per_owner_case_insensitive(db_session):
    an, binh = await make_user(db_session, "an"), await make_user(db_session, "binh")
    await make_custom(db_session, an, "Deploy", "triển khai")
    await make_custom(db_session, binh, "deploy", "triển khai")  # người khác thì được
    with pytest.raises(IntegrityError):
        await make_custom(db_session, an, "DEPLOY", "đưa lên")


async def test_visible_to_hides_drafts_and_other_users_words(db_session):
    an, binh = await make_user(db_session, "an"), await make_user(db_session, "binh")
    approved = await make_entry(db_session, "reliable", "đáng tin cậy")
    await make_entry(db_session, "draftword", "nháp", status=EntryStatus.DRAFT)
    mine = await make_custom(db_session, an, "refactor", "tái cấu trúc mã")
    await make_custom(db_session, binh, "standup", "họp đứng")

    ids = set(await db_session.scalars(select(Entry.id).where(Entry.visible_to(an.id))))
    assert ids == {approved.id, mine.id}
