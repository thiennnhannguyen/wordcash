"""
Đợt chọn mẫu duyệt (data_pipeline/lib/sample.py, lệnh `pipeline sample`):
- chọn N mục ngẫu nhiên mỗi chủ đề (hạt giống cố định → cùng mẫu, bỏ mục rejected) CỘNG mọi mục bắt buộc xem
  (ai_suggested_headword, ipa_unverified, variant_note, còn cờ ngoài cờ thông tin); ghi review_sample vào file nội dung;
  dừng khi còn mục draft chưa có câu điền từ Mức 4; đã có mẫu thì không chọn lại trừ khi --force.
"""

import pytest

from data_pipeline.lib import content, sample
from data_pipeline.lib.schemas import ContentEntry, TopicFile

CLOZE = {"cloze_en": "x", "cloze_distractors": ["a", "b", "c"]}


def topic(code, n, **kw):
    return TopicFile(level="A1", topic_code=code, topic_title=code, entries=[
        ContentEntry(content_key=f"a1.{code}.w{i:02d}.noun", headword=f"w{i}", pos="noun", **{**CLOZE, **kw}) for i in range(n)])


def load(roots, code):
    return content.load_topic(content.topic_path("A1", code, roots["content_root"]))


def save(roots, t):
    content.save_topic(t, roots["content_root"])


@pytest.fixture
def roots(tmp_path):
    root = tmp_path / "content"
    food = topic("food", 12)
    food.entries[0].status = "rejected"
    food.entries[1].flags = ["phrase"]  # cờ thông tin: không bắt buộc
    content.save_topic(food, root)
    content.save_topic(topic("home", 4), root)
    return {"content_root": root, "work_root": tmp_path / "work"}


def test_choose_per_topic_with_seed_writes_review_sample(roots):
    data = sample.choose("A1", 5, seed=42, **roots)
    assert {r["topic"]: (r["random"], r["forced"], r["sample"]) for r in data["topics"]} == {"food": (5, 0, 5), "home": (4, 0, 4)}
    assert "a1.food.w00.noun" not in data["keys"]["food"]  # mục rejected không vào mẫu
    food = load(roots, "food")
    assert sorted(e.content_key for e in food.entries if e.review_sample) == data["keys"]["food"]
    again = sample.choose("A1", 5, seed=42, force=True, **roots)
    assert again["keys"] == data["keys"] and again["seed"] == 42  # cùng hạt giống → cùng mẫu
    with pytest.raises(sample.SampleError, match="--force"):
        sample.choose("A1", 5, seed=1, **roots)


def test_choose_adds_every_must_review_entry(roots):
    food = load(roots, "food")
    by = content.by_key(food)
    by["a1.food.w02.noun"].origin_flags = ["ai_suggested_headword"]
    by["a1.food.w03.noun"].ipa_unverified = True
    by["a1.food.w04.noun"].variant_note = "Mỹ thường dùng: fall"
    by["a1.food.w05.noun"].flags = ["phrase", "example_length"]
    save(roots, food)

    data = sample.choose("A1", 3, seed=7, **roots)
    row = next(r for r in data["topics"] if r["topic"] == "food")
    assert (row["random"], row["forced"], row["sample"]) == (3, 4, 7)  # 3 ngẫu nhiên CỘNG 4 bắt buộc
    assert data["forced"]["food"] == {
        "a1.food.w02.noun": ["ai_suggested_headword"], "a1.food.w03.noun": ["ipa_unverified"],
        "a1.food.w04.noun": ["variant_note"], "a1.food.w05.noun": ["flag:example_length"]}
    flagged = {e.content_key for e in load(roots, "food").entries if e.review_sample}
    assert set(data["forced"]["food"]) <= flagged and "a1.food.w01.noun" not in data["forced"]["food"]


def test_refuses_when_drafts_lack_cloze(roots):
    t = load(roots, "home")
    t.entries[1].cloze_distractors = []
    save(roots, t)
    with pytest.raises(sample.SampleError, match="03b"):
        sample.choose("A1", 3, seed=1, **roots)
    assert sample.choose("A1", 3, seed=1, allow_missing_cloze=True, **roots)["keys"]["home"]


def test_progress_counts_status(roots):
    data = sample.choose("A1", 3, seed=7, **roots)
    t = load(roots, "food")
    by = content.by_key(t)
    by[data["keys"]["food"][0]].status = "approved"
    by[data["keys"]["food"][1]].status = "rejected"
    save(roots, t)
    p = sample.progress("A1", **roots)
    food = next(r for r in p["topics"] if r["topic"] == "food")
    assert (food["total"], food["approved"], food["rejected"], food["draft"]) == (3, 1, 1, 1)

