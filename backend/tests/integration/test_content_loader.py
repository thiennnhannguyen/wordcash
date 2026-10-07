"""
Nạp nội dung vào DB (data_pipeline/lib/loader.py) trên PostgreSQL test, quy mô bài thu nhỏ (monkeypatch config):
- lần đầu thêm đủ mục approved + bài; chạy lại không đổi gì; sửa nội dung → cập nhật, content_version + 1;
- mục bị bỏ khỏi file → retired_at, KHÔNG xóa, tiến độ học giữ nguyên; approved trở lại → bỏ retired_at;
- --dry-run không ghi; kiểm tra trước khi nạp (thiếu file, tên bài chưa duyệt, còn bài DEV_SAMPLE, bài có tiến độ bị bỏ);
- dev: purge(keep_position) + nạp kho thật → người đang học dở được mở bài đầu của chặng hiện tại (ensure_initialized);
- seed_dev_roadmap bỏ qua cấp đã có nội dung thật;
- địa danh chỉ là trang trí: đổi landmark của một chặng rồi nạp lại → không mục / bài nào bị sửa hay retired, tiến độ giữ nguyên.
"""

from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select

from app.models import Entry, EntryState, ProgressStatus, Topic, Unit, UnitEntry, UserEntryProgress, UserTopicProgress, UserUnitProgress
from app.services import roadmap_service
from data_pipeline import config
from data_pipeline.lib import content, loader
from data_pipeline.lib.schemas import ContentEntry, ContentUnit, TopicFile
from seeds.purge_dev_entries import purge
from seeds.seed_dev_roadmap import seed as seed_dev_roadmap
from seeds.seed_landmarks import seed_landmarks
from tests import academy_helpers as H
from tests.factories import make_user

NOW = datetime(2026, 10, 7, 3, 0, tzinfo=UTC)
PER_TOPIC = 6  # 2 bài × 3 mục (quy mô test)


@pytest.fixture
def small(monkeypatch):
    monkeypatch.setattr(config, "UNIT_SIZE_MIN", 2)
    monkeypatch.setattr(config, "UNIT_SIZE_MAX", 4)
    monkeypatch.setattr(config, "UNITS_PER_TOPIC_MIN", 1)
    monkeypatch.setattr(config, "UNITS_PER_TOPIC_MAX", 3)


def write_level(root, extra=0, approve_titles=True):
    for t in config.topics("A1"):
        entries = [ContentEntry(content_key=f"a1.{t.code}.w{t.code[:3]}{i}.noun", headword=f"w{t.code[:3]}{i}", pos="noun",
                                ipa="/x/", meaning_vi=f"nghĩa {i}", example_en=f"I see w{t.code[:3]}{i} today.",
                                collocations=[f"a w{t.code[:3]}{i}"], status="approved", rank_in_topic=i + 1)
                   for i in range(PER_TOPIC + extra)]
        keys = [e.content_key for e in entries[:PER_TOPIC]]
        units = [ContentUnit(content_key=f"a1.{t.code}.u{p}", position=p, title=f"Bài {p}",
                             title_status="approved" if approve_titles else "draft", entries=keys[(p - 1) * 3:p * 3]) for p in (1, 2)]
        content.save_topic(TopicFile(level="A1", topic_code=t.code, topic_title=t.title,
                                     entries=entries, units=units), root)


async def load(db, root, **kw):
    return await loader.load_level(db, "A1", root=root, now=NOW, **kw)


async def count(db, model, *where):
    return await db.scalar(select(func.count()).select_from(model).where(*where))


async def test_changing_landmark_changes_nothing(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root)
    await load(db, root)
    food = await db.scalar(select(Topic).where(Topic.topic_code == "food"))
    unit = await db.scalar(select(Unit).where(Unit.content_key == "a1.food.u1"))
    user = await make_user(db)
    db.add(UserUnitProgress(user_id=user.id, unit_id=unit.id, status=ProgressStatus.UNLOCKED))
    await db.flush()
    before = {(e.content_key, e.content_version, e.retired_at) for e in await db.scalars(select(Entry))}
    food.landmark_key, food.landmark_name, food.landmark_image = "a1_cho_moi", "Chợ mới", "/img/cho-moi.png"
    await db.flush()
    diff = await load(db, root)
    assert not diff.changed and diff.retired == [] and diff.updated == {}
    assert {(e.content_key, e.content_version, e.retired_at) for e in await db.scalars(select(Entry))} == before
    assert await count(db, UserUnitProgress, UserUnitProgress.unit_id == unit.id) == 1
    assert (await db.scalar(select(Unit).where(Unit.content_key == "a1.food.u1"))).topic_id == food.id


