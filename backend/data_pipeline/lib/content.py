"""
Đọc / ghi file nội dung backend/content/<cấp>/<mã-chủ-đề>.json (nguồn chính của nội dung; DB chỉ nạp từ đây).

- Định dạng ổn định để diff trên git gọn: UTF-8, indent 2, thứ tự trường theo schema (lib/schemas.py: TopicFile), mục sắp
  theo (rank_in_topic, content_key), bài theo (nhánh, vị trí); ghi nguyên tử (file tạm rồi đổi tên).
- content_key = "<cấp>.<chủ-đề>.<headword>.<pos>" (headword đổi khoảng trắng / dấu thành "_"), vd. "a1.greetings.good_morning.phrase".
"""

import re
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib.jsonio import read_json, write_json
from data_pipeline.lib.schemas import ContentEntry, TopicFile


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def content_key(level: str, topic_code: str, headword: str, pos: str) -> str:
    return f"{level.lower()}.{topic_code}.{slug(headword)}.{pos}"


def entry_type(headword: str, pos: str) -> str:
    if pos == config.POS_PHRASE:
        return "phrase"
    return "word" if len(headword.split()) == 1 else ("phrasal_verb" if pos == "verb" else "collocation")


def topic_path(level: str, code: str, root: Path | None = None) -> Path:
    return Path(root or config.CONTENT) / level.lower() / f"{code}.json"


def load_topic(path: Path) -> TopicFile:
    return TopicFile.model_validate(read_json(path))


def load_or_new(level: str, code: str, root: Path | None = None) -> TopicFile:
    path = topic_path(level, code, root)
    if path.exists():
        return load_topic(path)
    t = config.topic(level, code)
    return TopicFile(level=level.upper(), topic_code=code, topic_title=t.title)


def sort_topic(topic: TopicFile) -> TopicFile:
    topic.entries.sort(key=lambda e: (e.rank_in_topic or 10**6, e.content_key))
    topic.units.sort(key=lambda u: (u.branch, u.position))
    return topic


def dump(topic: TopicFile) -> dict:
    return sort_topic(topic).model_dump(mode="json")


def save_topic(topic: TopicFile, root: Path | None = None) -> Path:
    path = topic_path(topic.level, topic.topic_code, root)
    write_json(path, dump(topic))
    return path


def level_files(level: str, root: Path | None = None) -> list[Path]:
    d = Path(root or config.CONTENT) / level.lower()
    return sorted(d.glob("*.json")) if d.exists() else []


def all_files(root: Path | None = None) -> list[Path]:
    return sorted(Path(root or config.CONTENT).glob("*/*.json"))


def by_key(topic: TopicFile) -> dict[str, ContentEntry]:
    return {e.content_key: e for e in topic.entries}
