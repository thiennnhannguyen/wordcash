"""
Phiên âm IPA en-US từ CMU Pronouncing Dictionary (quyết định 2). Hàm thuần + bộ nạp cmudict (lười, một lần).

- Định dạng giống dữ liệu đang có: "/ˈwɔːtɚ/" — có gạch chéo, dấu nhấn chính ˈ / phụ ˌ đặt trước âm tiết, không chấm tách
  âm tiết; từ một âm tiết không ghi dấu nhấn.
- Cụm từ: ghép phiên âm từng từ theo cmudict, cách nhau một khoảng trắng; TỪ NỘI DUNG giữ dấu nhấn (từ một âm tiết cũng ghi
  ˈ: "/ˈteɪk ˈkɛr ʌv/"), TỪ CHỨC NĂNG (exclude_function_words.txt, kể cả dạng rút gọn I'm, it's) bỏ dấu nhấn. Một từ không có
  trong cmudict → cả cụm None (ipa_unverified).
- Dạng đọc lướt (weak form) trong cụm: từ chức năng không nhấn thường gặp dùng dạng đọc lướt theo `WEAK_FORMS` (of /əv/, to /tə/,
  the /ðə/ — trước nguyên âm /ði/…), không lấy dạng đầy đủ của cmudict. Từ chức năng đứng riêng (headword một từ) vẫn dùng dạng
  đầy đủ.
- Âm tiết: mỗi nguyên âm là một nhân; phụ âm giữa hai nguyên âm chia theo nguyên tắc "phụ âm đầu dài nhất hợp lệ" (ONSETS).
- Lấy cách đọc đầu tiên của cmudict (cách đọc chính). Từ không có trong cmudict → None (nơi gọi gắn `ipa_unverified`).
"""

from functools import lru_cache
from pathlib import Path

from data_pipeline import config

VOWELS = {
    "AA": "ɑː", "AE": "æ", "AW": "aʊ", "AY": "aɪ", "EH": "ɛ", "EY": "eɪ", "IH": "ɪ", "OW": "oʊ", "OY": "ɔɪ", "UH": "ʊ",
    "AO": "ɔː",
}
CONSONANTS = {
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "ɡ", "HH": "h", "JH": "dʒ", "K": "k", "L": "l", "M": "m",
    "N": "n", "NG": "ŋ", "P": "p", "R": "r", "S": "s", "SH": "ʃ", "T": "t", "TH": "θ", "V": "v", "W": "w", "Y": "j",
    "Z": "z", "ZH": "ʒ",
}
# Phụ âm đầu hợp lệ của tiếng Anh (ngoài mọi phụ âm đơn trừ NG)
ONSETS = {tuple(o.split()) for o in [
    "P L", "P R", "P Y", "B L", "B R", "B Y", "T R", "T W", "D R", "D W", "K L", "K R", "K W", "K Y", "G L", "G R", "G W",
    "F L", "F R", "F Y", "TH R", "TH W", "SH R", "S P", "S T", "S K", "S M", "S N", "S L", "S W", "S F", "S P L", "S P R",
    "S T R", "S K R", "S K W", "S K Y", "M Y", "N Y", "V Y", "HH Y", "HH W", "L Y",
]} | {(c,) for c in CONSONANTS if c != "NG"}


def vowel_ipa(phone: str) -> str:
    base, stress = phone[:-1], phone[-1]
    if base == "AH":
        return "ə" if stress == "0" else "ʌ"
    if base == "ER":
        return "ɚ" if stress == "0" else "ɝː"
    if base == "IY":
        return "i" if stress == "0" else "iː"
    if base == "UW":
        return "u" if stress == "0" else "uː"
    return VOWELS[base]


def is_vowel(phone: str) -> bool:
    return phone[-1].isdigit()


def syllables(phones: list[str]) -> list[list[str]]:
    nuclei = [i for i, p in enumerate(phones) if is_vowel(p)]
    if not nuclei:
        return [phones]
    bounds = [0]
    for a, b in zip(nuclei, nuclei[1:]):
        cluster = phones[a + 1:b]
        split = len(cluster)  # mặc định: mọi phụ âm thuộc âm tiết trước (không có phụ âm đầu)
        for k in range(len(cluster) + 1):
            if not cluster[k:] or tuple(cluster[k:]) in ONSETS:
                split = k
                break
        bounds.append(a + 1 + split)
    bounds.append(len(phones))
    return [phones[s:e] for s, e in zip(bounds, bounds[1:])]


