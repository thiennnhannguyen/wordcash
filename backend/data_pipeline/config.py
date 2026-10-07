"""
Cấu hình quy trình xây kho từ (data_pipeline): đường dẫn, tham số, model AI, giới hạn chi phí, danh sách chủ đề.

- Chạy mọi bước trong backend/: `python -m data_pipeline.01_import_wordlist` … (xem data_pipeline/README.md).
- Nội dung đã soạn / đã duyệt là CODE: backend/content/<cấp>/<mã-chủ-đề>.json. DB chỉ được nạp từ các file này.
- ANTHROPIC_API_KEY: biến môi trường, không có thì đọc backend/.env (file đã nằm trong .gitignore). Không bao giờ log hay in
  giá trị key; lỗi chỉ báo "thiếu key". ANTHROPIC_MODEL: tên model, bắt buộc khi gọi AI thật.
- MAX_AI_ENTRIES_PER_RUN: trần số mục mỗi lần chạy một bước có gọi AI (chặn chi phí ngoài ý muốn); đổi bằng biến môi
  trường cùng tên.
- Mã chủ đề: gắn với chặng trong DB qua `landmark_key` (seeds/seed_landmarks.py); tên chặng và địa danh giữ nguyên.
"""

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
PIPELINE = BACKEND / "data_pipeline"
RAW = PIPELINE / "raw"
PROCESSED = PIPELINE / "processed"
CACHE = PIPELINE / "cache"
WORK = PIPELINE / "work"  # gói việc của chế độ agent (không đưa lên Git)
VENDOR = PIPELINE / "vendor"
PROMPTS = PIPELINE / "prompts"
AUDIO_OUT = PIPELINE / "audio_out"
CONTENT = BACKEND / "content"
CMUDICT = VENDOR / "cmudict" / "cmudict.dict"
EXCLUDE_FUNCTION_WORDS = PIPELINE / "exclude_function_words.txt"
BR_US_SPELLING = PIPELINE / "br_us_spelling.tsv"
SENSITIVE_KEYWORDS = PIPELINE / "sensitive_keywords.txt"
PROPER_NAMES = PIPELINE / "proper_names.txt"
A1_EXCLUDED_TONE = PIPELINE / "a1_excluded_tone.txt"  # bước 02: vào dự phòng, lý do tone_a1
VN_CONTEXT_ALLOWLIST = PIPELINE / "vn_context_allowlist.txt"  # từ đời sống Việt Nam được phép trong câu ví dụ
VN_CONTEXT_MAX_PER_EXAMPLE = 1

# Quy mô (quyết định 6)
TARGET_PER_LEVEL = 800
TOPIC_SIZE_MIN = 48  # 3 bài × 16; chủ đề ít từ thì nhỏ hơn, không độn từ cho đủ
TOPIC_SIZE_MAX = 90
UNIT_SIZE_MIN = 15  # luật: mỗi bài 15–20 mục (CLAUDE.md); 3–5 bài × 15–20 phủ liền 45–100 mục
UNIT_SIZE_MAX = 20
UNITS_PER_TOPIC_MIN = 3
UNITS_PER_TOPIC_MAX = 5
PHRASE_RATIO = 0.1  # quyết định 4: khoảng 10% là cụm từ cố định
PHRASES_PER_UNIT_MAX = 3  # tối đa cụm từ cố định mỗi bài, rải đều trong bài và trong chủ đề
PHRASES_PER_UNIT_MAX_BY_TOPIC = {"greetings": 8}  # chủ đề chào hỏi vốn nhiều câu giao tiếp

# Giới hạn độ dài (docs/content-style-guide.md)
MEANING_VI_MAX_WORDS = 6
DEFINITION_EN_MAX_WORDS = 12
EXAMPLE_EN_MIN_WORDS = 5
EXAMPLE_EN_MAX_WORDS = 12

