"""
Tạo câu hỏi 4 mức từ một mục từ: chọn nghĩa, nghe chọn từ, gõ từ, điền vào câu; sinh đáp án nhiễu.

Hàm thuần, không phụ thuộc DB (nơi gọi truyền sẵn mục từ và nguồn đáp án nhiễu). Mỗi câu hỏi tách làm hai phần:
- `public`: phần đề gửi xuống client. KHÔNG chứa đáp án đúng, không chứa entry_id (tránh tra ngược đáp án).
- `key`: phần chỉ lưu ở server (đáp án, entry_id) để chấm khi người học nộp.

Mức 2 (nghe) chỉ tạo khi mục từ có `audio_url`: nếu client tự đọc bằng Web Speech API thì phải biết chữ của từ, tức là lộ đáp án.
Mức 4 (điền vào câu) chỉ dùng câu RIÊNG `cloze_en` (viết sao cho chỉ đúng một đáp án hợp, KHÔNG dùng câu ví dụ của thẻ học)
và đúng 3 đáp án nhiễu soạn sẵn `cloze_distractors` (đã qua kiểm tra tự động + người duyệt); không bốc đáp án nhiễu ngẫu nhiên
vì từ cùng bài thường cùng chủ đề, cùng từ loại nên dễ có nhiều đáp án đúng. Mục chưa có đủ hai trường (từ tự tạo, mục cũ) →
Mức 4 lùi về Mức 3. Không đủ điều kiện thì lùi về mức gần nhất (2 → 1, 4 → 3).
Câu chọn đáp án cần ít nhất 1 đáp án nhiễu; không có thì đổi sang câu gõ từ (mức 3).
"""

import random
import re
import unicodedata
from dataclasses import dataclass, field

BLANK = "______"
OPTION_COUNT = 4

LEVEL_TYPES = {1: "choose_meaning", 2: "listen", 3: "type_word", 4: "fill_blank"}


@dataclass(frozen=True)
class EntryData:
    id: int
    headword: str
    meaning_vi: str
    pos: str | None = None
    ipa: str | None = None
    example: str | None = None
    audio_url: str | None = None
    cloze_en: str | None = None
    cloze_distractors: tuple[str, ...] = ()


@dataclass
class Question:
    public: dict
    key: dict = field(default_factory=dict)


def normalize(text: str) -> str:
    """So khớp câu trả lời: bỏ khoảng trắng thừa, không phân biệt hoa thường, thống nhất dấu nháy."""
    text = unicodedata.normalize("NFC", text or "")
    text = text.replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", text).strip().casefold()


def check_answer(key: dict, answer: str | None) -> bool:
    return bool(answer) and normalize(answer) == normalize(key["answer"])


def blank_sentence(example: str | None, headword: str) -> str | None:
    """Thay lần xuất hiện đầu tiên của từ (đúng nguyên từ, không phân biệt hoa thường) bằng chỗ trống."""
    if not example or not headword.strip():
        return None
    pattern = re.compile(rf"(?<![\w'-]){re.escape(headword.strip())}(?![\w'-])", re.IGNORECASE)
    if not pattern.search(example):
        return None
    return pattern.sub(BLANK, example, count=1)


def cloze_ready(entry: EntryData) -> bool:
    """Đủ điều kiện câu Mức 4: câu cloze chứa đúng từ, đúng OPTION_COUNT - 1 đáp án nhiễu khác nhau và khác đáp án đúng."""
    distractors = [normalize(d) for d in entry.cloze_distractors if d and d.strip()]
    return (blank_sentence(entry.cloze_en, entry.headword) is not None
            and len(distractors) == OPTION_COUNT - 1
            and len(set(distractors)) == len(distractors)
            and normalize(entry.headword) not in distractors)


def available_levels(entry: EntryData) -> list[int]:
    levels = [1]
    if entry.audio_url:
        levels.append(2)
    levels.append(3)
    if cloze_ready(entry):
        levels.append(4)
    return levels


def resolve_level(entry: EntryData, level: int) -> int:
    if level == 2 and not entry.audio_url:
        return 1
    if level == 4 and not cloze_ready(entry):
        return 3
    return level


def _pick_distractors(correct: str, pool: list[str], rng: random.Random) -> list[str]:
    seen = {normalize(correct)}
    picks = []
    for item in rng.sample(pool, len(pool)):
        n = normalize(item)
        if item and n not in seen:
            seen.add(n)
            picks.append(item)
        if len(picks) == OPTION_COUNT - 1:
            break
    return picks


def _options(correct: str, distractors: list[str], rng: random.Random) -> list[str]:
    options = [correct, *distractors]
    rng.shuffle(options)
    return options


def build_question(qid: str, entry: EntryData, level: int, *, meaning_pool: list[str], word_pool: list[str],
                   rng: random.Random) -> Question:
    """`meaning_pool`/`word_pool`: nghĩa/từ của các mục khác để làm đáp án nhiễu (ưu tiên cùng khóa học)."""
    level = resolve_level(entry, level)
    key = {"entry_id": entry.id, "level": level}

    if level in (1, 2, 4):
        if level == 1:
            correct, pool = entry.meaning_vi, meaning_pool
        else:
            correct, pool = entry.headword, word_pool
        # Mức 4: đáp án nhiễu soạn sẵn cho đúng câu cloze (resolve_level đã bảo đảm đủ 3)
        distractors = list(entry.cloze_distractors) if level == 4 else _pick_distractors(correct, pool, rng)
        if not distractors:
            level = 3  # không có đáp án nhiễu thì câu chọn đáp án vô nghĩa
            key["level"] = 3
        else:
            options = _options(correct, distractors, rng)
            public = {"id": qid, "level": level, "type": LEVEL_TYPES[level], "options": options}
            if level == 1:
                public.update(word=entry.headword, ipa=entry.ipa, pos=entry.pos)
            elif level == 2:
                public.update(audio_url=entry.audio_url)
            else:
                public.update(sentence=blank_sentence(entry.cloze_en, entry.headword))
            return Question(public, {**key, "answer": correct})

    # Mức 3: nhìn nghĩa, gõ từ. Gửi số chữ cái (không tính khoảng trắng) để vẽ ô chữ.
    public = {
        "id": qid,
        "level": 3,
        "type": LEVEL_TYPES[3],
        "prompt": entry.meaning_vi,
        "pos": entry.pos,
        "letter_count": len(entry.headword.replace(" ", "")),
    }
    return Question(public, {**key, "answer": entry.headword})
