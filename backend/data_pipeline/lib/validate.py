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
- uk_vocab: từ vựng Anh-Anh (uk_us_vocab.tsv, lib/ukus.py) — headword chỉ dùng ở Anh, headword cần ghi chú Mỹ mà thiếu
  variant_note, hoặc từ Anh-Anh (mode replace) trong example_en, collocations, definition_en; chi tiết ghi từ Mỹ nên dùng;
- collocation_missing_headword: có cụm đi kèm không chứa headword (mục từ đơn);
- phrase_related_repeats_headword: mục cụm từ cố định (pos = phrase) có "cụm liên quan" chứa nguyên văn headword (với phrase,
  collocations là 2–3 cụm liên quan: biến thể, câu đáp lại, cụm cùng nhóm — không phải chính cụm đó thêm một chữ).
Câu Mức 4 (cloze_en + cloze_distractors, tách khỏi example_en; quy tắc soạn ở docs/content-style-guide.md):
- cloze_missing: chưa có câu điền từ hoặc đáp án nhiễu (mục vẫn duyệt được, nhưng câu Mức 4 sẽ lùi về Mức 3);
- cloze_missing_headword: câu không chứa đúng nguyên dạng headword (chỗ trống thay đúng chữ này) / chứa hơn một lần;
- cloze_length: ngoài CLOZE_EN_MIN_WORDS–CLOZE_EN_MAX_WORDS từ; cloze_hard_words: từ ngoài danh sách trắng như câu ví dụ;
- cloze_distractors_invalid: không đúng 3 đáp án nhiễu, trùng nhau, trùng đáp án đúng, hoặc đã có sẵn trong câu;
- cloze_distractor_level: đáp án nhiễu không thuộc cấp cho phép (A1 → A1–A2: CEFR-J hoặc headword đã soạn của cấp);
- cloze_distractor_pos: đáp án nhiễu KHÁC từ loại với đáp án đúng (đoán được bằng ngữ pháp) hoặc không tra được từ loại;
- cloze_distractor_related: đáp án nhiễu là từ đồng nghĩa (synonyms hai chiều, nghĩa tiếng Việt trùng / biến thể), biến thể
  Anh-Mỹ (uk_us_vocab.tsv) hoặc cùng họ từ (word_family hai chiều, cùng gốc + hậu tố: teach ~ teacher, sun ~ sunny).
  Việc "thay đáp án nhiễu vào chỗ trống thì câu SAI rõ ràng về nghĩa" do người soạn tự kiểm và người duyệt xác nhận.
uk_vocab, sensitive cũng quét cloze_en.
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
from dataclasses import dataclass, field
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content, morph, ukus
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
    "uk_vocab": "Có từ vựng Anh-Anh (kho từ theo chuẩn Anh-Mỹ) — đổi sang từ Mỹ, hoặc thêm ghi chú biến thể.",
    "phrase_related_repeats_headword": "Cụm liên quan lặp lại nguyên cụm này (cần biến thể, câu đáp lại hoặc cụm cùng nhóm).",
    "cloze_missing": "Chưa có câu điền từ (cloze_en) hoặc 3 đáp án nhiễu — câu Mức 4 của mục này sẽ lùi về Mức 3.",
    "cloze_missing_headword": "Câu điền từ phải chứa đúng một lần nguyên dạng từ này (chỗ trống thay đúng chữ đó).",
    "cloze_length": f"Câu điền từ phải có {config.CLOZE_EN_MIN_WORDS}–{config.CLOZE_EN_MAX_WORDS} từ.",
    "cloze_hard_words": "Câu điền từ có từ ngoài danh sách A1–A2 cho phép.",
    "cloze_distractors_invalid": f"Cần đúng {config.CLOZE_DISTRACTORS} đáp án nhiễu khác nhau, khác đáp án đúng, không có sẵn trong câu.",
    "cloze_distractor_level": "Đáp án nhiễu nằm ngoài cấp cho phép (A1: chỉ từ A1–A2).",
    "cloze_distractor_pos": "Đáp án nhiễu khác từ loại với đáp án đúng (người học đoán được bằng ngữ pháp).",
    "cloze_distractor_related": "Đáp án nhiễu là từ đồng nghĩa, biến thể Anh-Mỹ hoặc cùng họ từ với đáp án đúng — có thể cũng đúng.",
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
    text = " " + " ".join(morph.tokens(" ".join([e.example_en, e.definition_en, e.cloze_en, *e.collocations, e.headword]))) + " "
    hits = sorted(k for k in keywords if " " + " ".join(morph.tokens(k)) + " " in text)
    if hits:
        return "sensitive", ", ".join(hits)


