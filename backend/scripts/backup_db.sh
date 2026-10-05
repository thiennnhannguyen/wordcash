#!/bin/sh
# Sao lưu PostgreSQL bằng pg_dump (định dạng custom -Fc, khôi phục bằng pg_restore; hướng dẫn trong README.md).
# - BẮT BUỘC chạy trước mỗi lần `alembic upgrade` trên production (docs/deploy-checklist.md), và trước mọi thao tác rủi ro
#   trên DB dev có dữ liệu cần giữ.
# - URL lấy từ biến DATABASE_URL, không có thì đọc DATABASE_URL trong .env ở gốc repo; `postgresql+asyncpg://` tự đổi
#   thành `postgresql://`. Có thể truyền URL làm tham số đầu tiên.
# - File lưu ở <gốc repo>/backups/<tên-db>_<YYYYmmdd-HHMMSS>.dump (thư mục nằm trong .gitignore; đổi bằng BACKUP_DIR).
# - Máy không có pg_dump mà container Docker `wordclash_postgres` đang chạy (dev cục bộ) thì chạy pg_dump trong container.
# - Không in mật khẩu hay URL đầy đủ ra màn hình.
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
URL="${1:-${DATABASE_URL:-}}"
if [ -z "$URL" ] && [ -f "$ROOT/.env" ]; then
  URL="$(grep -E '^DATABASE_URL=' "$ROOT/.env" | tail -1 | cut -d= -f2- | tr -d '"'"'")"
fi
if [ -z "$URL" ]; then
  echo "Thiếu DATABASE_URL (biến môi trường, tham số hoặc .env ở gốc repo)." >&2
  exit 1
fi
URL="$(printf '%s' "$URL" | sed -E 's#^postgres(ql)?(\+asyncpg)?://#postgresql://#')"

# Tách user / host / port / tên DB (không in mật khẩu)
eval "$(python3 - "$URL" <<'PY'
import shlex, sys
from urllib.parse import urlsplit
u = urlsplit(sys.argv[1])
for k, v in {"DB_USER": u.username or "", "DB_HOST": u.hostname or "localhost", "DB_PORT": str(u.port or 5432),
             "DB_NAME": u.path.lstrip("/")}.items():
    print(f"{k}={shlex.quote(v)}")
PY
)"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d-%H%M%S).dump"

if command -v pg_dump > /dev/null 2>&1; then
  pg_dump --format=custom --no-owner --dbname="$URL" --file="$FILE"
elif command -v docker > /dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx wordclash_postgres; then
  docker exec wordclash_postgres pg_dump --format=custom --no-owner -U "$DB_USER" -d "$DB_NAME" > "$FILE"
else
  echo "Không tìm thấy pg_dump (cài postgresql-client) và container wordclash_postgres không chạy." >&2
  exit 1
fi

if [ ! -s "$FILE" ]; then
  rm -f "$FILE"
  echo "Sao lưu thất bại: file rỗng." >&2
  exit 1
fi
echo "Đã sao lưu ${DB_NAME} (${DB_HOST}:${DB_PORT}) → $FILE ($(du -h "$FILE" | cut -f1))"