# AI. AI_PROVIDER: "agent" (mặc định, KHÔNG gọi API trả phí: agent đang code soạn output cho các gói việc trong work/) hoặc
# "anthropic" (chỉ khi đặt rõ; cần ANTHROPIC_API_KEY + ANTHROPIC_MODEL).
AI_PROVIDERS = ("agent", "anthropic")
ENRICH_BATCH_SIZE = 15  # 10–20 mục mỗi request
CLASSIFY_BATCH_SIZE = 40
AI_MAX_RETRIES = 3
TOPIC_CONFIDENCE_MIN = 0.6  # thấp hơn → needs_topic_review
MAX_AI_ENTRIES_PER_RUN = int(os.environ.get("MAX_AI_ENTRIES_PER_RUN", "1000"))
# Ước tính chi phí (chỉ để in trước khi chạy; số thật xem hóa đơn): token mỗi mục và giá USD / 1 triệu token
EST_INPUT_TOKENS_PER_REQUEST = 3500  # prompt hệ thống + hướng dẫn
EST_INPUT_TOKENS_PER_ENTRY = 40
EST_OUTPUT_TOKENS_PER_ENTRY = 260
PRICE_INPUT_PER_MTOK = float(os.environ.get("AI_PRICE_INPUT_PER_MTOK", "3"))
PRICE_OUTPUT_PER_MTOK = float(os.environ.get("AI_PRICE_OUTPUT_PER_MTOK", "15"))

DEFAULT_BRANCH = "foundation"
POS_PHRASE = "phrase"


@dataclass(frozen=True)
class TopicConfig:
    level: str
    code: str  # tên file content/<cấp>/<code>.json và phần giữa của content_key
    landmark_key: str  # khớp topics.landmark_key trong DB
    title: str  # tên chặng (giữ nguyên như DB)
    hint_en: str  # mô tả ngắn cho AI phân loại


# 10 chủ đề A1, đúng thứ tự và tên của seeds/seed_landmarks.py (test kiểm tra khớp)
TOPICS: dict[str, list[TopicConfig]] = {
    "A1": [
        TopicConfig("A1", "greetings", "a1_ho_guom", "Chào hỏi", "greetings, introductions, polite everyday phrases, feelings"),
        TopicConfig("A1", "family", "a1_van_mieu", "Gia đình", "family members, people, describing people, age, relationships"),
        TopicConfig("A1", "numbers_time", "a1_chua_mot_cot", "Số đếm và thời gian", "numbers, days, months, clock time, dates, daily routine times"),
        TopicConfig("A1", "food", "a1_pho_co", "Đồ ăn", "food, drinks, meals, cooking, eating out"),
        TopicConfig("A1", "home", "a1_mu_cang_chai", "Nhà cửa", "house, rooms, furniture, household objects, daily chores"),
        TopicConfig("A1", "travel", "a1_cau_long_bien", "Đi lại", "transport, directions, places in town, travel"),
        TopicConfig("A1", "shopping", "a1_cho_dong_xuan", "Mua sắm", "shops, money, prices, clothes, colors, sizes"),
        TopicConfig("A1", "weather", "a1_fansipan", "Thời tiết", "weather, seasons, temperature, clothes for weather"),
        TopicConfig("A1", "nature", "a1_trang_an", "Thiên nhiên", "animals, plants, landscape, outdoor activities"),
        TopicConfig("A1", "school", "a1_ma_pi_leng", "Trường học và học tập", "school, classroom objects, subjects, studying, hobbies"),
    ],
}


def topics(level: str) -> list[TopicConfig]:
    return TOPICS[level.upper()]


def topic(level: str, code: str) -> TopicConfig:
    for t in topics(level):
        if t.code == code:
            return t
    raise KeyError(f"Không có chủ đề {code} ở cấp {level}")


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def env(name: str) -> str | None:
    """Biến môi trường, không có thì đọc backend/.env. KHÔNG in giá trị (có thể là bí mật)."""
    return os.environ.get(name) or _read_env_file(BACKEND / ".env").get(name) or None


def ai_provider() -> str:
    provider = (env("AI_PROVIDER") or "agent").strip().lower()
    if provider not in AI_PROVIDERS:
        raise RuntimeError(f"AI_PROVIDER phải là một trong {', '.join(AI_PROVIDERS)} (đang là {provider!r}).")
    return provider


def anthropic_api_key() -> str:
    key = env("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("AI_PROVIDER=anthropic nhưng thiếu ANTHROPIC_API_KEY (đặt trong backend/.env hoặc biến môi trường). "
                           "Muốn dùng chế độ không tốn phí thì bỏ AI_PROVIDER (mặc định agent).")
    return key


def anthropic_model() -> str:
    model = env("ANTHROPIC_MODEL")
    if not model:
        raise RuntimeError("Thiếu ANTHROPIC_MODEL (tên model Claude, đặt trong backend/.env hoặc biến môi trường).")
    return model


def read_word_list(path: Path) -> set[str]:
    """File danh sách một mục mỗi dòng; bỏ dòng trống và chú thích '#'. Chữ thường."""
    if not path.exists():
        return set()
    out = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip().lower()
        if line:
            out.add(line)
    return out
