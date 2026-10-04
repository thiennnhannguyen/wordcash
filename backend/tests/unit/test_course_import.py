"""
Kiểm thử bộ đọc nhập hàng loạt: định dạng "từ - nghĩa" (nhiều dấu ngăn cách) và CSV có header.
"""

import pytest

from app.services import course_import as ci


def test_lines_accept_all_separators():
    text = "deploy - triển khai\nbug: lỗi phần mềm\nrefactor\ttái cấu trúc\nwell-known - nổi tiếng\nmerge–gộp nhánh"
    rows = ci.parse_lines(text)
    assert [(r.headword, r.meaning) for r in rows] == [
        ("deploy", "triển khai"),
        ("bug", "lỗi phần mềm"),
        ("refactor", "tái cấu trúc"),
        ("well-known", "nổi tiếng"),
        ("merge", "gộp nhánh"),
    ]
    assert all(r.error is None for r in rows)


def test_lines_skip_blank_and_comments_keep_line_numbers():
    rows = ci.parse_lines("# Từ IT\n\ncommit - lưu thay đổi\n")
    assert len(rows) == 1 and rows[0].line == 3


def test_lines_report_invalid_rows():
    rows = ci.parse_lines("no separator here\nword - \n" + "x" * 101 + " - quá dài")
    assert rows[0].error == "Không tìm thấy dấu ngăn cách giữa từ và nghĩa"
    assert rows[1].error == "Thiếu nghĩa"
    assert "Từ dài quá" in rows[2].error


def test_csv_with_header_and_optional_columns():
    text = '﻿Word,Meaning,Example,Note\nbug,lỗi,"There is a bug, again.",IT\nmerge,gộp,,\n,thiếu từ,,\n'
    rows = ci.parse_csv(text)
    assert (rows[0].headword, rows[0].meaning, rows[0].example, rows[0].note) == ("bug", "lỗi", "There is a bug, again.", "IT")
    assert rows[1].example is None and rows[1].error is None
    assert rows[2].error == "Thiếu từ" and rows[2].line == 4


def test_csv_missing_required_header():
    with pytest.raises(ci.ImportFormatError):
        ci.parse_csv("word,example\nbug,x\n")


def test_headword_key_is_case_and_space_insensitive():
    assert ci.headword_key("  Look   Forward to ") == "look forward to"
