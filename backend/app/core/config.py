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

    ENV: str = "development"  # development | testing | production

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
    UNIT_PASS_RATE: float = 0.8
    BOSS_PASS_RATE: float = 0.85
    RANK_GRACE_DAYS: int = 3

    # Lặp lại ngắt quãng (SM-2): khoảng ôn cho 5 lần nhớ đầu, sau đó nhân với hệ số dễ
    SRS_INTERVALS: list[int] = [1, 3, 7, 16, 35]
    SRS_START_EASE: float = 2.5
    SRS_MIN_EASE: float = 1.3
    # "Đã thuộc": đúng ở mức ≥ MASTERY_MIN_LEVEL vào ≥ MASTERY_MIN_DAYS ngày khác nhau
    MASTERY_MIN_LEVEL: int = 3
    MASTERY_MIN_DAYS: int = 3
    DAILY_NEW_WORDS_LIMIT: int = 20

    # Khóa học của tôi (giới hạn MVP)
    COURSE_MAX_PER_USER: int = 50
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
    PITY_EPIC: int = 20

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
