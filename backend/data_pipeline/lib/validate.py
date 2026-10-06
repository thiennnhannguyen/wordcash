"""
Bước 04 — kiểm tra tự động nội dung (gọi từ data_pipeline/04_validate.py). Mỗi quy tắc một hàm thuần; chỉ GẮN CỜ, không tự sửa.

Quy tắc trên từng mục (trả `(cờ, chi tiết)` hoặc None):
- example_missing_headword: câu ví dụ không chứa headword hay dạng biến đổi (số nhiều, chia thì… — lib/morph.py);
- meaning_empty / meaning_too_long / definition_too_long / example_length: độ dài vượt giới hạn trong config;
- hard_words: câu ví dụ có từ ngoài danh sách trắng (từ A1–A2 của các nguồn đã nhập + từ chức năng + tên riêng thông dụng +
  headword của cấp đang soạn), kèm danh sách từ;
- ipa_unverified: IPA không lấy được từ CMUdict (AI đề xuất) hoặc trống;
- sensitive: có từ khóa thương hiệu / người nổi tiếng / chủ đề nhạy cảm (sensitive_keywords.txt);
- collocation_missing_headword: có cụm đi kèm không chứa headword.
Quy tắc so sánh nhiều mục (bỏ qua mục rejected):
- duplicate_headword: trùng (headword, pos) trong cùng cấp; duplicate_example: trùng câu ví dụ trong cùng cấp;
- same_meaning_vi: trùng nghĩa tiếng Việt với mục khác cùng chủ đề (dễ nhầm khi làm trắc nghiệm).

`flags` = `origin_flags` (bước 02) ∪ cờ vi phạm, tính lại mỗi lần chạy; `flag_details` giải thích từng cờ.
"""

import re
from collections import Counter, defaultdict
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content, morph
from data_pipeline.lib.jsonio import read_json
from data_pipeline.lib.schemas import ContentEntry, TopicFile

ALLOWED_EXAMPLE_LEVELS = {"A1": ["A1", "A2"], "A2": ["A1", "A2", "B1"], "B1": ["A1", "A2", "B1", "B2"],
                          "B2": ["A1", "A2", "B1", "B2", "C1"], "C1": ["A1", "A2", "B1", "B2", "C1", "C2"],
                          "C2": ["A1", "A2", "B1", "B2", "C1", "C2"]}

FLAG_HELP = {
    "example_missing_headword": "Câu ví dụ không chứa từ này (kể cả dạng số nhiều / chia thì).",
    "meaning_empty": "Chưa có nghĩa tiếng Việt.",
    "meaning_too_long": f"Nghĩa tiếng Việt dài hơn {config.MEANING_VI_MAX_WORDS} từ.",
    "definition_too_long": f"Định nghĩa tiếng Anh dài hơn {config.DEFINITION_EN_MAX_WORDS} từ.",
    "example_length": f"Câu ví dụ phải có {config.EXAMPLE_EN_MIN_WORDS}–{config.EXAMPLE_EN_MAX_WORDS} từ.",
    "hard_words": "Câu ví dụ có từ ngoài danh sách A1–A2 cho phép.",
    "ipa_unverified": "IPA không có trong CMUdict (AI đề xuất) — kiểm tra lại phát âm.",
    "sensitive": "Có thương hiệu, người nổi tiếng hoặc chủ đề nhạy cảm.",
    "collocation_missing_headword": "Có cụm đi kèm không chứa từ này.",
    "duplicate_headword": "Trùng từ + từ loại với mục khác trong cùng cấp.",
    "duplicate_example": "Trùng câu ví dụ với mục khác trong cùng cấp.",
    "same_meaning_vi": "Trùng nghĩa tiếng Việt với mục khác cùng chủ đề (dễ nhầm khi làm trắc nghiệm).",
    "phrase": "Cụm từ cố định (do AI đề xuất ở bước 02).",
    "needs_topic_review": "AI không chắc chủ đề — xem lại chủ đề của mục này.",
    "ai_suggested_headword": "Từ do AI đề xuất thêm (không có trong nguồn) — duyệt kỹ.",
}
# Cờ chỉ mang tính thông tin (không tính là "có cờ" cần xử lý)
INFO_FLAGS = {"phrase"}
NUMBER_TOKEN = re.compile(r"^\d+(?:[:.,]\d+)*$")


def words(text: str) -> list[str]:
    return [w for w in re.split(r"\s+", (text or "").strip()) if w]


def norm_text(text: str) -> str:
    return re.sub(r"[^\w\s]", "", (text or "").lower()).strip()


# ---------- Quy tắc trên một mục ----------

def rule_example_contains_headword(e: ContentEntry):
    if e.example_en and not morph.contains_headword(e.example_en, e.headword, e.pos):
        return "example_missing_headword", e.example_en


def rule_meaning(e: ContentEntry):
    if not e.meaning_vi.strip():
        return "meaning_empty", ""
    if len(words(e.meaning_vi)) > config.MEANING_VI_MAX_WORDS:
        return "meaning_too_long", f"{len(words(e.meaning_vi))} từ"


def rule_definition_length(e: ContentEntry):
    if len(words(e.definition_en)) > config.DEFINITION_EN_MAX_WORDS:
        return "definition_too_long", f"{len(words(e.definition_en))} từ"


def rule_example_length(e: ContentEntry):
    n = len(morph.tokens(e.example_en)) + len([t for t in words(e.example_en) if NUMBER_TOKEN.match(t.strip(".,!?"))])
    if not config.EXAMPLE_EN_MIN_WORDS <= n <= config.EXAMPLE_EN_MAX_WORDS:
        return "example_length", f"{n} từ"


