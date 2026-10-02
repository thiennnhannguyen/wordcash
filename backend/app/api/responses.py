"""
Mô tả các mã lỗi có thể trả về của từng route, để /docs hiển thị đầy đủ (gom theo mã HTTP).
"""

from collections import defaultdict

from app.core.errors import ERRORS
from app.schemas.common import ErrorOut


def error_responses(*codes: str) -> dict:
    grouped: dict[int, list[str]] = defaultdict(list)
    for code in codes:
        grouped[ERRORS[code][0]].append(code)
    return {
        status: {"model": ErrorOut, "description": " · ".join(f"{c}: {ERRORS[c][1]}" for c in items)}
        for status, items in sorted(grouped.items())
    }
