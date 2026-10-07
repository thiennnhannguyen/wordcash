"""
Bước 04 — kiểm tra tự động nội dung (gọi từ data_pipeline/04_validate.py). Mỗi quy tắc một hàm thuần; chỉ GẮN CỜ, không tự sửa.

Quy tắc trên từng mục (trả `(cờ, chi tiết)` hoặc None):
- example_missing_headword: câu ví dụ không chứa headword hay dạng biến đổi (số nhiều, chia thì… — lib/morph.py);
- meaning_vi_pronoun: nghĩa tiếng Việt chứa "tôi" (nghĩa tránh đại từ khi có thể: "đói rồi", "chăm sóc"; câu ví dụ dùng "mình");
- meaning_empty / meaning_too_long / definition_too_long / example_length: độ dài vượt giới hạn trong config;
- hard_words: câu ví dụ có từ ngoài danh sách trắng (từ A1–A2 của các nguồn đã nhập + từ chức năng + tên riêng thông dụng +
  từ đời sống Việt Nam trong vn_context_allowlist.txt + headword của cấp đang soạn), kèm danh sách từ;
- vn_context_overuse: câu ví dụ có hơn VN_CONTEXT_MAX_PER_EXAMPLE từ đời sống Việt Nam (pho, Tet, Hanoi…; so khớp bỏ dấu);
- ipa_unverified: IPA không lấy được từ CMUdict (AI đề xuất) hoặc trống;
- sensitive: có từ khóa thương hiệu / người nổi tiếng / chủ đề nhạy cảm (sensitive_keywords.txt);
- collocation_missing_headword: có cụm đi kèm không chứa headword (mục từ đơn);
- phrase_related_repeats_headword: mục cụm từ cố định (pos = phrase) có "cụm liên quan" chứa nguyên văn headword (với phrase,
  collocations là 2–3 cụm liên quan: biến thể, câu đáp lại, cụm cùng nhóm — không phải chính cụm đó thêm một chữ).
Quy tắc so sánh nhiều mục (bỏ qua mục rejected):
- duplicate_headword: trùng (headword, pos) trong cùng cấp; duplicate_example: trùng câu ví dụ trong cùng cấp;
- same_meaning_vi: trùng nghĩa tiếng Việt với mục khác cùng chủ đề (dễ nhầm khi làm trắc nghiệm);
- duplicate_meaning_in_level: hai mục trong cùng cấp có meaning_vi trùng hoặc là biến thể của nhau (`meaning_senses`: bỏ loại từ
  đứng đầu như "cái", "quả", "người"; trùng một nghĩa, hoặc nghĩa ≥ 2 chữ này là phần đầu của nghĩa kia: "áo khoác" ~ "áo khoác
  dày"). Ghi chú trong ngoặc khác nhau ở cả hai bên thì coi là đã phân biệt ("năm (số)" ≠ "năm (mười hai tháng)"). Bỏ qua cặp
  cùng headword khác từ loại và cặp headword nằm trong cụm (thank ~ thank you); cặp trùng hệt cùng chủ đề đã có same_meaning_vi.

`flags` = `origin_flags` (bước 02) ∪ cờ vi phạm, tính lại mỗi lần chạy; `flag_details` giải thích từng cờ.
"""

