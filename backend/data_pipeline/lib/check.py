"""
Kiểm tra cấu trúc mọi file backend/content/**/*.json (bước CI, không cần DB hay AI):
schema TopicFile; tên file khớp cấp / mã chủ đề; chủ đề có trong config; content_key đúng dạng
"<cấp>.<chủ-đề>.<headword>.<pos>" và không trùng giữa các file; bài chỉ trỏ tới mục có trong file, không mục nào thuộc 2 bài
cùng nhánh, content_key bài đúng dạng. (Cỡ bài 16–20 và tên bài đã duyệt chỉ bắt buộc khi nạp — lib/loader.py.)
"""

from pathlib import Path

from pydantic import ValidationError

from data_pipeline import config
from data_pipeline.lib import content
from data_pipeline.lib.jsonio import read_json
from data_pipeline.lib.schemas import TopicFile


def check_file(path: Path) -> list[str]:
    name = f"{path.parent.name}/{path.name}"
    try:
        topic = TopicFile.model_validate(read_json(path))
    except (ValidationError, ValueError) as e:
        return [f"{name}: sai schema — {str(e)[:500]}"]
    errors = []
    if path.parent.name != topic.level.lower() or path.stem != topic.topic_code:
        errors.append(f"{name}: tên file không khớp level / topic_code")
    try:
        config.topic(topic.level, topic.topic_code)
    except KeyError:
        errors.append(f"{name}: chủ đề {topic.topic_code} không có trong data_pipeline/config.py")
    keys = set()
    for e in topic.entries:
        expected = content.content_key(topic.level, topic.topic_code, e.headword, e.pos)
        if e.content_key != expected:
            errors.append(f"{name}: {e.content_key} phải là {expected}")
        if e.content_key in keys:
            errors.append(f"{name}: trùng content_key {e.content_key}")
        keys.add(e.content_key)
    seen: dict[tuple[str, str], int] = {}
    for u in topic.units:
        if not u.content_key.startswith(f"{topic.level.lower()}.{topic.topic_code}.u"):
            errors.append(f"{name}: bài {u.content_key} sai dạng")
        for k in u.entries:
            if k not in keys:
                errors.append(f"{name}: bài {u.content_key} trỏ tới mục không có {k}")
            if (u.branch, k) in seen:
                errors.append(f"{name}: {k} thuộc 2 bài cùng nhánh")
            seen[(u.branch, k)] = u.position
    return errors


def check_tree(root: Path | None = None) -> list[str]:
    errors, owners = [], {}
    for path in content.all_files(root):
        errors += check_file(path)
        for e in (read_json(path) or {}).get("entries", []):
            key = e.get("content_key")
            if key in owners:
                errors.append(f"{key} có ở cả {owners[key]} và {path.name}")
            owners[key] = path.name
    return errors