def rule_hard_words(e: ContentEntry, whitelist: set[str] | None):
    if whitelist is None:
        return None
    allowed = whitelist | morph.headword_forms(e.headword, e.pos) | {t for c in e.collocations for t in morph.tokens(c)}
    hard = sorted({t for t in morph.tokens(e.example_en) if t not in allowed and t.split("'")[0] not in allowed})
    if hard:
        return "hard_words", ", ".join(hard)


def rule_ipa(e: ContentEntry):
    if e.ipa_unverified or not e.ipa:
        return "ipa_unverified", e.ipa or "trống"


def rule_sensitive(e: ContentEntry, keywords: set[str]):
    text = " " + " ".join(morph.tokens(" ".join([e.example_en, e.definition_en, *e.collocations, e.headword]))) + " "
    hits = sorted(k for k in keywords if " " + " ".join(morph.tokens(k)) + " " in text)
    if hits:
        return "sensitive", ", ".join(hits)


def rule_collocations(e: ContentEntry):
    bad = [c for c in e.collocations if not morph.contains_headword(c, e.headword, e.pos)]
    if bad:
        return "collocation_missing_headword", "; ".join(bad)


def entry_rules(e: ContentEntry, *, whitelist: set[str] | None, keywords: set[str]) -> list[tuple[str, str]]:
    found = [rule_example_contains_headword(e), rule_meaning(e), rule_definition_length(e), rule_example_length(e),
             rule_hard_words(e, whitelist), rule_ipa(e), rule_sensitive(e, keywords), rule_collocations(e)]
    return [f for f in found if f]


# ---------- Quy tắc so sánh nhiều mục ----------

def rule_duplicates(topics: list[TopicFile]) -> dict[str, list[tuple[str, str]]]:
    """content_key → các cờ trùng lặp (trong cùng cấp: headword+pos, câu ví dụ; trong cùng chủ đề: nghĩa tiếng Việt)."""
    out: dict[str, list[tuple[str, str]]] = defaultdict(list)
    heads: dict[tuple[str, str], list[ContentEntry]] = defaultdict(list)
    examples: dict[str, list[ContentEntry]] = defaultdict(list)
    for t in topics:
        meanings: dict[str, list[ContentEntry]] = defaultdict(list)
        for e in t.entries:
            if e.status == "rejected":
                continue
            heads[(e.headword, e.pos)].append(e)
            if e.example_en.strip():
                examples[norm_text(e.example_en)].append(e)
            if e.meaning_vi.strip():
                meanings[norm_text(e.meaning_vi)].append(e)
        for group in meanings.values():
            if len(group) > 1:
                for e in group:
                    out[e.content_key].append(("same_meaning_vi", ", ".join(o.headword for o in group if o is not e)))
    for group in heads.values():
        if len(group) > 1:
            for e in group:
                out[e.content_key].append(("duplicate_headword", ", ".join(o.content_key for o in group if o is not e)))
    for group in examples.values():
        if len(group) > 1:
            for e in group:
                out[e.content_key].append(("duplicate_example", ", ".join(o.content_key for o in group if o is not e)))
    return out


def build_whitelist(level: str, candidates: list[dict] | None, topics: list[TopicFile]) -> set[str] | None:
    """Từ được phép trong câu ví dụ; None nếu chưa có candidates.json (bỏ qua quy tắc hard_words, báo trong report)."""
    if candidates is None:
        return None
    allowed_levels = set(ALLOWED_EXAMPLE_LEVELS[level])
    base = {c["headword"] for c in candidates if allowed_levels & set((c.get("cefr") or {}).values())}
    base |= config.read_word_list(config.EXCLUDE_FUNCTION_WORDS)
    base |= {t for name in config.read_word_list(config.PROPER_NAMES) for t in morph.tokens(name)}
    base |= {e.headword for t in topics for e in t.entries if e.status != "rejected"}
    out = set()
    for w in base:
        for part in w.split():
            out |= morph.word_forms(part)
    return out | {"n't", "'s", "'m", "'re", "'ll", "'ve", "'d", "o'clock"}


def run(level: str, *, processed: Path = config.PROCESSED, content_root: Path | None = None) -> dict:
    """Kiểm tra cả cấp; chỉ ghi lại file nào thật sự đổi (diff git gọn, công cụ duyệt gọi sau mỗi lần sửa)."""
    level = level.upper()
    paths = content.level_files(level, content_root)
    topics = [content.load_topic(p) for p in paths]
    before = [content.dump(t) for t in topics]
    candidates = read_json(Path(processed) / "candidates.json")
    whitelist = build_whitelist(level, candidates, topics)
    keywords = config.read_word_list(config.SENSITIVE_KEYWORDS)
    dupes = rule_duplicates(topics)
    by_flag: Counter = Counter()
    by_topic: dict[str, dict] = {}
    for t, old in zip(topics, before):
        topic_counts: Counter = Counter()
        for e in t.entries:
            if e.status == "rejected":
                continue
            found = entry_rules(e, whitelist=whitelist, keywords=keywords) + dupes.get(e.content_key, [])
            details = {flag: detail for flag, detail in found}
            e.flags = list(dict.fromkeys([*e.origin_flags, *(f for f, _ in found)]))
            e.flag_details = details
            topic_counts.update(e.flags)
        by_flag.update(topic_counts)
        by_topic[t.topic_code] = {"entries": len(t.entries), "flagged": sum(1 for e in t.entries if set(e.flags) - INFO_FLAGS),
                                  "flags": dict(topic_counts)}
        if content.dump(t) != old:
            content.save_topic(t, content_root)
    return {"level": level, "files": len(paths), "entries": sum(len(t.entries) for t in topics), "by_flag": dict(by_flag),
            "by_topic": by_topic, "hard_words_checked": whitelist is not None}
