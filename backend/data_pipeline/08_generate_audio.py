"""
Bước 08 — tạo mp3 cho headword và câu ví dụ của mục đã duyệt (en-US). Chi tiết: lib/audio.py.
CHƯA chạy với dịch vụ TTS thật: hiện chỉ có provider `fake`. Không thêm hay gọi nhà cung cấp thật khi chưa có lệnh.
Chạy trong backend/: `python -m data_pipeline.08_generate_audio --level A1 --provider fake [--dry-run]`.
"""

import argparse
import os

from data_pipeline.lib import audio


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="A1")
    parser.add_argument("--provider", default=os.environ.get("TTS_PROVIDER", "fake"))
    parser.add_argument("--voice", default=os.environ.get("TTS_VOICE", audio.DEFAULT_VOICE))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    result = audio.generate(args.level, audio.provider(args.provider), voice=args.voice, dry_run=args.dry_run)
    print(f"{'Sẽ tạo' if args.dry_run else 'Đã tạo'} {len(result.created)} file, bỏ qua {result.skipped} (không đổi).")


if __name__ == "__main__":
    main()
