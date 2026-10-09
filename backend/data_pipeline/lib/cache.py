"""
Cache kết quả AI trên đĩa (data_pipeline/cache/, nằm trong .gitignore): chạy lại không gọi API lần nữa.

Khóa = SHA-256 của các phần nhận diện (vd. headword, pos, topic, phiên bản prompt, mã băm prompt đã dựng). Đổi prompt (kể cả
đổi hướng dẫn soạn được chèn vào prompt) → khóa đổi → gọi AI lại cho mục đó. Mỗi khóa một file JSON trong cache/<namespace>/.
"""

import hashlib
import json
from pathlib import Path
from typing import Any

from data_pipeline import config
from data_pipeline.lib.jsonio import read_json, write_json


def digest(*parts: Any) -> str:
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


class DiskCache:
    def __init__(self, namespace: str, root: Path | None = None):
        self.dir = Path(root or config.CACHE) / namespace

    def path(self, key: str) -> Path:
        return self.dir / key[:2] / f"{key}.json"

    def get(self, key: str) -> Any:
        return read_json(self.path(key))

    def has(self, key: str) -> bool:
        return self.path(key).exists()

    def set(self, key: str, value: Any) -> None:
        write_json(self.path(key), value)