async def test_load_twice_update_and_retire(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root)
    diff = await load(db, root)
    assert len(diff.added) == 60 and len(diff.units_added) == 20 and not diff.retired
    rice = await db.scalar(select(Entry).where(Entry.content_key == "a1.food.wfoo0.noun"))
    assert rice.example == "I see wfoo0 today." and rice.cefr == "A1" and rice.topic == "Đồ ăn" and rice.content_version == 1
    assert await count(db, UnitEntry) == 60

    again = await load(db, root)
    assert not again.changed  # chạy lại: không đổi gì

    food = content.load_topic(content.topic_path("A1", "food", root))
    food.entries[0].meaning_vi = "nghĩa mới"
    content.save_topic(food, root)
    diff = await load(db, root)
    assert diff.updated == {"a1.food.wfoo0.noun": ["meaning_vi"]}
    await db.refresh(rice)
    assert rice.meaning_vi == "nghĩa mới" and rice.content_version == 2

    # Người học đã thuộc mục 5; mục bị bỏ khỏi file (thay bằng mục mới trong bài) → retired, không xóa, tiến độ còn
    user = await make_user(db)
    gone = await db.scalar(select(Entry).where(Entry.content_key == "a1.food.wfoo5.noun"))
    db.add(UserEntryProgress(user_id=user.id, entry_id=gone.id, status=EntryState.MASTERED))
    await db.commit()
    food = content.load_topic(content.topic_path("A1", "food", root))
    food.entries = [e for e in food.entries if e.headword != "wfoo5"] + [
        ContentEntry(content_key="a1.food.wfoo9.noun", headword="wfoo9", pos="noun", meaning_vi="nghĩa 9", status="approved", rank_in_topic=9)]
    food.units[1].entries = [k if k != "a1.food.wfoo5.noun" else "a1.food.wfoo9.noun" for k in food.units[1].entries]
    content.save_topic(food, root)
    diff = await load(db, root)
    assert diff.retired == ["a1.food.wfoo5.noun"] and diff.added == ["a1.food.wfoo9.noun"] and diff.units_updated == ["a1.food.u2"]
    await db.refresh(gone)
    assert gone.retired_at == NOW and await count(db, UserEntryProgress, UserEntryProgress.entry_id == gone.id) == 1
    assert await count(db, UnitEntry, UnitEntry.entry_id == gone.id) == 0  # không còn trong bài nào: không dạy mới

    # Duyệt lại (đưa vào file, approved) → dùng lại
    food.entries.append(ContentEntry(content_key="a1.food.wfoo5.noun", headword="wfoo5", pos="noun", ipa="/x/", meaning_vi="nghĩa 5",
                                     example_en="I see wfoo5 today.", collocations=["a wfoo5"], status="approved", rank_in_topic=5))
    content.save_topic(food, root)
    diff = await load(db, root)
    assert diff.unretired == ["a1.food.wfoo5.noun"]


async def test_dry_run_writes_nothing(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root)
    diff = await load(db, root, dry_run=True)
    assert len(diff.added) == 60 and diff.dry_run and "+ a1.food.wfoo0.noun" in diff.table()
    assert await count(db, Entry, Entry.content_key.is_not(None)) == 0 and await count(db, Unit, Unit.content_key.is_not(None)) == 0


async def test_drafts_never_loaded(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root, extra=2)
    food = content.load_topic(content.topic_path("A1", "food", root))
    food.entries[6].status, food.entries[7].status = "draft", "rejected"
    content.save_topic(food, root)
    await load(db, root)
    keys = set(await db.scalars(select(Entry.content_key).where(Entry.content_key.like("a1.food.%"))))
    assert "a1.food.wfoo6.noun" not in keys and "a1.food.wfoo7.noun" not in keys


async def test_prechecks(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root, approve_titles=False)
    content.topic_path("A1", "home", root).unlink()
    with pytest.raises(loader.LoadError) as err:
        await load(db, root)
    text = " | ".join(err.value.problems)
    assert "Thiếu file content/a1/home.json" in text and "tên bài chưa duyệt" in text
    write_level(root)
    await H.seeded(db)  # lộ trình mẫu DEV_SAMPLE trong A1
    with pytest.raises(loader.LoadError) as err:
        await load(db, root)
    assert "bài mẫu DEV_SAMPLE" in " | ".join(err.value.problems)


