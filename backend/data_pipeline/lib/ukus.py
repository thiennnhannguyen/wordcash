"""
Chuẩn từ vựng Anh-Mỹ (en-US) cho kho từ, đọc từ data_pipeline/uk_us_vocab.tsv (chính tả colour/color nằm ở br_us_spelling.tsv).

- `headword_replacement(headword, pos)`: từ Mỹ thay cho headword Anh-Anh (mode replace / headword, đúng từ loại nếu có cột pos);
  bước 02 đổi headword (hoặc bỏ vào dự phòng nếu từ Mỹ đã có trong cấp).
- `variant_note(headword, pos)`: ghi chú "Mỹ thường dùng: …" cho từ người Mỹ vẫn dùng (mode note); bước 03 tự điền
  `variant_note`, không do AI soạn.
- `text_terms(text)`: các từ Anh-Anh (mode replace) xuất hiện trong một đoạn chữ (so khớp cả cụm, không phân biệt hoa thường,
  nhận số nhiều -s/-es); quy tắc uk_vocab của bước 04 dùng cho example_en, collocations, definition_en.
"""

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from data_pipeline import config

MODES = ("replace", "headword", "note", "context")
NOTE_PREFIX = "Mỹ thường dùng: "


@dataclass(frozen=True)
class Pair:
    uk: str
    us: str
    mode: str
    pos: str | None = None

    def applies_to(self, headword: str, pos: str | None) -> bool:
        return headword.strip().lower() == self.uk and (self.pos is None or pos == self.pos)


@lru_cache(maxsize=4)
def load(path: str | None = None) -> tuple[Pair, ...]:
    out = []
    for line in Path(path or config.UK_US_VOCAB).read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        cols = [c.strip() for c in line.split("\t")]
        uk, us, mode = cols[0].lower(), cols[1], cols[2]
        if mode not in MODES:
            raise ValueError(f"uk_us_vocab.tsv: mode không hợp lệ {mode!r} ở dòng {line!r}")
        out.append(Pair(uk, us, mode, cols[3] if len(cols) > 3 and cols[3] else None))
    return tuple(out)


def headword_replacement(headword: str, pos: str | None, pairs: tuple[Pair, ...] | None = None) -> str | None:
    for p in pairs if pairs is not None else load():
        if p.mode in ("replace", "headword") and p.applies_to(headword, pos):
            return p.us
    return None


def variant_note(headword: str, pos: str | None, pairs: tuple[Pair, ...] | None = None) -> str:
    for p in pairs if pairs is not None else load():
        if p.mode == "note" and p.applies_to(headword, pos):
            return NOTE_PREFIX + p.us
    return ""


def _pattern(term: str) -> re.Pattern:
    words = [re.escape(w) for w in term.split()]
    words[-1] += r"(?:s|es)?"
    return re.compile(r"(?<![\w'-])" + r"\s+".join(words) + r"(?![\w'-])", re.IGNORECASE)


def text_terms(text: str, pairs: tuple[Pair, ...] | None = None) -> list[Pair]:
    """Từ Anh-Anh (mode replace) có trong `text`; cụm dài khớp trước, không đếm lại phần đã khớp."""
    found, used = [], []
    for p in sorted((p for p in (pairs if pairs is not None else load()) if p.mode == "replace"), key=lambda p: -len(p.uk)):
        for m in _pattern(p.uk).finditer(text or ""):
            if any(a < m.end() and m.start() < b for a, b in used):
                continue
            used.append(m.span())
            if p not in found:
                found.append(p)
    return found
