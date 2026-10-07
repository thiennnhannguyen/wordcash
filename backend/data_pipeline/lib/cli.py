"""
Tiện ích dòng lệnh cho các bước có gọi AI (02, 03, 06, viết lại).

- AI_PROVIDER=agent (mặc định, không tốn phí): bắt buộc `--emit` (tạo gói việc trong work/<bước>/) hoặc `--ingest` (kiểm và
  gộp output agent đã soạn); không in ước tính chi phí. Không bao giờ tự gọi API trả phí.
- AI_PROVIDER=anthropic (chỉ khi đặt rõ): in ước tính (số mục, request, token, chi phí), chặn khi vượt
  MAX_AI_ENTRIES_PER_RUN, hỏi xác nhận (bỏ qua bằng --yes), tạo client thật (thiếu key → lỗi rõ ràng; không bao giờ in key).
"""

import argparse
import json
import sys
from typing import Callable

from data_pipeline import config


def add_ai_args(parser: argparse.ArgumentParser) -> None:
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--emit", action="store_true", help="(agent) tạo gói việc work/<bước>/batch_<số>.input.json")
    mode.add_argument("--ingest", action="store_true", help="(agent) kiểm output batch_<số>.output.json rồi gộp vào kết quả")
    parser.add_argument("--yes", action="store_true", help="(anthropic) không hỏi xác nhận trước khi gọi API")


def confirm_ai(estimate: dict, *, yes: bool, what: str) -> bool:
    print(f"[{what}] Cần gọi AI cho {estimate['items']} mục (đã bỏ mục có trong cache): ~{estimate['requests']} request, "
          f"~{estimate['input_tokens']:,} token vào, ~{estimate['output_tokens']:,} token ra, ước tính ~${estimate['cost_usd']}.")
    if estimate["items"] == 0 and estimate["requests"] == 0:
        return True
    if estimate["items"] > config.MAX_AI_ENTRIES_PER_RUN:
        print(f"Vượt MAX_AI_ENTRIES_PER_RUN={config.MAX_AI_ENTRIES_PER_RUN}. Dùng --limit hoặc đặt biến môi trường lớn hơn.",
              file=sys.stderr)
        return False
    if yes:
        return True
    try:
        return input("Tiếp tục? [y/N] ").strip().lower() in ("y", "yes", "c", "có")
    except EOFError:
        return False


def real_client():
    from data_pipeline.lib.ai import AnthropicClient

    client = AnthropicClient()
    print(f"Model: {client.model}")
    return client


def make_client(step: str, args: argparse.Namespace, estimate: Callable[[], dict], what: str):
    """Client cho một bước theo AI_PROVIDER. Thoát (mã 1–2) khi thiếu cấu hình / người dùng không đồng ý."""
    try:
        provider = config.ai_provider()
    except RuntimeError as e:
        sys.exit(f"Lỗi: {e}")
    if provider == "agent":
        from data_pipeline.lib.agent import AgentClient

        if not (args.emit or args.ingest):
            print(f"[{what}] Chế độ agent (AI_PROVIDER=agent, mặc định, không tốn phí API): thêm --emit để tạo gói việc, "
                  "agent soạn output, rồi chạy lại với --ingest. Xem: python -m data_pipeline.pipeline status", file=sys.stderr)
            sys.exit(2)
        return AgentClient(step, replay=args.ingest)
    if args.emit or args.ingest:
        sys.exit("Lỗi: --emit / --ingest chỉ dùng với AI_PROVIDER=agent.")
    if not confirm_ai(estimate(), yes=args.yes, what=what):
        sys.exit(1)
    try:
        return real_client()
    except RuntimeError as e:
        sys.exit(f"Lỗi: {e}")


def agent_footer(client) -> None:
    """In tình trạng gói việc sau một lần chạy ở chế độ agent."""
    summary = getattr(client, "summary", None)
    if summary is None:
        return
    s = summary()
    print(json.dumps({"agent": s}, ensure_ascii=False, indent=2))
    if s["waiting_output"]:
        print(f"→ Còn {len(s['waiting_output'])} gói chờ output trong {s['work_dir']}. Soạn batch_<số>.output.json rồi chạy lại "
              "với --ingest.")
    if s["rejected"]:
        print(f"→ {len(s['rejected'])} gói có output sai schema: xem {s['work_dir']}/rejected.json, sửa rồi --ingest lại.")