async def test_unit_with_progress_is_never_removed(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root)
    await load(db, root)
    user = await make_user(db)
    u2 = await db.scalar(select(Unit).where(Unit.content_key == "a1.food.u2"))
    db.add(UserUnitProgress(user_id=user.id, unit_id=u2.id, status=ProgressStatus.UNLOCKED, unlocked_at=NOW))
    await db.commit()
    food = content.load_topic(content.topic_path("A1", "food", root))
    food.units = [ContentUnit(content_key="a1.food.u1", position=1, title="Bài 1", title_status="approved",
                              entries=[e.content_key for e in food.entries[:4]])]
    food.entries = food.entries[:4]
    content.save_topic(food, root)
    with pytest.raises(loader.LoadError) as err:
        await load(db, root)
    assert "đã có người học" in err.value.problems[0]


async def test_dev_refresh_puts_learner_at_first_unit_of_current_topic(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await H.seeded(db)
    user = await make_user(db)
    await roadmap_service.ensure_initialized(db, user, NOW)
    st = await roadmap_service.load_structure(db)
    topic1 = st.topics[st.levels[0].id][0]
    await roadmap_service.complete_unit(db, user, st, st.units[topic1.id][0], NOW)  # đang ở bài 2 chặng 1
    await db.commit()

    await purge(db, keep_position=True)
    write_level(root)
    await load(db, root)
    tp = await db.scalar(select(UserTopicProgress).where(UserTopicProgress.user_id == user.id, UserTopicProgress.topic_id == topic1.id))
    assert tp is not None and tp.status == ProgressStatus.UNLOCKED  # giữ chặng hiện tại
    assert await count(db, UserUnitProgress, UserUnitProgress.user_id == user.id) == 0  # bài mẫu đã bị xóa

    await roadmap_service.ensure_initialized(db, user, NOW)
    await db.commit()
    first = await db.scalar(select(Unit).where(Unit.topic_id == topic1.id, Unit.position == 1))
    rows = list(await db.scalars(select(UserUnitProgress).where(UserUnitProgress.user_id == user.id)))
    assert first.content_key == "a1.greetings.u1" and [(r.unit_id, r.status) for r in rows] == [(first.id, ProgressStatus.UNLOCKED)]
    roadmap = await roadmap_service.get_roadmap(db, user, NOW)  # không lỗi
    assert roadmap["levels"][0]["topics"][0]["units"][0]["status"] == "unlocked"
    await roadmap_service.ensure_initialized(db, user, NOW)  # chạy lại: không đổi gì
    assert await count(db, UserUnitProgress, UserUnitProgress.user_id == user.id) == 1


async def test_seed_dev_roadmap_skips_levels_with_real_content(db_session, tmp_path, small):
    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root)
    await load(db, root)
    result = await seed_dev_roadmap(db)
    assert result.skipped_levels == ["A1"]
    a1 = await db.scalar(select(Topic).where(Topic.landmark_key == "a1_pho_co"))
    assert await count(db, Unit, Unit.topic_id == a1.id, Unit.content_key.is_(None)) == 0  # không thêm bài mẫu vào A1
    assert await count(db, Entry, Entry.exam_tags.contains(["DEV_SAMPLE"]), Entry.cefr == "A1") == 0
    assert result.units > 0  # A2 vẫn có bài mẫu


async def test_retired_entries_not_offered_for_new_learning(db_session, tmp_path, small):
    from app.services import course_service

    db, root = db_session, tmp_path / "content"
    await seed_landmarks(db)
    write_level(root, extra=1)  # wfoo6 approved nhưng không thuộc bài nào
    await load(db, root)
    user = await make_user(db)
    assert [r["headword"] for r in await course_service.bank_search(db, user, "wfoo6")] == ["wfoo6"]
    food = content.load_topic(content.topic_path("A1", "food", root))
    food.entries = [e for e in food.entries if e.headword != "wfoo6"]
    content.save_topic(food, root)
    await load(db, root)
    assert await course_service.bank_search(db, user, "wfoo6") == []  # đã ngừng dùng: không gợi ý thêm vào khóa học
