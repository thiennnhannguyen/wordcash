"""
Đọc văn bản nhập hàng loạt cho "Khóa học của tôi" (hàm thuần, không phụ thuộc DB).

Hai định dạng:
- `lines`: mỗi dòng "từ - nghĩa". Dấu ngăn cách theo thứ tự ưu tiên: tab, gạch ngang có khoảng trắng hai bên (" - ", " – "),
  dấu hai chấm, rồi gạch ngang đầu tiên. Nhờ vậy "well-known - nổi tiếng" vẫn tách đúng.
- `csv`: dòng đầu là header, bắt buộc có `word` và `meaning`, tùy chọn `example`, `note` (không phân biệt hoa thường).

Dòng trống và dòng bắt đầu bằng `#` bị bỏ qua. Mỗi dòng trả về kèm số dòng gốc và lỗi (nếu có) để hiện ở bảng xem trước.
Việc phân loại khớp kho / trùng trong khóa do services/course_service.py làm.
"""

import csv
import io
import re
from dataclasses import dataclass

MAX_HEADWORD = 100
MAX_MEANING = 300
MAX_EXAMPLE = 500
MAX_NOTE = 300

_SPACED_DASH = re.compile(r"\s+[-–—]\s+")
_FIRST_DASH = re.compile(r"[-–—]")


class ImportFormatError(ValueError):
    """Cả văn bản không đọc được (vd. CSV thiếu cột bắt buộc)."""


@dataclass
class ParsedRow:
    line: int
    headword: str
    meaning: str
    example: str | None = None
    note: str | None = None
    error: str | None = None


def clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _validate(row: ParsedRow) -> ParsedRow:
    if not row.headword:
        row.error = "Thiếu từ"
    elif not row.meaning:
        row.error = "Thiếu nghĩa"
    elif len(row.headword) > MAX_HEADWORD:
        row.error = f"Từ dài quá {MAX_HEADWORD} ký tự"
    elif len(row.meaning) > MAX_MEANING:
        row.error = f"Nghĩa dài quá {MAX_MEANING} ký tự"
    elif row.example and len(row.example) > MAX_EXAMPLE:
        row.error = f"Ví dụ dài quá {MAX_EXAMPLE} ký tự"
    elif row.note and len(row.note) > MAX_NOTE:
        row.error = f"Ghi chú dài quá {MAX_NOTE} ký tự"
    return row


def split_line(line: str) -> tuple[str, str] | None:
    if "\t" in line:
        word, _, meaning = line.partition("\t")
        return word, meaning
    for pattern in (_SPACED_DASH, re.compile(":"), _FIRST_DASH):
        parts = pattern.split(line, maxsplit=1)
        if len(parts) == 2:
            return parts[0], parts[1]
    return None


def parse_lines(text: str) -> list[ParsedRow]:
    rows = []
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = split_line(line)
        if parts is None:
            rows.append(ParsedRow(number, clean_text(line), "", error="Không tìm thấy dấu ngăn cách giữa từ và nghĩa"))
            continue
        rows.append(_validate(ParsedRow(number, clean_text(parts[0]), clean_text(parts[1]))))
    return rows


def parse_csv(text: str) -> list[ParsedRow]:
    reader = csv.reader(io.StringIO(text.lstrip("﻿")))
    header: list[str] | None = None
    rows = []
    for number, cells in enumerate(reader, start=1):
        if not any(c.strip() for c in cells):
            continue
        if header is None:
            header = [c.strip().lower() for c in cells]
            if "word" not in header or "meaning" not in header:
                raise ImportFormatError("File CSV cần dòng tiêu đề có cột word và meaning.")
            continue
        if cells[0].strip().startswith("#"):
            continue
        get = lambda name: cells[header.index(name)] if name in header and header.index(name) < len(cells) else ""  # noqa: E731
        rows.append(
            _validate(
                ParsedRow(number, clean_text(get("word")), clean_text(get("meaning")), clean_text(get("example")) or None, clean_text(get("note")) or None)
            )
        )
    if header is None:
        raise ImportFormatError("File CSV đang trống.")
    return rows


def parse(text: str, fmt: str) -> list[ParsedRow]:
    return parse_csv(text) if fmt == "csv" else parse_lines(text)


def headword_key(headword: str) -> str:
    """Khóa so trùng: chữ thường, gộp khoảng trắng."""
    return re.sub(r"\s+", " ", headword).strip().lower()
