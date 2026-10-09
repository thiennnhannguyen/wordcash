"""
Bước 04 — kiểm tra tự động mọi file content/<cấp>/*.json: gắn cờ (không tự sửa), ghi `flags` + `flag_details` vào từng mục,
in báo cáo số cờ theo loại và theo chủ đề. Quy tắc: lib/validate.py. Không gọi AI.
Chạy trong backend/: `python -m data_pipeline.04_validate --level A1`. Báo cáo: processed/report_04.json.
"""

import argparse
import json

from data_pipeline import config
from data_pipeline.lib import validate
from data_pipeline.lib.jsonio import write_json


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    args = parser.parse_args()
    report = validate.run(args.level)
    write_json(config.PROCESSED / "report_04.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["hard_words_checked"]:
        print("Chưa có processed/candidates.json (chạy bước 01): bỏ qua quy tắc hard_words.")


if __name__ == "__main__":
    main()
