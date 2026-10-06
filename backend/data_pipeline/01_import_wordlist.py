"""
Bước 01 — nhập và chuẩn hóa danh sách từ thô trong raw/ (bộ đọc theo nguồn ở lib/sources/), gộp theo (headword, pos).
Chạy trong backend/: `python -m data_pipeline.01_import_wordlist`. Đầu ra: processed/candidates.json, processed/report_01.json.
"""

import argparse
import json
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import step01


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=config.RAW)
    parser.add_argument("--out", type=Path, default=config.PROCESSED)
    args = parser.parse_args()
    report = step01.run(args.raw, args.out)
    summary = {k: report[k] for k in ("sources", "total_rows", "candidates", "merged_duplicates", "dropped", "by_cefr")}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Lemma: {len(report['lemmatized'])} dòng. Chi tiết: {args.out / 'report_01.json'}")


if __name__ == "__main__":
    main()
