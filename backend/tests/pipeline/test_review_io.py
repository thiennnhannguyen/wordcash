"""
Xuất / nhập bảng tính duyệt ngoài app (lib/review_io.py): CSV và XLSX khứ hồi giữ nguyên dữ liệu; nhập chỉ xem trước khác biệt
khi chưa --apply; --apply ghi đúng trường, đặt reviewed_at khi đổi trạng thái; content_key lạ / từ chối thiếu lý do → lỗi, không ghi.
"""

import csv
from datetime import UTC, datetime

import pytest

from data_pipeline.lib import content, review_io
from data_pipeline.lib.schemas import ContentEntry, TopicFile

NOW = datetime(2026, 10, 7, 9, 0, tzinfo=UTC)


@pytest.fixture
def root(tmp_path):
    r = tmp_path / "content"
    content.save_topic(TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn", entries=[
        ContentEntry(content_key="a1.food.rice.noun", headword="rice", pos="noun", meaning_vi="cơm", example_en="We eat rice.",
                     collocations=["cook rice", "a bowl of rice"], rank_in_topic=1),
        ContentEntry(content_key="a1.food.egg.noun", headword="egg", pos="noun", meaning_vi="trứng", rank_in_topic=2),
    ]), r)
    return r


def rewrite_csv(path, edit):
    with path.open(encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    edit(rows)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


@pytest.mark.parametrize("ext", ["csv", "xlsx"])
def test_round_trip_has_no_changes(tmp_path, root, ext):
    out = tmp_path / f"a1.{ext}"
    assert review_io.export("A1", out, root) == 2
    result = review_io.import_sheet("A1", out, root=root)
    assert result.changes == [] and result.errors == []


def test_preview_then_apply(tmp_path, root):
    out = tmp_path / "a1.csv"
    review_io.export("A1", out, root)

    def edit(rows):
        rows[0]["meaning_vi"] = "cơm trắng"
        rows[0]["collocations"] = "cook rice | fried rice"
        rows[1]["status"] = "approved"

    rewrite_csv(out, edit)
    before = content.topic_path("A1", "food", root).read_bytes()
    preview = review_io.import_sheet("A1", out, root=root)
    assert {(c["content_key"], c["field"]) for c in preview.changes} == {
        ("a1.food.rice.noun", "meaning_vi"), ("a1.food.rice.noun", "collocations"), ("a1.food.egg.noun", "status")}
    assert content.topic_path("A1", "food", root).read_bytes() == before  # xem trước: không ghi
    applied = review_io.import_sheet("A1", out, apply=True, root=root, now=NOW)
    assert applied.applied
    saved = content.by_key(content.load_topic(content.topic_path("A1", "food", root)))
    assert saved["a1.food.rice.noun"].collocations == ["cook rice", "fried rice"] and saved["a1.food.rice.noun"].reviewed_at is None
    assert saved["a1.food.egg.noun"].status == "approved" and saved["a1.food.egg.noun"].reviewed_at == NOW


def test_errors_block_apply(tmp_path, root):
    out = tmp_path / "a1.csv"
    review_io.export("A1", out, root)

    def edit(rows):
        rows[0]["status"] = "rejected"
        rows[1]["content_key"] = "a1.food.ghost.noun"

    rewrite_csv(out, edit)
    before = content.topic_path("A1", "food", root).read_bytes()
    result = review_io.import_sheet("A1", out, apply=True, root=root)
    assert len(result.errors) == 2 and not result.applied
    assert content.topic_path("A1", "food", root).read_bytes() == before
