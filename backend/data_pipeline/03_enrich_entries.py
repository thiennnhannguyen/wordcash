"""
Bước 03 — AI soạn nháp nội dung mục từ (nghĩa, định nghĩa, câu ví dụ, cụm đi kèm…), IPA lấy từ CMUdict. Chi tiết: lib/step03.py.
Chạy trong backend/: `python -m data_pipeline.03_enrich_entries --level A1 [--limit 40] [--yes] [--redo-drafts]`.
Trước khi gọi AI in ước tính số request / token / chi phí và hỏi xác nhận (bỏ qua bằng --yes).
Đầu ra: content/<cấp>/<chủ-đề>.json (status = draft), processed/report_03.json, processed/failed_03.json.
"""

import argparse
import json
import sys

from data_pipeline.lib import cli, step03


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    parser.add_argument("--limit", type=int, default=None, help="chỉ soạn N mục đầu (chạy thử)")
    parser.add_argument("--yes", action="store_true", help="không hỏi xác nhận trước khi gọi AI")
    parser.add_argument("--redo-drafts", action="store_true", help="soạn lại mục draft chưa từng duyệt (sau khi đổi prompt)")
    args = parser.parse_args()
    est = step03.estimate(args.level, limit=args.limit, redo_drafts=args.redo_drafts)
    if not cli.confirm_ai(est, yes=args.yes, what="03 soạn nháp"):
        sys.exit(1)
    client = cli.real_client() if est["items"] else None
    print(json.dumps(step03.run(args.level, client, limit=args.limit, redo_drafts=args.redo_drafts), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
