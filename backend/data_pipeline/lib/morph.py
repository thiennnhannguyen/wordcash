"""
Hình thái tiếng Anh tối giản cho kho từ (hàm thuần): sinh dạng biến đổi của một headword (số nhiều, ngôi thứ ba, quá khứ,
phân từ, -ing, so sánh) để kiểm tra câu ví dụ "có chứa headword hoặc dạng biến đổi"; lấy lemma bảo thủ khi chuẩn hóa nguồn.

Không dùng thư viện NLP ngoài: quy tắc thường + bảng bất quy tắc thường gặp ở A1–B1. Cụm nhiều từ: biến đổi từ đầu (động từ
cụm "get up" → "got up") và từ cuối (danh từ ghép "bus stop" → "bus stops").
"""

import re

IRREGULAR_VERBS = {
    "be": ["am", "is", "are", "was", "were", "been", "being"],
    "have": ["has", "had", "having"], "do": ["does", "did", "done", "doing"], "go": ["goes", "went", "gone", "going"],
    "say": ["said"], "make": ["made"], "get": ["got", "gotten", "getting"], "know": ["knew", "known"], "think": ["thought"],
    "take": ["took", "taken"], "see": ["saw", "seen"], "come": ["came"], "give": ["gave", "given"], "find": ["found"],
    "tell": ["told"], "feel": ["felt"], "leave": ["left"], "bring": ["brought"], "begin": ["began", "begun"],
    "keep": ["kept"], "hold": ["held"], "write": ["wrote", "written"], "stand": ["stood"], "hear": ["heard"],
    "let": ["let"], "mean": ["meant"], "set": ["set"], "meet": ["met"], "run": ["ran"], "pay": ["paid"], "sit": ["sat"],
    "speak": ["spoke", "spoken"], "lie": ["lay", "lain", "lying"], "lead": ["led"], "read": ["read"], "grow": ["grew", "grown"],
    "lose": ["lost"], "fall": ["fell", "fallen"], "send": ["sent"], "build": ["built"], "understand": ["understood"],
    "draw": ["drew", "drawn"], "break": ["broke", "broken"], "spend": ["spent"], "cut": ["cut"], "rise": ["rose", "risen"],
    "drive": ["drove", "driven"], "buy": ["bought"], "wear": ["wore", "worn"], "choose": ["chose", "chosen"],
    "eat": ["ate", "eaten"], "drink": ["drank", "drunk"], "sleep": ["slept"], "swim": ["swam", "swum"], "sing": ["sang", "sung"],
    "fly": ["flew", "flown", "flies"], "teach": ["taught"], "catch": ["caught"], "sell": ["sold"], "forget": ["forgot", "forgotten"],
    "wake": ["woke", "woken"], "ride": ["rode", "ridden"], "put": ["put"], "shut": ["shut"], "hit": ["hit"], "cost": ["cost"],
    "win": ["won"], "throw": ["threw", "thrown"], "blow": ["blew", "blown"], "fight": ["fought"], "hide": ["hid", "hidden"],
    "shake": ["shook", "shaken"], "steal": ["stole", "stolen"], "feed": ["fed"], "light": ["lit"], "dig": ["dug"],
    "hang": ["hung"], "lend": ["lent"], "ring": ["rang", "rung"], "shine": ["shone"], "shoot": ["shot"], "sweep": ["swept"],
    "bite": ["bit", "bitten"], "freeze": ["froze", "frozen"], "dream": ["dreamt", "dreamed"], "learn": ["learnt", "learned"],
    "spell": ["spelt", "spelled"], "burn": ["burnt", "burned"], "smell": ["smelt", "smelled"],
}
IRREGULAR_PLURALS = {
    "man": "men", "woman": "women", "child": "children", "person": "people", "foot": "feet", "tooth": "teeth",
    "mouse": "mice", "goose": "geese", "fish": "fish", "sheep": "sheep", "deer": "deer", "knife": "knives", "wife": "wives",
    "life": "lives", "leaf": "leaves", "half": "halves", "wolf": "wolves", "shelf": "shelves", "loaf": "loaves",
    "potato": "potatoes", "tomato": "tomatoes", "hero": "heroes", "box": "boxes", "bus": "buses", "glass": "glasses",
    "dress": "dresses", "watch": "watches", "dish": "dishes", "class": "classes",
}
IRREGULAR_COMPARATIVES = {"good": ["better", "best"], "bad": ["worse", "worst"], "far": ["farther", "farthest", "further", "furthest"],
                          "many": ["more", "most"], "much": ["more", "most"], "little": ["less", "least"]}
VOWELS = set("aeiou")


