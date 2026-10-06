"""
Hướng dẫn soạn nội dung (docs/content-style-guide.md) và prompt AI: prompt soạn nháp chứa nguyên khối "Quy tắc cho AI" của
hướng dẫn (trích, không chép tay), sửa hướng dẫn thì mã băm prompt đổi (cache hết hiệu lực); hướng dẫn có ví dụ ĐÚNG / SAI
và danh sách kiểm tra 8–10 câu có/không cho người duyệt.
"""

import re

import pytest

from data_pipeline.lib import prompts, step03

GUIDE = prompts.STYLE_GUIDE.read_text(encoding="utf-8")


def test_enrich_prompt_quotes_style_guide_rules():
    rules = prompts.style_guide_rules()
    assert rules and "ONE card = ONE main meaning" in rules
    system = step03.system_prompt("A1", "food")
    assert rules in system and "{{" not in system and "Đồ ăn" in system


def test_guide_change_changes_prompt_hash(tmp_path, monkeypatch):
    original = prompts.rendered_hash(step03.system_prompt("A1", "food"))
    edited = tmp_path / "guide.md"
    edited.write_text(GUIDE.replace("max 6 words", "max 5 words"), encoding="utf-8")
    monkeypatch.setattr(prompts, "STYLE_GUIDE", edited)
    monkeypatch.setattr(prompts.style_guide_rules, "__defaults__", (edited,))
    assert prompts.rendered_hash(step03.system_prompt("A1", "food")) != original


def test_missing_rules_block_is_an_error(tmp_path, monkeypatch):
    empty = tmp_path / "guide.md"
    empty.write_text("# không có khối quy tắc", encoding="utf-8")
    monkeypatch.setattr(prompts.style_guide_rules, "__defaults__", (empty,))
    with pytest.raises(RuntimeError):
        step03.system_prompt("A1", "food")


def test_guide_has_examples_and_reviewer_checklist():
    for section in ["Chọn nghĩa", "Văn phong `meaning_vi`", "Câu ví dụ", "Cụm từ cố định", "Mẹo nhớ"]:
        assert section in GUIDE, section
    assert GUIDE.count("| ĐÚNG |") >= 6 and GUIDE.count("| SAI |") >= 6
    checklist = GUIDE.split("## 8. Danh sách kiểm tra cho người duyệt", 1)[1]
    questions = re.findall(r"^\d+\. .+\?$", checklist, re.M)
    assert 8 <= len(questions) <= 10
