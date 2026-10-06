"""
Bước 06 — chia bài cho các chủ đề đã duyệt xong (chỉ mục approved), AI đề xuất tên bài (draft, duyệt ở /dev/content → tab
"Bài học"). Chi tiết: lib/units.py. Chạy trong backend/: `python -m data_pipeline.06_build_units --level A1 [--topic food] [--yes]`.
Chủ đề không chia được (số mục đã duyệt ngoài khoảng) bị báo lỗi và không ghi.
"""

import argparse
import json
import sys

from data_pipeline import config
from data_pipeline.lib import cli, content, units


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    parser.add_argument("--topic", default=None)
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    n_topics = sum(1 for p in content.level_files(args.level) if not args.topic or p.stem == args.topic)
    est = {"items": n_topics, "requests": n_topics, "input_tokens": n_topics * 1500, "output_tokens": n_topics * 150,
           "cost_usd": round(n_topics * (1500 * config.PRICE_INPUT_PER_MTOK + 150 * config.PRICE_OUTPUT_PER_MTOK) / 1e6, 2)}
    if not cli.confirm_ai(est, yes=args.yes, what="06 đặt tên bài"):
        sys.exit(1)
    result = units.run(args.level, cli.real_client() if n_topics else None, topic_code=args.topic)
    print(json.dumps({"topics": result.topics, "errors": result.errors, "ai": result.usage.as_dict()}, ensure_ascii=False, indent=2))
    sys.exit(1 if result.errors else 0)


if __name__ == "__main__":
    main()
