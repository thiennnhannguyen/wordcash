"""
Đợt chọn mẫu duyệt (data_pipeline/lib/sample.py): N mục mỗi chủ đề, hạt giống cố định cho ra cùng mẫu, bỏ mục rejected;
dừng khi còn mục draft chưa có câu điền từ Mức 4 (phải chạy 03b trước); đã có mẫu thì không chọn lại trừ khi --force;
tiến độ mẫu theo trạng thái; API trang duyệt trả sample_keys của chủ đề.
"""

import pytest

from data_pipeline.lib import content, sample
from data_pipeline.lib.schemas import ContentEntry, TopicFile

CLOZE = {"cloze_en": "x", "cloze_distractors": ["a", "b", "c"]}


def topic(code, n, **kw):
    return TopicFile(level="A1", topic_code=code, topic_title=code, entries=[
        ContentEntry(content_key=f"a1.{code}.w{i}.noun", headword=f"w{i}", pos="noun", **{**CLOZE, **kw}) for i in range(n)])


@pytest.fixture
def roots(tmp_path):
    root = tmp_path / "content"
    food = topic("food", 12)
    food.entries[0].status = "rejected"
    content.save_topic(food, root)
    content.save_topic(topic("home", 4), root)
    return {"content_root": root, "work_root": tmp_path / "work"}


def test_choose_per_topic_with_seed(roots):
    data = sample.choose("A1", 5, seed=42, **roots)
    assert {k: len(v) for k, v in data["keys"].items()} == {"food": 5, "home": 4}  # chủ đề ít mục: lấy hết
    assert "a1.food.w0.noun" not in data["keys"]["food"]  # mục rejected không vào mẫu
    again = sample.choose("A1", 5, seed=42, force=True, **roots)
    assert again["keys"] == data["keys"] and again["seed"] == 42  # cùng hạt giống → cùng mẫu
    assert sample.keys_for("A1", "food", roots["work_root"]) == data["keys"]["food"]
    with pytest.raises(sample.SampleError, match="--force"):
        sample.choose("A1", 5, seed=1, **roots)


def test_refuses_when_drafts_lack_cloze(roots):
    t = content.load_topic(content.topic_path("A1", "home", roots["content_root"]))
    t.entries[1].cloze_distractors = []
    content.save_topic(t, roots["content_root"])
    with pytest.raises(sample.SampleError, match="03b"):
        sample.choose("A1", 3, seed=1, **roots)
    assert sample.choose("A1", 3, seed=1, allow_missing_cloze=True, **roots)["keys"]["home"]


def test_progress_counts_status(roots):
    data = sample.choose("A1", 3, seed=7, **roots)
    t = content.load_topic(content.topic_path("A1", "food", roots["content_root"]))
    by = content.by_key(t)
    by[data["keys"]["food"][0]].status = "approved"
    by[data["keys"]["food"][1]].status = "rejected"
    content.save_topic(t, roots["content_root"])
    p = sample.progress("A1", **roots)
    food = next(r for r in p["topics"] if r["topic"] == "food")
    assert (food["total"], food["approved"], food["rejected"], food["draft"]) == (3, 1, 1, 1)