import re
import unicodedata
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
    "meaning_vi_pronoun": "Nghĩa tiếng Việt có \"tôi\" — bỏ đại từ khi được (\"đói rồi\"), câu ví dụ dùng \"mình\".",
    "meaning_too_long": f"Nghĩa tiếng Việt dài hơn {config.MEANING_VI_MAX_WORDS} từ.",
    "definition_too_long": f"Định nghĩa tiếng Anh dài hơn {config.DEFINITION_EN_MAX_WORDS} từ.",
    "example_length": f"Câu ví dụ phải có {config.EXAMPLE_EN_MIN_WORDS}–{config.EXAMPLE_EN_MAX_WORDS} từ.",
    "hard_words": "Câu ví dụ có từ ngoài danh sách A1–A2 cho phép.",
    "ipa_unverified": "IPA không có trong CMUdict (AI đề xuất) — kiểm tra lại phát âm.",
    "sensitive": "Có thương hiệu, người nổi tiếng hoặc chủ đề nhạy cảm.",
    "vn_context_overuse": f"Câu ví dụ có hơn {config.VN_CONTEXT_MAX_PER_EXAMPLE} từ đời sống Việt Nam (pho, Tet, Hanoi…).",
    "collocation_missing_headword": "Có cụm đi kèm không chứa từ này.",
    "phrase_related_repeats_headword": "Cụm liên quan lặp lại nguyên cụm này (cần biến thể, câu đáp lại hoặc cụm cùng nhóm).",
    "duplicate_headword": "Trùng từ + từ loại với mục khác trong cùng cấp.",
    "duplicate_example": "Trùng câu ví dụ với mục khác trong cùng cấp.",
    "same_meaning_vi": "Trùng nghĩa tiếng Việt với mục khác cùng chủ đề (dễ nhầm khi làm trắc nghiệm).",
    "duplicate_meaning_in_level": "Nghĩa tiếng Việt trùng hoặc là biến thể của nghĩa một mục khác trong cùng cấp — giữ một mục, "
                                  "hoặc sửa nghĩa cho phân biệt được.",
    "phrase": "Cụm từ cố định (do AI đề xuất ở bước 02).",
    "needs_topic_review": "AI không chắc chủ đề — xem lại chủ đề của mục này.",
    "ai_suggested_headword": "Từ do AI đề xuất thêm (đã kiểm có trong CEFR-J A1–A2) — duyệt kỹ. Chỉ là nhãn thông tin.",
}
# Cờ chỉ mang tính thông tin (không tính là "có cờ" cần xử lý) — khai báo ở config
INFO_FLAGS = config.INFO_FLAGS
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


VI_PRONOUNS_IN_MEANING = {"tôi"}


def rule_meaning_pronoun(e: ContentEntry):
    found = [w for w in re.findall(r"\w+", e.meaning_vi.lower()) if w in VI_PRONOUNS_IN_MEANING]
    if found:
        return "meaning_vi_pronoun", e.meaning_vi


def rule_definition_length(e: ContentEntry):
    if len(words(e.definition_en)) > config.DEFINITION_EN_MAX_WORDS:
        return "definition_too_long", f"{len(words(e.definition_en))} từ"


def rule_example_length(e: ContentEntry):
    n = len(morph.tokens(e.example_en)) + len([t for t in words(e.example_en) if NUMBER_TOKEN.match(t.strip(".,!?"))])
    if not config.EXAMPLE_EN_MIN_WORDS <= n <= config.EXAMPLE_EN_MAX_WORDS:
        return "example_length", f"{n} từ"


NEGATIVE_STEMS = {"ca": "can", "wo": "will", "sha": "shall"}  # can't, won't, shan't


def contraction_base(token: str) -> str:
    """Gốc của dạng rút gọn: don't → do, can't → can, won't → will; it's → it, I'm → i."""
    if token.endswith("n't"):
        stem = token[:-3]
        return NEGATIVE_STEMS.get(stem, stem)
    return token.split("'")[0]


def rule_hard_words(e: ContentEntry, whitelist: set[str] | None):
    if whitelist is None:
        return None
    allowed = whitelist | morph.headword_forms(e.headword, e.pos) | {t for c in e.collocations for t in morph.tokens(c)}
    hard = sorted({t for t in morph.tokens(e.example_en) if t not in allowed and contraction_base(t) not in allowed})
    if hard:
        return "hard_words", ", ".join(hard)


def plain(text: str) -> str:
    """Chữ thường, bỏ dấu tiếng Việt (Tết → tet, phở → pho), chỉ giữ chữ cái / số / khoảng trắng."""
    text = unicodedata.normalize("NFD", (text or "").replace("đ", "d").replace("Đ", "D"))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    return " ".join(re.findall(r"[a-z0-9]+", text))