def rule_uk_vocab(e: ContentEntry):
    found = []
    us = ukus.headword_replacement(e.headword, e.pos)
    if us:
        found.append(f"headword: {e.headword} → {us}")
    note = ukus.variant_note(e.headword, e.pos)
    if note and not e.variant_note:
        found.append(f"headword: thiếu variant_note \"{note}\"")
    for field, texts in (("example_en", [e.example_en]), ("collocations", e.collocations), ("definition_en", [e.definition_en]),
                         ("cloze_en", [e.cloze_en])):
        for p in {p for text in texts for p in ukus.text_terms(text)}:
            found.append(f"{field}: {p.uk} → {p.us}")
    if found:
        return "uk_vocab", "; ".join(sorted(found))


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


# ---------- Câu Mức 4 (cloze) ----------

@dataclass
class WordInfo:
    """Thông tin tra cứu một từ có thể làm đáp án nhiễu (từ CEFR-J candidates + các mục đã soạn của cấp)."""

    pos: set[str] = field(default_factory=set)
    levels: set[str] = field(default_factory=set)
    entries: list[ContentEntry] = field(default_factory=list)  # mục đã soạn (nghĩa, đồng nghĩa, họ từ)


@dataclass
class ClozeIndex:
    level: str
    words: dict[str, WordInfo]

    def info(self, word: str) -> WordInfo | None:
        return self.words.get(word.strip().lower())


def build_cloze_index(level: str, candidates: list[dict] | None, topics: list[TopicFile]) -> ClozeIndex:
    words: dict[str, WordInfo] = defaultdict(WordInfo)
    for c in candidates or []:
        w = words[c["headword"].strip().lower()]
        w.pos.add(c.get("pos") or "")
        w.levels |= set((c.get("cefr") or {}).values())
    for t in topics:
        for e in t.entries:
            if e.status == "rejected":
                continue
            w = words[e.headword.strip().lower()]
            w.pos.add(e.pos)
            w.levels.add(level)
            w.entries.append(e)
    return ClozeIndex(level, dict(words))


FAMILY_SUFFIXES = ("s", "es", "er", "ers", "or", "ing", "ed", "y", "ly", "ful", "ness", "ment", "tion", "ion", "ist",
                   "ian", "al", "ish", "less", "en", "est", "ty", "th")


def same_family(a: str, b: str) -> bool:
    """Cùng gốc (dạng biến đổi của nhau, hoặc từ ngắn + hậu tố: teach ~ teacher, sun ~ sunny, happy ~ happiness)."""
    a, b = a.strip().lower(), b.strip().lower()
    if a == b or morph.word_forms(a) & morph.word_forms(b):
        return True
    short, long_ = sorted((a, b), key=len)
    if len(short) < 3 or " " in short or " " in long_:
        return False
    stems = {short, short[:-1] + "i" if short.endswith("y") else short, short[:-1] if short.endswith("e") else short}
    if short[-1] not in "aeiouy" and len(short) >= 3:
        stems.add(short + short[-1])  # sun → sunny, run → runner
    return any(long_.startswith(s) and long_[len(s):] in FAMILY_SUFFIXES for s in stems)


def cloze_headword_count(sentence: str, headword: str) -> int:
    pattern = re.compile(rf"(?<![\w'-]){re.escape(headword.strip())}(?![\w'-])", re.IGNORECASE)
    return len(pattern.findall(sentence or ""))


def rule_cloze_missing(e: ContentEntry):
    if not e.cloze_en.strip() or not e.cloze_distractors:
        return "cloze_missing", "thiếu câu" if not e.cloze_en.strip() else "thiếu đáp án nhiễu"


def rule_cloze_sentence(e: ContentEntry) -> list[tuple[str, str]]:
    if not e.cloze_en.strip():
        return []
    out = []
    n = cloze_headword_count(e.cloze_en, e.headword)
    if n != 1:
        out.append(("cloze_missing_headword", f"{n} lần \"{e.headword}\" trong: {e.cloze_en}"))
    count = len(morph.tokens(e.cloze_en)) + len([t for t in words(e.cloze_en) if NUMBER_TOKEN.match(t.strip(".,!?"))])
    if not config.CLOZE_EN_MIN_WORDS <= count <= config.CLOZE_EN_MAX_WORDS:
        out.append(("cloze_length", f"{count} từ"))
    return out


