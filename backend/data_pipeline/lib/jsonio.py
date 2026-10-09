"""
Đọc / ghi JSON cho quy trình kho từ với định dạng ổn định (diff trên git gọn): UTF-8, indent 2, giữ nguyên dấu tiếng Việt,
xuống dòng cuối file. Ghi nguyên tử: viết file tạm cùng thư mục rồi `os.replace` (không bao giờ để file viết dở).
"""

import json
import os
import tempfile
from pathlib import Path
from typing import Any


def dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def write_json(path: Path, data: Any) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(dumps(data))
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def read_json(path: Path, default: Any = None) -> Any:
    path = Path(path)
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))
