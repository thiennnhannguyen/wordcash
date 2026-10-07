"""
Bước 03 — AI soạn nháp nội dung mục từ (nghĩa, định nghĩa, câu ví dụ, cụm đi kèm…), IPA lấy từ CMUdict. Chi tiết: lib/step03.py.
Chạy trong backend/ (chế độ agent, mặc định, không tốn phí):
  `python -m data_pipeline.03_enrich_entries --level A1 [--topic food …] [--per-topic 10] [--limit 40] --emit`
  agent soạn work/03_enrich/batch_<số>.output.json, rồi `… --ingest` (không ghi lại phạm vi thì dùng phạm vi của lần emit).
AI_PROVIDER=anthropic: bỏ --emit/--ingest, in ước tính chi phí rồi hỏi xác nhận (--yes bỏ hỏi).
Đầu ra: content/<cấp>/<chủ-đề>.json (status = draft), processed/report_03.json, processed/failed_03.json.
"""

import argparse
import json

from data_pipeline.lib import cli, step03


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    parser.add_argument("--topic", action="append", default=None, help="chỉ chủ đề này (lặp lại được)")
    parser.add_argument("--per-topic", type=int, default=None, help="N mục đầu mỗi chủ đề (theo thứ tự dạy)")
    parser.add_argument("--limit", type=int, default=None, help="chỉ soạn N mục đầu (chạy thử)")
    parser.add_argument("--redo-drafts", action="store_true", help="soạn lại mục draft chưa từng duyệt (sau khi đổi prompt)")
    cli.add_ai_args(parser)
    args = parser.parse_args()
    scope = ("topic", "per_topic", "limit", "redo_drafts")
    client = cli.make_client("03_enrich", args, lambda: step03.estimate(
        args.level, limit=args.limit, redo_drafts=args.redo_drafts, topics=args.topic, per_topic=args.per_topic), "03 soạn nháp")
    if getattr(client, "remember_args", None):
        if args.ingest and not any(getattr(args, k) for k in scope):
            for k, v in client.last_args().items():
                if k in scope:
                    setattr(args, k, v)
        client.remember_args({"level": args.level.upper(), **{k: getattr(args, k) for k in scope}})
    report = step03.run(args.level, client, limit=args.limit, redo_drafts=args.redo_drafts, topics=args.topic,
                        per_topic=args.per_topic)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    cli.agent_footer(client)


if __name__ == "__main__":
    main()
