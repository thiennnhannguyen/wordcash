"""
Bước 06 (chia bài): số bài 4–5 theo số mục đã duyệt (ưu tiên cỡ gần 18), mỗi bài 16–20 mục, chỉ dùng mục approved, cụm từ
cố định rải đều và đứng đầu bài, mục cùng nhóm nhỏ gom vào cùng bài, tên bài do AI đề xuất ở trạng thái draft, giữ tên đã
duyệt khi bài không đổi; check_units bắt mục thuộc 2 bài, bài sai cỡ, mục chưa duyệt.
"""

import pytest

from data_pipeline import config
from data_pipeline.lib import units
from data_pipeline.lib.cache import DiskCache
from data_pipeline.lib.ai import Usage
from data_pipeline.lib.schemas import ContentEntry, ContentUnit, TopicFile
from tests.pipeline import fake_ai


def topic_with(n, phrases=8, status="approved", groups=("kitchen", "meals", "fruit", "drinks")):
    entries = []
    for i in range(n):
        phrase = i < phrases
        head = f"good food {chr(97 + i)}" if phrase else f"word{chr(97 + i // 26)}{chr(97 + i % 26)}"
        entries.append(ContentEntry(content_key=f"a1.food.{head.replace(' ', '_')}.{'phrase' if phrase else 'noun'}", headword=head,
                                    pos="phrase" if phrase else "noun", status=status, commonness=5 - i % 5,
                                    subgroup=groups[i % len(groups)], rank_in_topic=i + 1))
    return TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn", landmark_key="a1_pho_co", entries=entries)


@pytest.mark.parametrize("n,k", [(64, 4), (70, 4), (72, 4), (80, 5), (90, 5), (100, 5)])
def test_unit_count(n, k):
    assert units.unit_count(n) == k
    assert config.UNIT_SIZE_MIN <= n / k <= config.UNIT_SIZE_MAX


@pytest.mark.parametrize("n", [63, 101, 10])
def test_unit_count_impossible(n):
    with pytest.raises(units.UnitError):
        units.unit_count(n)


def test_split_sizes_phrases_and_groups():
    t = topic_with(80)
    groups = units.split(t.entries, "food")
    assert len(groups) == 5 and all(16 <= len(g) <= 20 for g in groups)
    keys = [e.content_key for g in groups for e in g]
    assert sorted(keys) == sorted(e.content_key for e in t.entries)  # mỗi mục đúng một lần
    phrase_counts = [sum(e.pos == "phrase" for e in g) for g in groups]
    assert max(phrase_counts) - min(phrase_counts) <= 1  # rải đều
    for g in groups:
        assert sum(e.pos == "phrase" for e in g) <= config.PHRASES_PER_UNIT_MAX
        assert g[0].pos != "phrase"  # cụm từ rải trong bài, không dồn lên đầu
    words = [e for g in groups for e in g if e.pos != "phrase"]
    seen, last = set(), None
    for e in words:  # mỗi nhóm nhỏ là một đoạn liền
        if e.subgroup != last:
            assert e.subgroup not in seen
            seen.add(e.subgroup)
            last = e.subgroup


def test_interleave_spreads_phrases():
    out = units.interleave(list("abcdefghijkl"), ["P1", "P2", "P3"])
    assert [i for i, x in enumerate(out) if x.startswith("P")] == [2, 7, 12] and len(out) == 15
    assert units.interleave(["a", "b"], []) == ["a", "b"]


def test_phrase_cap_per_unit():
    t = topic_with(80, phrases=16)  # 5 bài × 3 = 15 < 16
    with pytest.raises(units.UnitError, match="cụm từ"):
        units.split(t.entries, "food")
    groups = units.split(t.entries, "greetings")  # chào hỏi: tối đa 8 cụm mỗi bài
    assert max(sum(e.pos == "phrase" for e in g) for g in groups) == 4
    t = topic_with(64, phrases=4)
    keys = [e.content_key for e in t.entries]
    t.units = [ContentUnit(content_key=f"a1.food.u{i + 1}", position=i + 1, title="x", entries=keys[i * 16:(i + 1) * 16])
               for i in range(4)]
    assert any("4 cụm từ (tối đa 3)" in err for err in units.check_units(t))


def test_build_uses_only_approved_and_titles_draft(tmp_path):
    t = topic_with(85)
    for e in t.entries[80:]:
        e.status = "draft"
    t.entries[0].status = "rejected"
    client = fake_ai.client()
    built = units.build_topic(t, client, DiskCache("units", tmp_path), Usage())
    in_units = {k for u in built.units for k in u.entries}
    assert len(in_units) == 79 and all(t.entries[i].content_key not in in_units for i in [0, *range(80, 85)])
    assert [u.title for u in built.units] == [f"Bài học số {i}" for i in range(1, len(built.units) + 1)]
    assert all(u.title_status == "draft" and u.branch == "foundation" for u in built.units)
    assert built.units[0].content_key == "a1.food.u1" and units.check_units(built) == []
    # duyệt tên bài 1 rồi chia lại (không đổi gì) → giữ tên + trạng thái; không gọi AI lại (cache)
    built.units[0].title, built.units[0].title_status = "Ở quán ăn", "approved"
    calls = len(client.calls)
    again = units.build_topic(built, client, DiskCache("units", tmp_path), Usage())
    assert again.units[0].title == "Ở quán ăn" and again.units[0].title_status == "approved" and len(client.calls) == calls


def test_check_units_errors():
    t = topic_with(36, phrases=0)
    keys = [e.content_key for e in t.entries]
    t.entries[5].status = "draft"
    t.units = [ContentUnit(content_key="a1.food.u1", position=1, entries=keys[:18]),
               ContentUnit(content_key="a1.food.u2", position=2, entries=keys[17:30])]
    errors = " | ".join(units.check_units(t))
    assert "thuộc 2 bài" in errors and "a1.food.u2: 13 mục" in errors and "không phải mục đã duyệt" in errors
    assert units.check_units(TopicFile(level="A1", topic_code="x", topic_title="x", landmark_key="x")) == ["x: chưa chia bài"]


def test_run_reports_topics_that_cannot_be_split(tmp_path):
    from data_pipeline.lib import content

    root = tmp_path / "content"
    content.save_topic(topic_with(30), root)
    result = units.run("A1", fake_ai.client(), content_root=root, cache_root=tmp_path / "cache")
    assert "food" in result.errors and not result.topics
    assert content.load_topic(content.topic_path("A1", "food", root)).units == []  # không ghi
