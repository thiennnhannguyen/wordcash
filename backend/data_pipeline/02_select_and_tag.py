"""
Bước 02 — chọn từ một cấp và chia vào các chủ đề (AI phân loại, thêm cụm từ cố định, cân bằng). Chi tiết: lib/step02.py.
Chạy trong backend/ (chế độ agent, mặc định, không tốn phí):
  `python -m data_pipeline.02_select_and_tag --level A1 [--limit 40] --emit`   → work/02_select/batch_<số>.input.json
  agent soạn batch_<số>.output.json, rồi `… --ingest` (gói giai đoạn sau — cụm từ, đề xuất thêm — được tạo khi ingest).
AI_PROVIDER=anthropic: bỏ --emit/--ingest, in ước tính chi phí rồi hỏi xác nhận (--yes bỏ hỏi).
Đầu ra: processed/<cấp>_selection.json, processed/report_02.json (+ failed_02.json nếu có mục AI không trả được).
"""

import argparse
import json

from data_pipeline.lib import cli, step02


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    parser.add_argument("--limit", type=int, default=None, help="chạy thử với N ứng viên đầu (không thêm cụm từ / cân bằng)")
    cli.add_ai_args(parser)
    args = parser.parse_args()
    client = cli.make_client("02_select", args, lambda: step02.estimate(args.level, limit=args.limit), "02 phân loại chủ đề")
    if getattr(client, "remember_args", None):
        if args.ingest and args.limit is None:
            args.limit = client.last_args().get("limit")
        client.remember_args({"level": args.level.upper(), "limit": args.limit})
    report = step02.run(args.level, client, limit=args.limit)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    cli.agent_footer(client)


if __name__ == "__main__":
    main()
