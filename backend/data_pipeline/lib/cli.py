"""
Tiện ích dòng lệnh cho các bước có gọi AI: in ước tính (số mục, request, token, chi phí), chặn khi vượt
MAX_AI_ENTRIES_PER_RUN, hỏi xác nhận (bỏ qua bằng --yes), tạo client AI thật (không bao giờ in key).
"""

import sys

from data_pipeline import config


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
