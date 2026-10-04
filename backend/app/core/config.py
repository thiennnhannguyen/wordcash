"""
Cấu hình đọc từ file `.env` ở gốc repo (không phải `backend/`) và biến môi trường, qua pydantic-settings.
Các hằng số luật game cũng đặt ở đây để không rải con số trong code; có thể ghi đè bằng biến môi trường cùng tên.
"""

from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


def _to_async_url(url: str) -> str:
    """Đổi URL PostgreSQL kiểu đồng bộ (postgres://, postgresql://) sang driver asyncpg."""
    for prefix in ("postgres://", "postgresql://", "postgresql+psycopg2://"):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url[len(prefix):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    ENV: str = "development"  # development | testing | e2e | production

    DATABASE_URL: str = "postgresql+asyncpg://wordclash:wordclash_password@localhost:5433/wordclash_db"
    TEST_DATABASE_URL: str = "postgresql+asyncpg://wordclash:wordclash_password@localhost:5433/wordclash_test"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Token
    JWT_SECRET_KEY: str = "dev-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    # Token vừa bị xoay vòng mà được dùng lại trong khoảng này (nhiều tab refresh cùng lúc) thì vẫn cấp token mới
    REFRESH_REUSE_GRACE_SECONDS: int = 30

    FRONTEND_URL: str = "http://localhost:5173"
    # /docs, /redoc, /openapi.json luôn bật khi dev; ở production chỉ bật khi ENABLE_DOCS=true
    ENABLE_DOCS: bool = False
    TTS_API_KEY: str = ""

    # Cookie chứa refresh token (httpOnly). COOKIE_SECURE để trống thì tự bật khi ENV=production.
    COOKIE_NAME: str = "wc_refresh"
    COOKIE_SECURE: bool | None = None
    COOKIE_DOMAIN: str | None = None
    COOKIE_PATH: str = "/api/v1/auth"

    # Chống dò mật khẩu, giới hạn phiên
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_WINDOW_SECONDS: int = 900
    REGISTER_MAX_PER_HOUR: int = 10
    MAX_SESSIONS_PER_USER: int = 10
    DEFAULT_TIMEZONE: str = "Asia/Ho_Chi_Minh"
    # Chạy sau reverse proxy tin cậy (Railway, Render, Nginx): đọc IP từ X-Forwarded-For.
    # TRUSTED_PROXY_HOPS = số proxy tin cậy đứng trước app; IP thật là phần tử thứ HOPS tính từ phải sang.
    TRUST_PROXY: bool = False
    TRUSTED_PROXY_HOPS: int = 1

    # Socket.IO: bật khi chạy nhiều tiến trình để đồng bộ sự kiện qua Redis
    SIO_USE_REDIS: bool = False

    # Học tập, Cửa Ải, rank
    DAILY_FORGET_PENALTY: int = 1
    UNIT_PASS_RATE: float = 0.8  # qua bài (kiểm tra cuối bài)
    TOPIC_PASS_RATE: float = 0.8  # qua bài tổng hợp chặng
    BOSS_PASS_RATE: float = 0.85  # thắng Trận Boss
    RANK_GRACE_DAYS: int = 3  # vùng đệm "lung lay" trước khi tụt rank thật
    # Rank theo mastered_count (chỉ từ hệ thống): mã → số từ tối thiểu, theo thứ tự tăng dần
    RANK_THRESHOLDS: dict[str, int] = {
        "tan_binh": 0, "dong": 100, "bac": 300, "vang": 600, "bach_kim": 1000, "kim_cuong": 2000, "cao_thu": 3500, "huyen_thoai": 5000,
    }

    # Học Viện
    UNIT_TEST_QUESTIONS: int = 20  # hoặc toàn bộ từ của bài nếu ít hơn
    TOPIC_TEST_QUESTIONS: int = 20
    TOPIC_PRACTICE_QUESTIONS: int = 10  # luyện chặng yếu (tối thiểu)
    BOSS_QUESTIONS: int = 50
    BOSS_WEAK_TOPICS: int = 2  # số chặng yếu chỉ ra sau khi thua Boss
    BOSS_RETRY_COOLDOWN_HOURS: int = 12  # chưa luyện đủ chặng yếu thì chờ từng này giờ kể từ lần thua
    REVIEW_SESSION_LIMIT: int = 20

    # Cửa Ải Hôm Nay
    DAILY_CHECK_MIN_WORDS: int = 2  # dưới mức này (từ hệ thống đã học) thì được miễn hôm đó
    DAILY_CHECK_MAX_WORDS: int = 5
    DAILY_CHECK_RANDOM_WORDS: int = 2  # số từ trộn ngẫu nhiên, còn lại ưu tiên từ sắp đến hạn ôn
    STREAK_SPIN_EVERY: int = 7  # streak chạm bội số này thì +1 lượt quay thường
    # Mục tiêu từ mới mỗi ngày theo thời lượng chọn ở onboarding (phút → số từ); chỉ hiển thị, không chặn
    DAILY_GOAL_BY_MINUTES: dict[int, int] = {5: 10, 10: 12, 15: 15, 20: 20}

    # Lặp lại ngắt quãng (SM-2): khoảng ôn cho 5 lần nhớ đầu, sau đó nhân với hệ số dễ
    SRS_INTERVALS: list[int] = [1, 3, 7, 16, 35]
    SRS_START_EASE: float = 2.5
    SRS_MIN_EASE: float = 1.3
    # "Đã thuộc": đúng ở mức ≥ MASTERY_MIN_LEVEL vào ≥ MASTERY_MIN_DAYS ngày khác nhau
    MASTERY_MIN_LEVEL: int = 3
    MASTERY_MIN_DAYS: int = 3
    # Hạn mức CỨNG từ mới mỗi ngày (chung Học Viện + Khóa học). Vượt mức này thì học bài chỉ luyện lại từ đã gặp.
    # Mục tiêu ngày (DAILY_GOAL_BY_MINUTES) chỉ để hiển thị, động viên; KHÔNG chặn.
    NEW_WORDS_DAILY_CAP: int = 40

    # Khóa học của tôi (giới hạn MVP)
    COURSE_MAX_ACTIVE: int = 50  # khóa đang học
    COURSE_MAX_ARCHIVED: int = 100  # khóa đã lưu trữ
    COURSE_MAX_WORDS: int = 500
    IMPORT_MAX_ROWS: int = 200
    CUSTOM_ENTRY_MAX_PER_USER: int = 1000
    STUDY_SESSION_TTL_HOURS: int = 24
    STUDY_DEFAULT_LIMIT: int = 10
    STUDY_MAX_LIMIT: int = 50
    STUDY_QUICK_QUESTIONS: int = 20
    STUDY_TEST_QUESTIONS: int = 20

    # Vòng quay
    SPIN_EVERY_N_WORDS: int = 50
    PITY_EPIC: int = 20  # pity_counter (chung mọi loại lượt) đạt mức này → lượt kế chắc chắn Sử Thi (Huyền Thoại thì giữ)
    # Tỉ lệ công khai theo độ hiếm (tổng = 1). Lượt đặc biệt (lên rank, thắng Boss) không ra Thường.
    GACHA_RATES_NORMAL: dict[str, float] = {"common": 0.60, "rare": 0.28, "epic": 0.10, "legendary": 0.02}
    GACHA_RATES_SPECIAL: dict[str, float] = {"common": 0.0, "rare": 0.70, "epic": 0.24, "legendary": 0.06}
    GACHA_SHARDS_PER_DUPLICATE: dict[str, int] = {"common": 2, "rare": 4, "epic": 8, "legendary": 20}
    GACHA_EXCHANGE_COST: dict[str, int] = {"common": 20, "rare": 40, "epic": 60, "legendary": 150}
    GACHA_MAX_BATCH: int = 10  # "Mở tất cả" tối đa 10 lượt mỗi lần, cùng một loại lượt
    SPIN_RATE_LIMIT_PER_MINUTE: int = 30  # POST /collection/spins mỗi người
    IDEMPOTENCY_TTL_HOURS: int = 24
    # Phân bổ 100 linh vật theo vùng × độ hiếm (Thường, Hiếm, Sử Thi, Huyền Thoại); seed_mascots kiểm tra danh mục khớp bảng này
    MASCOT_DISTRIBUTION: dict[str, list[int]] = {
        "A1": [8, 5, 3, 1], "A2": [8, 5, 3, 1], "B1": [7, 5, 2, 1], "B2": [7, 4, 3, 1],
        "C1": [6, 4, 3, 1], "C2": [6, 5, 3, 1], "SPECIAL": [3, 2, 1, 1],
    }

    # Đấu Trường
    MATCH_HP: int = 100
    MATCH_QUESTIONS: int = 20
    DMG_BASE: int = 10
    DMG_FAST_BONUS: int = 5
    FAST_MS: int = 2000
    COMBO_MULT: float = 1.5
    WRONG_SELF_DMG: int = 5

    @field_validator("DATABASE_URL", "TEST_DATABASE_URL")
    @classmethod
    def _async_driver(cls, value: str) -> str:
        return _to_async_url(value)

    @model_validator(mode="after")
    def _production_guard(self):
        if self.is_production and len(self.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY phải dài ít nhất 32 ký tự khi ENV=production.")
        if self.COOKIE_SECURE is None:
            self.COOKIE_SECURE = self.is_production
        return self

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENV == "testing"

    @property
    def debug_time_enabled(self) -> bool:
        """Header X-Debug-Now chỉ có tác dụng khi dev và e2e; production, testing luôn bỏ qua (core/debug_time.py)."""
        return self.ENV in ("development", "e2e")

    @property
    def docs_enabled(self) -> bool:
        return not self.is_production or self.ENABLE_DOCS

    @property
    def database_url(self) -> str:
        """URL thực dùng: khi chạy test thì dùng database test riêng."""
        return self.TEST_DATABASE_URL if self.is_testing else self.DATABASE_URL

    @property
    def access_token_seconds(self) -> int:
        return self.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    @property
    def refresh_token_seconds(self) -> int:
        return self.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


settings = Settings()
