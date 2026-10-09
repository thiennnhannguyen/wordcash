"""
Bước 03b — AI soạn nháp câu hỏi Mức 4 (cloze_en + 3 cloze_distractors) cho các mục draft. Chi tiết: lib/step_cloze.py.
Chạy trong backend/ (chế độ agent, mặc định, không tốn phí):
  `python -m data_pipeline.03b_cloze --level A1 [--topic food …] [--limit 40] [--redo] --emit`
  agent soạn work/03b_cloze/batch_<số>.output.json, rồi `… --ingest` (không ghi lại phạm vi thì dùng phạm vi của lần emit),
  rồi `python -m data_pipeline.04_validate --level A1`.
AI_PROVIDER=anthropic: bỏ --emit/--ingest, in ước tính chi phí rồi hỏi xác nhận (--yes bỏ hỏi).
Đầu ra: cloze_en, cloze_distractors trong content/<cấp>/<chủ-đề>.json (mục vẫn draft), processed/report_03b.json.
"""

import argparse
import json

from data_pipeline.lib import cli, step_cloze


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    parser.add_argument("--topic", action="append", default=None, help="chỉ chủ đề này (lặp lại được)")
    parser.add_argument("--limit", type=int, default=None, help="chỉ soạn N mục đầu (chạy thử)")
    parser.add_argument("--redo", action="store_true", help="soạn lại cả mục draft đã có câu (sau khi đổi prompt)")
    cli.add_ai_args(parser)
    args = parser.parse_args()
    scope = ("topic", "limit", "redo")
    client = cli.make_client("03b_cloze", args, lambda: step_cloze.estimate(
        args.level, topics=args.topic, redo=args.redo, limit=args.limit), "03b soạn câu điền từ")
    if getattr(client, "remember_args", None):
        if args.ingest and not any(getattr(args, k) for k in scope):
            for k, v in client.last_args().items():
                if k in scope:
                    setattr(args, k, v)
        client.remember_args({"level": args.level.upper(), **{k: getattr(args, k) for k in scope}})
    report = step_cloze.run(args.level, client, topics=args.topic, redo=args.redo, limit=args.limit)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    cli.agent_footer(client)


if __name__ == "__main__":
    main()
