"""
Bước 02 — chọn từ một cấp và chia vào các chủ đề (AI phân loại, thêm cụm từ cố định, cân bằng). Chi tiết: lib/step02.py.
Chạy trong backend/: `python -m data_pipeline.02_select_and_tag --level A1 [--limit 40] [--yes]`.
Đầu ra: processed/<cấp>_selection.json, processed/report_02.json (+ failed_02.json nếu có mục AI không trả được).
"""

import argparse
import json
import sys

from data_pipeline.lib import cli, step02


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    parser.add_argument("--limit", type=int, default=None, help="chạy thử với N ứng viên đầu (không thêm cụm từ / cân bằng)")
    parser.add_argument("--yes", action="store_true", help="không hỏi xác nhận trước khi gọi AI")
    args = parser.parse_args()
    if not cli.confirm_ai(step02.estimate(args.level, limit=args.limit), yes=args.yes, what="02 phân loại chủ đề"):
        sys.exit(1)
    report = step02.run(args.level, cli.real_client(), limit=args.limit)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
