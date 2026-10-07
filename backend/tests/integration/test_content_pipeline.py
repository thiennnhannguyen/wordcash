"""
Toàn quy trình kho từ trên bộ dữ liệu nhỏ (40 từ định dạng CEFR-J tự soạn + từ chức năng), AI giả, quy mô bài thu nhỏ:
01 nhập → 02 chọn A1 + chia chủ đề (+ cụm từ) → 03 soạn nháp → 04 kiểm tra → duyệt (giả lập người duyệt) → 06 chia bài + duyệt
tên bài → 07 nạp vào DB test. Nạp lần 2 không đổi gì; mục bị bỏ khỏi file thì retired chứ không bị xóa. Mọi file nội dung
qua kiểm tra schema (như bước CI). Chạy hai lần: AI giả gọi trực tiếp (đường provider API) và chế độ agent (gói việc emit →
output soạn sẵn → ingest).
"""

import pytest
from sqlalchemy import func, select

from app.models import Entry, Unit, UnitEntry
from data_pipeline import config
from data_pipeline.lib import agent, check, content, loader, step01, step02, step03, units, validate
from data_pipeline.lib.jsonio import read_json
from seeds.seed_landmarks import seed_landmarks
from tests.pipeline import fake_ai
from tests.pipeline.agent_driver import drive

WORDS = [w for w in fake_ai.TOPIC_OF if w not in ("happy", "old", "red", "read", "drink", "eat", "buy", "egg", "noodle", "kitchen")][:40]


@pytest.fixture
def tiny(monkeypatch):
    for name, value in {"TARGET_PER_LEVEL": 50, "TOPIC_SIZE_MIN": 4, "TOPIC_SIZE_MAX": 6, "PHRASE_RATIO": 0.2,
                        "UNIT_SIZE_MIN": 2, "UNIT_SIZE_MAX": 3, "UNITS_PER_TOPIC_MIN": 1, "UNITS_PER_TOPIC_MAX": 2}.items():
        monkeypatch.setattr(config, name, value)


async def test_full_pipeline_to_db(db_session, tmp_path, tiny):
    raw, processed, root, cache = tmp_path / "raw", tmp_path / "processed", tmp_path / "content", tmp_path / "cache"
    raw.mkdir()
    rows = ["headword,pos,CEFR"] + [f"{w},noun,A1" for w in WORDS] + ["the,article,A1", "can,modal verb,A1", "airport,noun,A2"]
    (raw / "cefrj_ver1.6.csv").write_text("\n".join(rows) + "\n", encoding="utf-8")
    client = fake_ai.client()

    report01 = step01.run(raw, processed)
    assert report01["candidates"] == 43 and report01["sources"][0]["version"] == "1.6"
    report02 = step02.run("A1", client, processed=processed, cache_root=cache)
    assert report02["excluded"] == {"function_word": 2} and report02["classified"] == 40
    sel = read_json(processed / "a1_selection.json")
    assert all(4 <= len(items) <= 6 for items in sel["topics"].values())
    assert sum(i["pos"] == "phrase" for items in sel["topics"].values() for i in items) == 10  # 1 cụm mỗi chủ đề
    report03 = step03.run("A1", client, processed=processed, content_root=root, cache_root=cache)
    assert report03["failed"] == 0 and sum(report03["written"].values()) == report02["total"]
    report04 = validate.run("A1", processed=processed, content_root=root)
    assert report04["hard_words_checked"] and report04["files"] == 10
    assert check.check_tree(root) == []  # schema mọi file (bước CI)

    # Người duyệt: duyệt hết trừ 1 mục, từ chối 1 mục; duyệt tên bài
    topics = [content.load_topic(p) for p in content.level_files("A1", root)]
    for t in topics:
        for e in t.entries:
            e.status = "approved"
        content.save_topic(t, root)
    food = content.load_topic(content.topic_path("A1", "food", root))
    food.entries[-1].status, food.entries[-1].reject_reason = "rejected", "trùng nghĩa"
    content.save_topic(food, root)
    built = units.run("A1", client, content_root=root, cache_root=cache)
    assert built.errors == {} and len(built.topics) == 10
    for t in [content.load_topic(p) for p in content.level_files("A1", root)]:
        for u in t.units:
            u.title_status = "approved"
        content.save_topic(t, root)

    await seed_landmarks(db_session)
    first = await loader.load_level(db_session, "A1", root=root)
    approved = sum(e.status == "approved" for p in content.level_files("A1", root) for e in content.load_topic(p).entries)
    assert len(first.added) == approved and first.retired == []
    db_entries = await db_session.scalar(select(func.count()).select_from(Entry).where(Entry.content_key.like("a1.%")))
    assert db_entries == approved
    assert await db_session.scalar(select(func.count()).select_from(UnitEntry)) == approved  # mỗi mục đúng một bài
    assert (await loader.load_level(db_session, "A1", root=root)).changed is False  # lần 2: không đổi gì

    # Bỏ một mục khỏi file (và khỏi bài) → retired, vẫn còn trong DB
    food = content.load_topic(content.topic_path("A1", "food", root))
    big = next(u for u in food.units if len(u.entries) == 3)  # bỏ 1 mục vẫn còn đủ cỡ bài tối thiểu (2)
    gone = next(e for e in food.entries if e.content_key in big.entries and e.pos != "phrase")
    food.entries = [e for e in food.entries if e.content_key != gone.content_key]
    for u in food.units:
        u.entries = [k for k in u.entries if k != gone.content_key]
    content.save_topic(food, root)
    diff = await loader.load_level(db_session, "A1", root=root)
    assert diff.retired == [gone.content_key]
    row = await db_session.scalar(select(Entry).where(Entry.content_key == gone.content_key))
    assert row is not None and row.retired_at is not None
    assert await db_session.scalar(select(func.count()).select_from(Unit).where(Unit.content_key.like("a1.food.%"))) == len(food.units)