def rule_cloze_hard_words(e: ContentEntry, whitelist: set[str] | None):
    if whitelist is None or not e.cloze_en.strip():
        return None
    allowed = whitelist | morph.headword_forms(e.headword, e.pos)
    hard = sorted({t for t in morph.tokens(e.cloze_en) if t not in allowed and contraction_base(t) not in allowed})
    if hard:
        return "cloze_hard_words", ", ".join(hard)


def rule_cloze_distractors(e: ContentEntry, index: ClozeIndex | None) -> list[tuple[str, str]]:
    if not e.cloze_distractors:
        return []
    out = []
    head = e.headword.strip().lower()
    ds = [d.strip() for d in e.cloze_distractors]
    problems = []
    if len(ds) != config.CLOZE_DISTRACTORS:
        problems.append(f"có {len(ds)} đáp án")
    lowered = [d.lower() for d in ds]
    if any(not d for d in ds) or len(set(lowered)) != len(lowered):
        problems.append("trùng nhau / rỗng")
    if head in lowered:
        problems.append(f"trùng đáp án đúng \"{e.headword}\"")
    in_sentence = [d for d in ds if d and cloze_headword_count(e.cloze_en, d)]
    if in_sentence:
        problems.append("có sẵn trong câu: " + ", ".join(in_sentence))
    if problems:
        out.append(("cloze_distractors_invalid", "; ".join(problems)))
    if index is None:
        return out
    allowed_levels = set(ALLOWED_EXAMPLE_LEVELS[index.level][:2])  # A1 → A1–A2
    bad_level, bad_pos, related = [], [], []
    pairs = ukus.load()
    mine = meaning_senses(e.meaning_vi)
    for d in ds:
        if not d:
            continue
        low = d.lower()
        info = index.info(d)
        if info is None or not info.levels & allowed_levels:
            bad_level.append(d)
        if info is None or e.pos not in info.pos:
            bad_pos.append(f"{d} ({', '.join(sorted(p for p in (info.pos if info else set()) if p)) or 'không rõ'})")
        reasons = []
        if low in {s.lower() for s in e.synonyms} or any(head in {s.lower() for s in o.synonyms} for o in (info.entries if info else [])):
            reasons.append("đồng nghĩa")
        elif info and any(senses_overlap(mine, meaning_senses(o.meaning_vi)) for o in info.entries if o.meaning_vi.strip()):
            reasons.append("trùng nghĩa tiếng Việt")
        if any({p.uk, p.us.lower()} == {head, low} for p in pairs):
            reasons.append("biến thể Anh-Mỹ")
        if (low in {w.lower() for w in e.word_family}
                or any(head in {w.lower() for w in o.word_family} for o in (info.entries if info else []))
                or same_family(head, low)):
            reasons.append("cùng họ từ")
        if reasons:
            related.append(f"{d}: {', '.join(reasons)}")
    if bad_level:
        out.append(("cloze_distractor_level", ", ".join(bad_level)))
    if bad_pos:
        out.append(("cloze_distractor_pos", f"cần {e.pos}: " + ", ".join(bad_pos)))
    if related:
        out.append(("cloze_distractor_related", "; ".join(related)))
    return out


def cloze_rules(e: ContentEntry, *, whitelist: set[str] | None, index: ClozeIndex | None) -> list[tuple[str, str]]:
    found = [rule_cloze_missing(e), *rule_cloze_sentence(e), rule_cloze_hard_words(e, whitelist), *rule_cloze_distractors(e, index)]
    return [f for f in found if f]


def entry_rules(e: ContentEntry, *, whitelist: set[str] | None, keywords: set[str], vn: set[str] | None = None,
                cloze_index: ClozeIndex | None = None) -> list[tuple[str, str]]:
    vn = config.read_word_list(config.VN_CONTEXT_ALLOWLIST) if vn is None else vn
    found = [rule_example_contains_headword(e), rule_meaning(e), rule_meaning_pronoun(e), rule_definition_length(e), rule_example_length(e),
             rule_hard_words(e, whitelist), rule_vn_context(e, vn), rule_ipa(e), rule_sensitive(e, keywords), rule_collocations(e),
             rule_uk_vocab(e)]
    return [f for f in found if f] + cloze_rules(e, whitelist=whitelist, index=cloze_index)


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
    cloze_index = build_cloze_index(level, candidates, topics)
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
            found = entry_rules(e, whitelist=whitelist, keywords=keywords, vn=vn, cloze_index=cloze_index) + dupes.get(e.content_key, [])
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
