"""
Bước 05 — duyệt ngoài app bằng bảng tính (tùy chọn; cách chính là trang /dev/content). Chi tiết: lib/review_io.py.
Chạy trong backend/:
  python -m data_pipeline.05_review_export export --level A1 --out reviewed/a1.xlsx     # hoặc .csv
  python -m data_pipeline.05_review_export import --level A1 --file reviewed/a1.xlsx     # chỉ xem trước khác biệt
  python -m data_pipeline.05_review_export import --level A1 --file reviewed/a1.xlsx --apply
Sau khi nhập: chạy lại bước 04 để tính lại cờ.
"""

import argparse
import sys
from pathlib import Path

from data_pipeline.lib import review_io


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    ex = sub.add_parser("export")
    ex.add_argument("--level", default="A1")
    ex.add_argument("--out", type=Path, required=True)
    im = sub.add_parser("import")
    im.add_argument("--level", default="A1")
    im.add_argument("--file", type=Path, required=True)
    im.add_argument("--apply", action="store_true", help="ghi vào content/ (mặc định chỉ xem trước)")
    args = parser.parse_args()
    if args.cmd == "export":
        print(f"Đã xuất {review_io.export(args.level, args.out)} mục → {args.out}")
        return
    result = review_io.import_sheet(args.level, args.file, apply=args.apply)
    for ch in result.changes:
        print(f"{ch['content_key']}.{ch['field']}: {ch['old']!r} → {ch['new']!r}")
    for err in result.errors:
        print("LỖI", err, file=sys.stderr)
    print(f"{len(result.changes)} thay đổi, {len(result.errors)} lỗi. " +
          ("Đã ghi." if result.applied else "Chưa ghi (thêm --apply)." if not result.errors else "Không ghi gì vì có lỗi."))
    sys.exit(1 if result.errors else 0)


if __name__ == "__main__":
    main()
