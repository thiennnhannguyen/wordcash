"""
Bước 07 — nạp nội dung ĐÃ DUYỆT từ backend/content/<cấp>/*.json vào DB (upsert theo content_key, không xóa mục đã có, mục bị
bỏ thì đặt retired_at). Chi tiết và các bước kiểm tra trước khi nạp: lib/loader.py.

Chạy trong backend/:
  python -m data_pipeline.07_load_to_db --level A1 --dry-run   # in bảng khác biệt (thêm / sửa / ngừng dùng), không ghi
  python -m data_pipeline.07_load_to_db --level A1
Production (ENV=production): BẮT BUỘC sao lưu trước (`sh scripts/backup_db.sh`) và thêm --yes.
"""

import argparse
import asyncio
import json
import sys

from app.core.config import settings
from app.core.database import SessionLocal, engine
from data_pipeline.lib import loader


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--level", action="append", help="cấp cần nạp (lặp lại được); mặc định A1")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true", help="bắt buộc khi ENV=production")
    args = parser.parse_args()
    if settings.ENV == "production" and not args.dry_run:
        print("ENV=production: hãy sao lưu trước bằng `sh scripts/backup_db.sh` (docs/deploy-checklist.md).")
        if not args.yes:
            print("Thêm --yes sau khi đã sao lưu.", file=sys.stderr)
            sys.exit(1)
    code = 0
    try:
        for level in args.level or ["A1"]:
            async with SessionLocal() as session:
                try:
                    diff = await loader.load_level(session, level, dry_run=args.dry_run)
                except loader.LoadError as e:
                    print(f"[{level}] KHÔNG nạp:", *e.problems, sep="\n  - ", file=sys.stderr)
                    code = 1
                    continue
            print(json.dumps(diff.summary(), ensure_ascii=False))
            print(diff.table())
    finally:
        await engine.dispose()
    sys.exit(code)


if __name__ == "__main__":
    asyncio.run(main())