def arpabet_to_ipa(arpabet: str | list[str]) -> str:
    """'W AO1 T ER0' → 'ˈwɔːtɚ' (không kèm gạch chéo).

    Theo cách ghi của từ điển: chỉ một nhấn chính (nhấn chính cuối cùng; nhấn chính trước đó thành nhấn phụ, vd. thirteen
    /ˌθɝːˈtiːn/); nhấn phụ ĐỨNG SAU nhấn chính không ghi dấu và iː/uː ở đó đọc rút gọn (tomato /təˈmeɪtoʊ/, thirty /ˈθɝːdi/).
    """
    phones = arpabet.split() if isinstance(arpabet, str) else list(arpabet)
    syls = syllables(phones)
    stresses = [next((p[-1] for p in syl if is_vowel(p)), "0") for syl in syls]
    primary = max((i for i, st in enumerate(stresses) if st == "1"), default=None)
    out = []
    for i, syl in enumerate(syls):
        stress = stresses[i]
        if stress == "1" and i != primary:
            stress = "2"
        if stress == "2" and primary is not None and i > primary:
            stress = "0"
        text = "".join((vowel_ipa(p[:-1] + stress) if p[:-1] in ("IY", "UW") else vowel_ipa(p)) if is_vowel(p) else CONSONANTS[p]
                       for p in syl)
        if len(syls) > 1 and stress == "1":
            text = "ˈ" + text
        elif len(syls) > 1 and stress == "2":
            text = "ˌ" + text
        out.append(text)
    return "".join(out)


@lru_cache(maxsize=1)
def load_cmudict(path: str | None = None) -> dict[str, str]:
    """{từ chữ thường: cách đọc ARPAbet đầu tiên}."""
    out: dict[str, str] = {}
    for line in Path(path or config.CMUDICT).read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        word, _, pron = line.partition(" ")
        if "(" in word:  # biến thể (2), (3)… — giữ cách đọc đầu tiên
            continue
        out.setdefault(word.lower(), pron.strip())
    return out


# Dạng đọc lướt của từ chức năng khi đứng trong cụm (không nhấn). "the" trước âm nguyên âm: THE_BEFORE_VOWEL.
WEAK_FORMS = {
    "a": "ə", "an": "ən", "of": "əv", "to": "tə", "for": "fər", "and": "ən", "can": "kən", "at": "ət", "from": "frəm",
    "some": "səm", "the": "ðə",
}
THE_BEFORE_VOWEL = "ði"
IPA_VOWEL_START = tuple("aeiouæɑɔəɛɪʊʌɝɚ")


@lru_cache(maxsize=1)
def function_words() -> frozenset[str]:
    return frozenset(config.read_word_list(config.EXCLUDE_FUNCTION_WORDS))


def is_function_word(word: str) -> bool:
    return word in function_words() or word.split("'")[0] in function_words()


def lookup(headword: str, cmudict: dict[str, str] | None = None) -> str | None:
    """IPA dạng "/…/" cho từ hoặc cụm; None nếu có từ không nằm trong cmudict."""
    cmu = cmudict if cmudict is not None else load_cmudict()
    words = headword.lower().replace("’", "'").split()
    parts = []
    for w in words:
        pron = cmu.get(w)
        if pron is None:
            return None
        text = arpabet_to_ipa(pron)
        if len(words) > 1:
            if is_function_word(w):
                text = text.replace("ˈ", "").replace("ˌ", "")
            elif "ˈ" not in text:
                text = "ˈ" + text  # từ nội dung một âm tiết trong cụm: ghi nhấn chính
        parts.append(text)
    if len(words) > 1:
        parts = weaken(words, parts)
    return "/" + " ".join(parts) + "/" if parts else None


def weaken(words: list[str], parts: list[str]) -> list[str]:
    """Thay từ chức năng trong cụm bằng dạng đọc lướt (WEAK_FORMS); "the" trước âm nguyên âm đọc /ði/."""
    out = list(parts)
    for i, w in enumerate(words):
        if w not in WEAK_FORMS:
            continue
        out[i] = WEAK_FORMS[w]
        if w == "the" and i + 1 < len(parts) and parts[i + 1].lstrip("ˈˌ").startswith(IPA_VOWEL_START):
            out[i] = THE_BEFORE_VOWEL
    return out