async def test_full_pipeline_agent_mode(db_session, tmp_path, tiny):
    """Cùng quy trình ở chế độ agent (mặc định): mọi bước AI đi qua gói việc emit → output soạn sẵn → ingest; không gọi AI."""
    raw, processed, root, cache, work = (tmp_path / n for n in ("raw", "processed", "content", "cache", "work"))
    raw.mkdir()
    rows = ["headword,pos,CEFR"] + [f"{w},noun,A1" for w in WORDS] + ["the,article,A1"]
    (raw / "cefrj-vocabulary-profile-1.5.csv").write_text("\n".join(rows) + "\n", encoding="utf-8")
    step01.run(raw, processed)

    report02 = drive("02_select", lambda c: step02.run("A1", c, processed=processed, cache_root=cache), work)
    assert not report02.get("pending") and report02["classified"] == 40
    report03 = drive("03_enrich", lambda c: step03.run("A1", c, processed=processed, content_root=root, cache_root=cache), work)
    assert report03["failed"] == 0 and report03["pending"] == 0
    assert sum(len(content.load_topic(p).entries) for p in content.level_files("A1", root)) == report02["total"]
    assert all(e.status == "draft" for p in content.level_files("A1", root) for e in content.load_topic(p).entries)
    assert validate.run("A1", processed=processed, content_root=root)["files"] == 10 and check.check_tree(root) == []

    for t in [content.load_topic(p) for p in content.level_files("A1", root)]:
        for e in t.entries:
            e.status = "approved"
        content.save_topic(t, root)
    built = drive("06_units", lambda c: units.run("A1", c, content_root=root, cache_root=cache), work)
    assert built.errors == {}
    titled = [content.load_topic(p) for p in content.level_files("A1", root)]
    assert all(u.title.startswith("Bài học số") for t in titled for u in t.units)
    for t in titled:
        for u in t.units:
            u.title_status = "approved"
        content.save_topic(t, root)

    st = {s["step"]: s for s in agent.status(work)}
    assert all(st[k]["emitted"] == st[k]["ingested"] > 0 for k in ("02_select", "03_enrich", "06_units"))
    await seed_landmarks(db_session)
    diff = await loader.load_level(db_session, "A1", root=root)
    assert len(diff.added) == report02["total"] and (await loader.load_level(db_session, "A1", root=root)).changed is False