def vn_terms(text: str, terms: set[str]) -> list[str]:
    """Các từ đời sống Việt Nam xuất hiện trong câu (cụm dài khớp trước, không đếm trùng phần: "ha long bay" ≠ "ha long")."""
    words = plain(text).split()
    found, i = [], 0
    ordered = sorted((t.split() for t in terms), key=len, reverse=True)
    while i < len(words):
        hit = next((t for t in ordered if words[i:i + len(t)] == t), None)
        if hit:
            found.append(" ".join(hit))
            i += len(hit)
        else:
            i += 1
    return found


def rule_vn_context(e: ContentEntry, terms: set[str]):
    hits = vn_terms(e.example_en, terms)
    if len(hits) > config.VN_CONTEXT_MAX_PER_EXAMPLE:
        return "vn_context_overuse", ", ".join(hits)


def rule_ipa(e: ContentEntry):
    if e.ipa_unverified or not e.ipa:
        return "ipa_unverified", e.ipa or "trống"


def rule_sensitive(e: ContentEntry, keywords: set[str]):
    text = " " + " ".join(morph.tokens(" ".join([e.example_en, e.definition_en, *e.collocations, e.headword]))) + " "
    hits = sorted(k for k in keywords if " " + " ".join(morph.tokens(k)) + " " in text)
    if hits:
        return "sensitive", ", ".join(hits)


def rule_collocations(e: ContentEntry):
    if e.pos == config.POS_PHRASE:
        head = f" {norm_text(e.headword)} "
        bad = [c for c in e.collocations if head in f" {norm_text(c)} "]
        if bad:
            return "phrase_related_repeats_headword", "; ".join(bad)
        return None
    bad = [c for c in e.collocations if not morph.contains_headword(c, e.headword, e.pos)]
    if bad:
        return "collocation_missing_headword", "; ".join(bad)


def entry_rules(e: ContentEntry, *, whitelist: set[str] | None, keywords: set[str], vn: set[str] | None = None) -> list[tuple[str, str]]:
    vn = config.read_word_list(config.VN_CONTEXT_ALLOWLIST) if vn is None else vn
    found = [rule_example_contains_headword(e), rule_meaning(e), rule_meaning_pronoun(e), rule_definition_length(e), rule_example_length(e),
             rule_hard_words(e, whitelist), rule_vn_context(e, vn), rule_ipa(e), rule_sensitive(e, keywords), rule_collocations(e)]
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
            heads[(e.headword.lower(), e.pos)].append(e)
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


