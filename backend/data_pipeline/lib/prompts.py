"""
Prompt có đánh số phiên bản trong data_pipeline/prompts/<tên>_v<N>.md. Biến dạng {{ten}} được thay khi dựng; riêng
{{style_guide}} lấy khối quy tắc giữa `<!-- ai-rules:start -->` và `<!-- ai-rules:end -->` của docs/content-style-guide.md
(prompt luôn trích từ hướng dẫn soạn). `rendered_hash` dùng làm một phần khóa cache.
"""

import hashlib
import re
from pathlib import Path

from data_pipeline import config

STYLE_GUIDE = config.BACKEND.parent / "docs" / "content-style-guide.md"


def style_guide_rules(path: Path = STYLE_GUIDE) -> str:
    text = Path(path).read_text(encoding="utf-8") if Path(path).exists() else ""
    m = re.search(r"<!-- ai-rules:start -->(.*?)<!-- ai-rules:end -->", text, re.S)
    return m.group(1).strip() if m else ""


def load(name: str, version: int, **values: str) -> str:
    text = (config.PROMPTS / f"{name}_v{version}.md").read_text(encoding="utf-8")
    values.setdefault("style_guide", style_guide_rules())
    for k, v in values.items():
        text = text.replace("{{" + k + "}}", str(v))
    missing = re.findall(r"\{\{(\w+)\}\}", text)
    if missing:
        raise KeyError(f"Prompt {name}_v{version} thiếu giá trị: {missing}")
    return text


def rendered_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:12]
