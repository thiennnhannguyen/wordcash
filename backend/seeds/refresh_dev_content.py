"""
LÀM MỚI DỮ LIỆU DEV: thay lộ trình mẫu DEV_SAMPLE bằng nội dung thật đã duyệt trong backend/content/.

1. `purge_dev_entries.purge(keep_position=True)`: xóa mục DEV_SAMPLE, bài mẫu và tiến độ bài; GIỮ tiến độ chặng / cấp.
2. `data_pipeline.lib.loader.load_level` cho từng cấp có file nội dung (chỉ mục approved, kiểm tra trước khi nạp).
3. Người dùng dev đang học dở: lần gọi API sau, roadmap_service.ensure_initialized mở bài đầu tiên của chặng hiện tại.

Từ chối chạy khi ENV=production. Chạy trong backend/: `python -m seeds.refresh_dev_content [--dry-run]`.
"""

import argparse
import asyncio
import sys
from dataclasses import asdict

from app.core.config import settings
from app.core.database import SessionLocal, engine
from data_pipeline import config as pconfig
from data_pipeline.lib import content, loader
from seeds.purge_dev_entries import purge


async def refresh(*, dry_run: bool = False) -> dict:
    levels = [lv for lv in pconfig.TOPICS if content.level_files(lv)]
    out = {"levels": levels, "loaded": {}}
    async with SessionLocal() as session:
        out["purge"] = asdict(await purge(session, dry_run=dry_run, keep_position=True))
    for level in levels:
        async with SessionLocal() as session:
            try:
                out["loaded"][level] = (await loader.load_level(session, level, dry_run=dry_run)).summary()
            except loader.LoadError as e:
                if not dry_run:
                    raise
                out["loaded"][level] = {"problems": e.problems}  # dry-run: bài mẫu chưa bị xóa thật nên loader còn báo
    return out


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if settings.ENV == "production":
        print("Không chạy làm mới dữ liệu dev ở production.", file=sys.stderr)
        sys.exit(1)
    try:
        print(await refresh(dry_run=args.dry_run))
    except loader.LoadError as e:
        print("KHÔNG nạp:", *e.problems, sep="\n  - ", file=sys.stderr)
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
