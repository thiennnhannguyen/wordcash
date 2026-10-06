"""
Chuẩn hóa headword và từ loại từ mọi nguồn (hàm thuần, dùng chung cho mọi bộ đọc):
- chữ thường, cắt khoảng trắng, gộp khoảng trắng thừa, bỏ dấu chấm câu thừa ở hai đầu, dấu nháy cong → thẳng;
- tách biến thể ghi chung một ô ("colour/color", "Mr/Mr.") và chọn một dạng en-US;
- đổi chính tả Anh-Anh sang Anh-Mỹ: bảng `br_us_spelling.tsv` trước, rồi quy tắc -our → -or (trừ các từ gốc -our);
- từ loại về một bộ nhãn chung (noun, verb, adjective, adverb, preposition, determiner, pronoun, conjunction, interjection,
  number, modal, auxiliary, phrase).
"""

import re
from functools import lru_cache
from pathlib import Path

from data_pipeline import config

POS_MAP = {
    "n": "noun", "noun": "noun", "nouns": "noun", "proper noun": "noun",
    "v": "verb", "verb": "verb", "phrasal verb": "verb",
    "adj": "adjective", "adjective": "adjective", "a": "adjective",
    "adv": "adverb", "adverb": "adverb",
    "prep": "preposition", "preposition": "preposition",
    "det": "determiner", "determiner": "determiner", "article": "determiner",
    "pron": "pronoun", "pronoun": "pronoun",
    "conj": "conjunction", "conjunction": "conjunction",
    "interj": "interjection", "interjection": "interjection", "exclamation": "interjection",
    "num": "number", "number": "number", "numeral": "number", "cardinal number": "number", "ordinal number": "number",
    "modal verb": "modal", "modal": "modal", "modal auxiliary": "modal",
    "be-verb": "auxiliary", "do-verb": "auxiliary", "have-verb": "auxiliary", "auxiliary verb": "auxiliary", "auxiliary": "auxiliary",
    "infinitive-to": "preposition",
    "phrase": "phrase", "expression": "phrase", "fixed phrase": "phrase",
}
POS_VALUES = sorted(set(POS_MAP.values()))
# Từ gốc kết thúc -our, không phải chính tả Anh-Anh
OUR_KEEP = {"our", "four", "hour", "your", "tour", "pour", "flour", "sour", "court", "course", "source", "journey",
            "fourteen", "fourth", "detour", "devour", "contour", "yours", "ours"}


@lru_cache(maxsize=1)
def spelling_map(path: Path | None = None) -> dict[str, str]:
    path = path or config.BR_US_SPELLING
    out = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        br, _, us = line.partition("\t")
        out[br.strip().lower()] = us.strip().lower()
    return out


def clean(text: str) -> str:
    text = (text or "").replace("’", "'").replace("‘", "'").replace(" ", " ")
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text.strip(" .,;:!?\"()[]")


def to_american(word: str) -> str:
    """Một từ hoặc cụm: đổi từng từ theo bảng, rồi quy tắc -our → -or."""
    table = spelling_map()
    out = []
    for w in word.split(" "):
        if w in table:
            w = table[w]
        elif w.endswith("our") and w not in OUR_KEEP and len(w) > 4:
            w = w[:-3] + "or"
        elif w.endswith("ours") and w[:-1] not in OUR_KEEP and w not in OUR_KEEP and len(w) > 5:
            w = w[:-4] + "ors"
        out.append(w)
    return " ".join(out)


def split_variants(raw: str) -> list[str]:
    """'colour/color' → ['colour', 'color']; 'Mr/Mr.' → ['mr', 'mr']; ô bình thường → [ô]."""
    return [v for v in (clean(p) for p in re.split(r"\s*/\s*", raw or "")) if v]


def normalize_headword(raw: str) -> str | None:
    """Dạng chuẩn en-US của một ô headword; None nếu rỗng hoặc không phải chữ."""
    variants = split_variants(raw)
    if not variants:
        return None
    american = [to_american(v) for v in variants]
    # Ưu tiên biến thể vốn đã là en-US (không bị đổi), nếu không thì lấy bản đã đổi của biến thể đầu
    chosen = next((v for v, a in zip(variants, american) if v == a), american[0])
    if not re.fullmatch(r"[a-z][a-z' .\-]*", chosen):
        return None
    return chosen


def normalize_pos(raw: str | None) -> str | None:
    key = clean(raw or "")
    if not key:
        return None
    if key in POS_MAP:
        return POS_MAP[key]
    first = re.split(r"[,;/]", key)[0].strip()
    return POS_MAP.get(first)