def _cvc(word: str) -> bool:
    """Kết thúc phụ âm–nguyên âm–phụ âm một âm tiết ngắn (stop → stopped), trừ w, x, y."""
    return (len(word) >= 3 and word[-1] not in VOWELS | set("wxy") and word[-2] in VOWELS and word[-3] not in VOWELS
            and len(re.findall(r"[aeiou]+", word)) == 1)


def plural(word: str) -> str:
    if word in IRREGULAR_PLURALS:
        return IRREGULAR_PLURALS[word]
    if re.search(r"(s|x|z|ch|sh)$", word):
        return word + "es"
    if word.endswith("y") and len(word) > 1 and word[-2] not in VOWELS:
        return word[:-1] + "ies"
    return word + "s"


def verb_forms(word: str) -> set[str]:
    if re.search(r"(s|x|z|ch|sh|o)$", word):
        forms = {word + "es"}  # ngôi thứ ba số ít
    elif word.endswith("y") and word[-2:-1] not in VOWELS:
        forms = {word[:-1] + "ies"}
    else:
        forms = {word + "s"}
    if word.endswith("e") and not word.endswith("ee"):
        stem = word[:-1]
        forms |= {word + "d", stem + "ing"}
    elif word.endswith("ie"):
        forms |= {word + "d", word[:-2] + "ying"}
    elif word.endswith("y") and word[-2:-1] not in VOWELS:
        forms |= {word[:-1] + "ied", word + "ing"}
    elif _cvc(word):
        forms |= {word + word[-1] + "ed", word + word[-1] + "ing", word + "ed", word + "ing"}
    else:
        forms |= {word + "ed", word + "ing"}
    forms |= set(IRREGULAR_VERBS.get(word, []))
    return forms


def adjective_forms(word: str) -> set[str]:
    if word in IRREGULAR_COMPARATIVES:
        return set(IRREGULAR_COMPARATIVES[word])
    if word.endswith("e"):
        return {word + "r", word + "st"}
    if word.endswith("y") and word[-2:-1] not in VOWELS:
        return {word[:-1] + "ier", word[:-1] + "iest"}
    if _cvc(word):
        return {word + word[-1] + "er", word + word[-1] + "est"}
    return {word + "er", word + "est"}


def word_forms(word: str, pos: str | None = None) -> set[str]:
    """Mọi dạng chấp nhận được của MỘT từ (gồm chính nó). Không biết từ loại thì gộp mọi khả năng."""
    word = word.lower()
    forms = {word}
    if pos in (None, "noun", "number"):
        forms.add(plural(word))
    if pos in (None, "verb"):
        forms |= verb_forms(word)
    if pos in (None, "adjective", "adverb"):
        forms |= adjective_forms(word)
    if word == "be":
        forms |= set(IRREGULAR_VERBS["be"]) | {"'m", "'s", "'re"}
    return forms


def headword_forms(headword: str, pos: str | None = None) -> set[str]:
    """Dạng biến đổi của headword, kể cả cụm nhiều từ (đổi từ đầu cho động từ cụm, từ cuối cho danh từ ghép)."""
    parts = headword.lower().split()
    if len(parts) == 1:
        return word_forms(parts[0], pos)
    out = {headword.lower()}
    for form in word_forms(parts[0], None):
        out.add(" ".join([form, *parts[1:]]))
    for form in word_forms(parts[-1], "noun"):
        out.add(" ".join([*parts[:-1], form]))
    return out


TOKEN = re.compile(r"[a-z]+(?:'[a-z]+)?")


def tokens(text: str) -> list[str]:
    return TOKEN.findall(text.lower().replace("’", "'"))


def contains_headword(sentence: str, headword: str, pos: str | None = None) -> bool:
    """Câu có chứa headword (hoặc dạng biến đổi) như một từ / cụm từ trọn vẹn không."""
    toks = tokens(sentence)
    joined = " " + " ".join(toks) + " "
    for form in headword_forms(headword, pos):
        if " " + " ".join(tokens(form)) + " " in joined:
            return True
    return False


def lemma(word: str, pos: str | None, known: set[str]) -> str:
    """Lemma bảo thủ: chỉ đưa về dạng gốc khi dạng gốc cũng có trong `known` (tránh cắt nhầm "bus" → "bu")."""
    reverse_plural = {v: k for k, v in IRREGULAR_PLURALS.items()}
    if word in reverse_plural and reverse_plural[word] in known:
        return reverse_plural[word]
    if pos in ("noun", None):
        for suffix, repl in (("ies", "y"), ("es", ""), ("s", "")):
            if word.endswith(suffix) and len(word) > len(suffix) + 1:
                base = word[: -len(suffix)] + repl
                if base in known and plural(base) == word:
                    return base
    return word
