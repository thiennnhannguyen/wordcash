"""
Kiểm tra schema nội dung cho CI (lib/check.py): file hợp lệ không lỗi; bắt sai schema, sai tên file, content_key lệch
headword/pos, trùng content_key giữa các file, bài trỏ tới mục không có / mục thuộc 2 bài. Kho nội dung thật trong repo
cũng phải sạch.
"""

import json

from data_pipeline.lib import check, content
from data_pipeline.lib.schemas import ContentEntry, ContentUnit, TopicFile


def good(root):
    t = TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn",
                  entries=[ContentEntry(content_key="a1.food.rice.noun", headword="rice", pos="noun")],
                  units=[ContentUnit(content_key="a1.food.u1", position=1, entries=["a1.food.rice.noun"])])
    return content.save_topic(t, root)


def test_valid_tree(tmp_path):
    good(tmp_path)
    assert check.check_tree(tmp_path) == []


def test_errors_are_reported(tmp_path):
    path = good(tmp_path)
    data = json.loads(path.read_text(encoding="utf-8"))
    data["entries"].append({**data["entries"][0], "content_key": "a1.food.egg.noun"})  # key lệch headword
    data["units"].append({**data["units"][0], "content_key": "a1.food.u2", "position": 2, "entries": ["a1.food.rice.noun", "a1.food.ghost.noun"]})
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    (tmp_path / "a1" / "home.json").write_text(json.dumps({**data, "topic_code": "food"}), encoding="utf-8")
    (tmp_path / "a1" / "school.json").write_text('{"level": "A1"}', encoding="utf-8")
    text = " | ".join(check.check_tree(tmp_path))
    for needle in ("phải là a1.food.rice.noun", "mục không có a1.food.ghost.noun", "thuộc 2 bài", "tên file không khớp",
                   "có ở cả", "school.json: sai schema"):
        assert needle in text, needle


def test_repository_content_is_valid():
    assert check.check_tree() == []
