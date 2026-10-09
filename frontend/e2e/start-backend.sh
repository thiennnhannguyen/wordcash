#!/bin/sh
# Backend cho kiểm thử đầu-cuối (Playwright gọi qua webServer trong playwright.config.js).
# - Database riêng `wordclash_e2e` (tạo nếu chưa có), làm sạch bằng `alembic downgrade base` rồi `upgrade head` mỗi lần chạy.
# - Nạp lộ trình mẫu A1–A2 (seeds/seed_dev_roadmap.py, gồm 60 mục của seed_dev_entries.py), danh mục linh vật (seed_mascots) và
#   3 tài khoản mẫu dev_normal / dev_shaky / dev_new (seed_dev_accounts); Redis db 15 được xóa để bộ đếm giới hạn không rò giữa các lần chạy.
# - uvicorn ở cổng 8100; FRONTEND_URL là Vite của e2e (cổng 5180); JWT_SECRET_KEY cố định để test ký được token hết hạn.
set -e
cd "$(dirname "$0")/../../backend"

# ENV=e2e: dùng DATABASE_URL (database e2e riêng) và cho phép header X-Debug-Now giả lập ngày
export ENV=e2e
export DATABASE_URL="${E2E_DATABASE_URL:-postgresql+asyncpg://wordclash:wordclash_password@localhost:5433/wordclash_e2e}"
export FRONTEND_URL="http://localhost:${E2E_WEB_PORT:-5180}"
export JWT_SECRET_KEY="${E2E_JWT_SECRET:-wordclash-e2e-secret-key-only-for-tests-0001}"
export REDIS_URL="redis://localhost:6379/15"
export REGISTER_MAX_PER_HOUR=1000
export LOGIN_MAX_ATTEMPTS=100

.venv/bin/python - <<'PY'
import asyncio
import os

import asyncpg
from redis.asyncio import Redis

async def main():
    url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    base, name = url.rsplit("/", 1)
    conn = await asyncpg.connect(f"{base}/postgres")
    if not await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name):
        await conn.execute(f'CREATE DATABASE "{name}"')
    await conn.close()
    try:
        redis = Redis.from_url(os.environ["REDIS_URL"])
        await redis.flushdb()
        await redis.aclose()
    except Exception:
        pass  # Redis không chạy: backend tự dùng bộ đếm trong bộ nhớ

asyncio.run(main())
PY

.venv/bin/alembic downgrade base > /dev/null
.venv/bin/alembic upgrade head > /dev/null
.venv/bin/python -m seeds.seed_dev_roadmap > /dev/null
.venv/bin/python -m seeds.seed_mascots > /dev/null
.venv/bin/python -m seeds.seed_dev_accounts > /dev/null
exec .venv/bin/uvicorn app.main:asgi_app --port "${E2E_API_PORT:-8100}" --log-level warning
