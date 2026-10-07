"""
Chữ hoa của headword HIỂN THỊ (content/*.json, DB, giao diện). Khóa (content_key, selection, cache) luôn dùng chữ thường.

- Từ luôn viết hoa: "I" và dạng rút gọn (I'm, I'll…), thứ trong tuần, tháng, viết tắt (TV, DVD, CD, OK, Mr., Mrs.), tên riêng
  (proper_names.txt) và từ đời sống Việt Nam (vn_context_allowlist.txt: Tet, Hanoi, Ho Chi Minh City…). Món ăn trong danh
  sách (pho, banh mi, com…) giữ chữ thường như danh từ chung.
- Câu giao tiếp trọn vẹn nhiều từ (thán từ như "good morning", cụm từ giao tiếp cơ bản, cụm bắt đầu bằng "it's", "how",
  "see"…) viết hoa chữ cái đầu: "Good morning", "I'm hungry", "It's hot", "See you later". Cụm từ thường ("fried rice",
  "a cup of", "take care of") và từ đơn ("hello", "rice") giữ chữ thường.
"""

from functools import lru_cache

from data_pipeline import config

FIXED = {
    "i": "I", "i'm": "I'm", "i'll": "I'll", "i've": "I've", "i'd": "I'd",
    "tv": "TV", "dvd": "DVD", "cd": "CD", "ok": "OK", "mr": "Mr.", "mrs": "Mrs.", "ms": "Ms.",
    **{d: d.capitalize() for d in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january",
                                  "february", "march", "april", "may", "june", "july", "august", "september", "october",
                                  "november", "december", "english", "vietnamese")},
}
# Từ đời sống Việt Nam viết thường như danh từ chung (món ăn, đồ vật)
COMMON_VN = {"pho", "banh mi", "bun cha", "bun bo", "com tam", "com", "banh chung", "banh xeo", "nem", "che", "ca phe sua da",
             "ao dai", "non la", "motorbike", "cyclo", "dong"}
UTTERANCE_STARTS = {"i'm", "it's", "you're", "how", "what", "where", "see", "nice", "thank", "thanks", "good", "happy",
                    "excuse", "welcome", "bye", "goodbye"}


@lru_cache(maxsize=1)
def proper_terms() -> dict[str, str]:
    """Tên riêng / địa danh nhiều từ → dạng viết hoa (chữ thường → Title Case)."""
    terms = config.read_word_list(config.PROPER_NAMES) | config.read_word_list(config.VN_CONTEXT_ALLOWLIST)
    return {t: " ".join(w.capitalize() for w in t.split()) for t in terms if t not in COMMON_VN}


@lru_cache(maxsize=1)
def proper_tokens() -> dict[str, str]:
    """Từ đơn viết hoa cả khi đứng trong cụm (Tet, Hanoi…). Tên người (An, Nam, Mai…) chỉ viết hoa khi đứng riêng, vì trùng
    từ tiếng Anh ("an apple")."""
    vn = config.read_word_list(config.VN_CONTEXT_ALLOWLIST)
    return {t: t.capitalize() for t in vn if " " not in t and t not in COMMON_VN}


def _cap_first(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def display_headword(headword: str, pos: str | None = None, basic_communication: bool = False) -> str:
    """Dạng hiển thị đúng chữ hoa của headword (đầu vào chữ thường); hàm lũy đẳng."""
    low = headword.strip().lower()
    proper = proper_terms()
    if low in proper:
        return proper[low]
    tokens = proper_tokens()
    words = [FIXED.get(w, tokens.get(w, w)) for w in low.split()]
    text = " ".join(words)
    utterance = len(words) > 1 and (pos == "interjection" or (pos == config.POS_PHRASE and (
        basic_communication or low.split()[0] in UTTERANCE_STARTS)))
    return _cap_first(text) if utterance else text
