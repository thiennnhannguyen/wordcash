"""
Cấu hình đọc từ file `.env` ở gốc repo (không phải `backend/`) và biến môi trường, qua pydantic-settings.
Các hằng số luật game cũng đặt ở đây để không rải con số trong code; có thể ghi đè bằng biến môi trường cùng tên.
"""

from functools import cached_property
from pathlib import Path

from pydantic import field_validator
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

    APP_ENV: str = "development"  # development | testing | production

    DATABASE_URL: str = "postgresql+asyncpg://wordclash:wordclash_password@localhost:5432/wordclash_db"
    TEST_DATABASE_URL: str = "sqlite+aiosqlite://"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "dev-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    FRONTEND_URL: str = "http://localhost:5173"
    TTS_API_KEY: str = ""

    # Học tập, Cửa Ải, rank
    DAILY_FORGET_PENALTY: int = 1
    UNIT_PASS_RATE: float = 0.8
    BOSS_PASS_RATE: float = 0.85
    RANK_GRACE_DAYS: int = 3

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

    @property
    def is_testing(self) -> bool:
        return self.APP_ENV == "testing"

    @cached_property
    def database_url(self) -> str:
        """URL thực dùng: khi chạy test thì dùng database test riêng."""
        return self.TEST_DATABASE_URL if self.is_testing else self.DATABASE_URL

    @property
    def use_redis(self) -> bool:
        """Test không cần Redis; Socket.IO khi đó dùng bộ quản lý trong bộ nhớ."""
        return bool(self.REDIS_URL) and not self.is_testing


settings = Settings()