VI_CLASSIFIERS = {"cái", "quả", "chiếc", "người", "ngôi", "căn", "bức", "tấm"}
VI_NUMBERS = {"một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "mười", "mươi", "trăm", "nghìn"}


def meaning_senses(meaning: str) -> set[tuple[tuple[str, ...], str]]:
    """Các nghĩa đã chuẩn hóa của meaning_vi: tách theo dấu phẩy / chấm phẩy NGOÀI ngoặc; mỗi nghĩa = (bộ chữ chính, ghi chú
    trong ngoặc); chữ thường, bỏ loại từ đứng đầu ("quả trứng" → trứng, "người mẹ" → mẹ). "bà (nội, ngoại)" → (("bà",), "nội ngoại")."""
    parts, depth, cur = [], 0, ""
    for ch in (meaning or "").lower():
        depth += {"(": 1, ")": -1}.get(ch, 0)
        if ch in ",;" and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    out = set()
    for part in parts:
        note = " ".join(re.findall(r"\w+", " ".join(re.findall(r"\(([^)]*)\)", part))))
        w = re.findall(r"\w+", re.sub(r"\([^)]*\)", " ", part))
        if len(w) > 1 and w[0] in VI_CLASSIFIERS:
            w = w[1:]
        if w:
            out.add((tuple(w), note))
    return out


def senses_overlap(a: set, b: set) -> bool:
    """Trùng hoặc biến thể: chữ chính bằng nhau, hoặc nghĩa ≥ 2 chữ là phần đầu của nghĩa kia (phần thêm không phải số đếm:
    "tháng mười" ≠ "tháng mười một"); KHÔNG tính khi cả hai có ghi chú trong ngoặc và ghi chú khác nhau ("năm (số)" ≠ "năm
    (mười hai tháng)")."""
    for x, nx in a:
        for y, ny in b:
            if nx and ny and nx != ny:
                continue
            short, long_ = sorted((x, y), key=len)
            extra = long_[len(short):]
            if x == y or (len(short) >= 2 and long_[:len(short)] == short and not set(extra) <= VI_NUMBERS):
                return True
    return False


def contains_words(a: str, b: str) -> bool:
    """Headword này nằm trọn trong headword kia (thank ⊂ thank you, family ⊂ my family): nghĩa giống nhau là đương nhiên."""
    x, y = a.lower().split(), b.lower().split()
    short, long_ = sorted((x, y), key=len)
    return any(long_[i:i + len(short)] == short for i in range(len(long_) - len(short) + 1))


def rule_duplicate_meaning_in_level(topics: list[TopicFile]) -> dict[str, list[tuple[str, str]]]:
    """content_key → [("duplicate_meaning_in_level", "các mục trùng")] cho cặp khác headword trong cùng cấp."""
    rows = [(t.topic_code, e, meaning_senses(e.meaning_vi)) for t in topics for e in t.entries
            if e.status != "rejected" and e.meaning_vi.strip()]
    hits: dict[str, list[str]] = defaultdict(list)
    for i, (ta, a, sa) in enumerate(rows):
        for tb, b, sb in rows[i + 1:]:
            if contains_words(a.headword, b.headword):
                continue  # cùng headword (khác từ loại) hoặc headword nằm trong cụm
            if ta == tb and norm_text(a.meaning_vi) == norm_text(b.meaning_vi):
                continue  # đã có same_meaning_vi
            if senses_overlap(sa, sb):
                hits[a.content_key].append(f"{b.content_key} ({b.meaning_vi})")
                hits[b.content_key].append(f"{a.content_key} ({a.meaning_vi})")
    return {k: [("duplicate_meaning_in_level", "; ".join(v))] for k, v in hits.items()}


def build_whitelist(level: str, candidates: list[dict] | None, topics: list[TopicFile]) -> set[str] | None:
    """Từ được phép trong câu ví dụ; None nếu chưa có candidates.json (bỏ qua quy tắc hard_words, báo trong report)."""
    if candidates is None:
        return None
    allowed_levels = set(ALLOWED_EXAMPLE_LEVELS[level])
    base = {c["headword"] for c in candidates if allowed_levels & set((c.get("cefr") or {}).values())}
    base |= config.read_word_list(config.EXCLUDE_FUNCTION_WORDS)
    base |= {t for name in config.read_word_list(config.PROPER_NAMES) for t in morph.tokens(name)}
    base |= {t for term in config.read_word_list(config.VN_CONTEXT_ALLOWLIST) for t in morph.tokens(term)}
    base |= {e.headword.lower() for t in topics for e in t.entries if e.status != "rejected"}
    base |= {tok for t in topics for e in t.entries if e.status != "rejected" for tok in morph.tokens(e.headword)}  # T-shirt → t, shirt
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
    vn = config.read_word_list(config.VN_CONTEXT_ALLOWLIST)
    dupes = rule_duplicates(topics)
    for key, found in rule_duplicate_meaning_in_level(topics).items():
        dupes[key] = dupes.get(key, []) + found
    by_flag: Counter = Counter()
    by_topic: dict[str, dict] = {}
    for t, old in zip(topics, before):
        topic_counts: Counter = Counter()
        for e in t.entries:
            if e.status == "rejected":
                continue
            found = entry_rules(e, whitelist=whitelist, keywords=keywords, vn=vn) + dupes.get(e.content_key, [])
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
