"""
Kiểm tra schema / cấu trúc mọi file backend/content/**/*.json (CI chạy lệnh này). Chi tiết: lib/check.py.
Chạy trong backend/: `python -m data_pipeline.check_content`. Lỗi → in danh sách, mã thoát 1.
"""

import sys

from data_pipeline.lib import check, content


def main() -> None:
    errors = check.check_tree()
    for e in errors:
        print("LỖI", e)
    print(f"{len(content.all_files())} file nội dung, {len(errors)} lỗi.")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
