"""
"Viết lại một trường" của mục nháp — dùng chung cho công cụ duyệt (/dev/content) và lệnh `pipeline rewrite`.

- `request()`: dựng prompt (prompts/rewrite_field_v1.md, chèn quy tắc của hướng dẫn soạn) cho một trường + ghi chú người duyệt.
- `normalize()`: đưa câu trả lời về đúng kiểu trường (danh sách cho collocations / word_family / synonyms).
- Hàng đợi (chế độ agent): work/rewrite_queue.json. Người duyệt bấm "Gửi yêu cầu viết lại" → `enqueue` (content_key, trường,
  ghi chú, bản hiện tại; trạng thái `queued`). `process(client)` chạy mọi yêu cầu `queued` qua `ai.call_json` — với
  AgentClient đó là emit / ingest gói việc work/rewrite/ — có kết quả thì `ready` kèm `new`. Người duyệt chọn bản mới
  (`accepted`, ghi vào file nội dung) hoặc giữ bản cũ (`dismissed`) qua `resolve`.
"""

import uuid
from datetime import UTC, datetime
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content, prompts
from data_pipeline.lib.ai import AgentPending, AIClient, AIError, AIJsonError, call_json
from data_pipeline.lib.jsonio import read_json, write_json
from data_pipeline.lib.schemas import ContentEntry, RewriteItem, TopicFile

REWRITE_V = 1
REWRITABLE = ("meaning_vi", "definition_en", "example_en", "example_vi", "collocations", "word_family", "synonyms",
              "mnemonic_vi", "image_keyword", "cloze_en", "cloze_distractors")
LIST_FIELDS = ("collocations", "word_family", "synonyms", "cloze_distractors")
CARD_FIELDS = {"headword", "pos", "meaning_vi", "definition_en", "example_en", "example_vi", "collocations", "word_family",
               "synonyms", "mnemonic_vi", "image_keyword", "cloze_en", "cloze_distractors"}
OPEN = ("queued", "ready")


def queue_path(root: Path | None = None) -> Path:
    return Path(root or config.WORK) / "rewrite_queue.json"


def request(topic: TopicFile, entry: ContentEntry, field: str, note: str) -> tuple[str, str]:
    system = prompts.load("rewrite_field", REWRITE_V, level=topic.level, topic_title=topic.topic_title, field=field,
                          meaning_max=str(config.MEANING_VI_MAX_WORDS), definition_max=str(config.DEFINITION_EN_MAX_WORDS),
                          example_min=str(config.EXAMPLE_EN_MIN_WORDS), example_max=str(config.EXAMPLE_EN_MAX_WORDS))
    card = entry.model_dump(include=CARD_FIELDS)
    user = f"Card: {card}\nReviewer note: {note.strip() or '(none)'}\nRewrite the field: {field}"
    return system, user


def normalize(field: str, value: str | list[str]) -> str | list[str]:
    if field in LIST_FIELDS and isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    if field not in LIST_FIELDS and isinstance(value, list):
        return " ".join(value)
    return value


def load_queue(root: Path | None = None) -> list[dict]:
    return read_json(queue_path(root), [])


def save_queue(items: list[dict], root: Path | None = None) -> None:
    write_json(queue_path(root), items)


def enqueue(level: str, topic_code: str, entry: ContentEntry, field: str, note: str, root: Path | None = None) -> dict:
    """Thêm yêu cầu; yêu cầu còn mở cho cùng mục + trường thì thay bằng yêu cầu mới (ghi chú mới nhất)."""
    items = [i for i in load_queue(root) if not (i["content_key"] == entry.content_key and i["field"] == field and i["status"] in OPEN)]
    item = {"id": uuid.uuid4().hex[:12], "level": level.upper(), "topic": topic_code, "content_key": entry.content_key,
            "headword": entry.headword, "field": field, "note": note.strip(), "current": getattr(entry, field), "new": None,
            "status": "queued", "requested_at": datetime.now(UTC).isoformat(timespec="seconds")}
    save_queue(items + [item], root)
    return item


def open_for_topic(level: str, topic_code: str, root: Path | None = None) -> list[dict]:
    return [i for i in load_queue(root) if i["level"] == level.upper() and i["topic"] == topic_code and i["status"] in OPEN]


def resolve(item_id: str, accept: bool, root: Path | None = None) -> dict | None:
    items = load_queue(root)
    item = next((i for i in items if i["id"] == item_id and i["status"] in OPEN), None)
    if item is None:
        return None
    if accept and item["status"] != "ready":
        raise ValueError("Yêu cầu chưa có bản viết lại")
    item["status"] = "accepted" if accept else "dismissed"
    item["resolved_at"] = datetime.now(UTC).isoformat(timespec="seconds")
    save_queue(items, root)
    return item


def process(client: AIClient, *, root: Path | None = None, content_root: Path | None = None) -> dict:
    """Chạy mọi yêu cầu `queued`. Trả số yêu cầu đã có kết quả / còn chờ / lỗi (mục không còn trong file nội dung…)."""
    items = load_queue(root)
    done = waiting = failed = 0
    for item in items:
        if item["status"] != "queued":
            continue
        path = content.topic_path(item["level"], item["topic"], content_root)
        topic = content.load_topic(path) if path.exists() else None
        entry = content.by_key(topic).get(item["content_key"]) if topic else None
        if entry is None:
            item["status"], item["error"] = "failed", "Mục không còn trong file nội dung"
            failed += 1
            continue
        system, user = request(topic, entry, item["field"], item["note"])
        try:
            got = call_json(client, system, user, RewriteItem, max_tokens=1000)
        except AgentPending:
            waiting += 1
            continue
        except (AIError, AIJsonError) as e:
            item["error"] = str(e)[:200]
            failed += 1
            continue
        item["new"], item["status"] = normalize(item["field"], got.value), "ready"
        done += 1
    save_queue(items, root)
    return {"ready": done, "waiting": waiting, "failed": failed, "open": sum(i["status"] in OPEN for i in items)}
