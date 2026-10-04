"""
seed_mascots trên PostgreSQL thật: chạy lại vẫn 100 dòng, cập nhật trường hiển thị mà không đổi id; danh mục sai thì báo lỗi
và không ghi gì.
"""

import copy

import pytest
from sqlalchemy import func, select

from app.models import Mascot
from app.services import mascot_catalog
from seeds import seed_mascots


async def test_seed_is_idempotent_and_updates_display_fields(db_session):
    catalog = mascot_catalog.load_with_lore()
    changed = copy.deepcopy(catalog)
    changed[0]["catchphrase"] = "Câu mới"
    assert await seed_mascots.seed(db_session, changed) == 100
    assert await seed_mascots.seed(db_session, changed) == 100
    assert await db_session.scalar(select(func.count()).select_from(Mascot)) == 100
    first = await db_session.scalar(select(Mascot).where(Mascot.id == 1).execution_options(populate_existing=True))
    assert (first.code, first.name, first.catchphrase, first.is_starter) == ("001", "Bông Tím", "Câu mới", True)
    assert first.accessory == {"top": "leaf"}


async def test_seed_rejects_wrong_distribution(db_session):
    bad = copy.deepcopy(mascot_catalog.load_catalog())
    next(m for m in bad if m["region"] == "B1" and m["rarity"] == "epic")["rarity"] = "legendary"
    with pytest.raises(mascot_catalog.CatalogError, match="phân bổ B1"):
        await seed_mascots.seed(db_session, bad)
    assert await db_session.scalar(select(func.count()).select_from(Mascot).where(Mascot.region == "B1", Mascot.rarity == "legendary")) == 1
