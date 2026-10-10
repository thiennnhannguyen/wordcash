"""
Công cụ duyệt nội dung kho từ (CHỈ dev; router api/v1/routers/dev_content.py chỉ được gắn khi ENV=development).

Đọc và ghi TRỰC TIẾP các file backend/content/<cấp>/<chủ-đề>.json (nguồn chính của nội dung, DB chỉ nạp từ đây):
- ghi nguyên tử, định dạng ổn định (data_pipeline/lib/content.py); một khóa asyncio để hai lần lưu không đè nhau;
- sau mỗi lần sửa chạy lại kiểm tra tự động của cả cấp (data_pipeline/lib/validate.py), chỉ ghi file thật sự đổi;
- Duyệt / Từ chối ghi `reviewed_at` (giờ thật) và `review_note`; Từ chối bắt buộc có lý do;
- câu hỏi mẫu mức 1–4 sinh bằng services/question_builder.py với đáp án nhiễu lấy trong cùng chủ đề (như người học sẽ thấy;
  mức 2 dùng âm thanh giả để người duyệt xem được đáp án nhiễu);
- Đợt chọn mẫu duyệt (data_pipeline/lib/sample.py): `sample_keys` = mục có `review_sample` để trang lọc "Mẫu duyệt";
- Viết lại một trường (data_pipeline/lib/rewrite.py): chế độ agent (AI_PROVIDER mặc định) → "Gửi yêu cầu viết lại" ghi vào
  work/rewrite_queue.json, mục hiện "Đang chờ viết lại"; sau `pipeline rewrite --ingest` yêu cầu có bản mới, người duyệt chọn
  bản cũ / bản mới (`resolve_rewrite`, chọn bản mới mới ghi file). AI_PROVIDER=anthropic → gọi AI ngay, trả bản cũ và bản
  mới, KHÔNG tự lưu.
"""

import asyncio
import random
from pathlib import Path

from app.core import clock
from app.core.errors import AppError
from app.services import question_builder as qb
from data_pipeline import config as pconfig
from data_pipeline.lib import content, rewrite, validate
from data_pipeline.lib.ai import AIError, AIJsonError, call_json
from data_pipeline.lib.schemas import ContentEntry, RewriteItem, TopicFile

CONTENT_ROOT: Path = pconfig.CONTENT  # test đổi sang thư mục tạm
PROCESSED: Path = pconfig.PROCESSED
WORK_ROOT: Path = pconfig.WORK
EDITABLE = ("headword", "pos", "ipa", "meaning_vi", "definition_en", "example_en", "example_vi", "collocations", "word_family",
            "synonyms", "mnemonic_vi", "image_keyword", "variant_note", "commonness", "basic_communication", "subgroup", "rank_in_topic",
            "cloze_en", "cloze_distractors")
REWRITABLE = rewrite.REWRITABLE
_lock = asyncio.Lock()


def ai_provider() -> str:
    """AI_PROVIDER (mặc định agent). Test thay hàm này."""
    return pconfig.ai_provider()


def ai_client():
    """Client AI thật (đọc key từ backend/.env). Test thay hàm này."""
    from data_pipeline.lib.ai import AnthropicClient

    return AnthropicClient()


def _load(level: str, code: str) -> TopicFile:
    path = content.topic_path(level, code, CONTENT_ROOT)
    if not path.exists():
        raise AppError("CONTENT_NOT_FOUND")
    return content.load_topic(path)


def _entry(topic: TopicFile, key: str) -> ContentEntry:
    entry = content.by_key(topic).get(key)
    if entry is None:
        raise AppError("CONTENT_NOT_FOUND")
    return entry


def summary(topic: TopicFile) -> dict:
    entries = topic.entries
    return {
        "code": topic.topic_code, "title": topic.topic_title, "total": len(entries),
        "approved": sum(e.status == "approved" for e in entries), "rejected": sum(e.status == "rejected" for e in entries),
        "draft": sum(e.status == "draft" for e in entries), "flagged": sum(bool(set(e.flags) - validate.INFO_FLAGS) for e in entries if e.status != "rejected"),
        "units": len(topic.units), "units_approved": sum(u.title_status == "approved" for u in topic.units),
    }


def list_levels() -> list[dict]:
    out = []
    for level, topics in pconfig.TOPICS.items():
        rows = []
        for t in topics:
            path = content.topic_path(level, t.code, CONTENT_ROOT)
            rows.append(summary(content.load_topic(path)) if path.exists() else
                        {"code": t.code, "title": t.title, "total": 0, "approved": 0,
                         "rejected": 0, "draft": 0, "flagged": 0, "units": 0, "units_approved": 0})
        out.append({"level": level, "topics": rows})
    return out


def get_topic(level: str, code: str) -> dict:
    topic = _load(level, code)
    return {**content.dump(topic), "summary": summary(topic), "flag_help": validate.FLAG_HELP, "info_flags": sorted(validate.INFO_FLAGS),
            "ai_provider": ai_provider(), "rewrites": rewrite.open_for_topic(level, code, WORK_ROOT),
            "sample_keys": [e.content_key for e in topic.entries if e.review_sample]}


async def _save_and_revalidate(topic: TopicFile) -> TopicFile:
    content.save_topic(topic, CONTENT_ROOT)
    validate.run(topic.level, processed=PROCESSED, content_root=CONTENT_ROOT)
    return _load(topic.level, topic.topic_code)


async def update_entry(level: str, code: str, key: str, patch: dict) -> dict:
    async with _lock:
        topic = _load(level, code)
        entry = _entry(topic, key)
        data = entry.model_dump()
        for field in EDITABLE:
            if field in patch and patch[field] is not None:
                data[field] = patch[field]
        status = patch.get("status")
        if patch.get("review_note") is not None:
            data["review_note"] = patch["review_note"]
        if status is not None:
            if status == "rejected":
                reason = (patch.get("reject_reason") or "").strip()
                if not reason:
                    raise AppError("CONTENT_REJECT_REASON_REQUIRED")
                data["reject_reason"] = reason
            else:
                data["reject_reason"] = ""
            data["status"] = status
            data["reviewed_at"] = clock.real_now()
        try:
            updated = ContentEntry.model_validate(data)
        except ValueError as e:
            raise AppError("VALIDATION_ERROR", details=[{"field": "entry", "message": str(e)[:300]}]) from None
        if updated.content_key != entry.content_key:
            raise AppError("VALIDATION_ERROR", details=[{"field": "content_key", "message": "Không đổi được content_key"}])
        topic.entries = [updated if e.content_key == key else e for e in topic.entries]
        topic = await _save_and_revalidate(topic)
        return {"entry": _entry(topic, key).model_dump(mode="json"), "summary": summary(topic)}


async def update_unit(level: str, code: str, unit_key: str, patch: dict) -> dict:
    async with _lock:
        topic = _load(level, code)
        unit = next((u for u in topic.units if u.content_key == unit_key), None)
        if unit is None:
            raise AppError("CONTENT_NOT_FOUND")
        if patch.get("title") is not None:
            unit.title = patch["title"].strip()
        if patch.get("title_status") is not None:
            unit.title_status = patch["title_status"]
        content.save_topic(topic, CONTENT_ROOT)
        return {"unit": unit.model_dump(mode="json"), "summary": summary(topic)}


def sample_questions(level: str, code: str, key: str, seed: int = 7) -> list[dict]:
    """Câu hỏi mẫu mức 1–4 (kèm đáp án — chỉ cho người duyệt)."""
    topic = _load(level, code)
    entry = _entry(topic, key)
    others = [e for e in topic.entries if e.content_key != key and e.status != "rejected"]
    data = qb.EntryData(id=0, headword=entry.headword, meaning_vi=entry.meaning_vi, pos=entry.pos, ipa=entry.ipa,
                        example=entry.example_en, audio_url="dev:tts", cloze_en=entry.cloze_en,
                        cloze_distractors=tuple(entry.cloze_distractors))
    out = []
    for level_no in (1, 2, 3, 4):
        q = qb.build_question(f"q{level_no}", data, level_no, meaning_pool=[e.meaning_vi for e in others if e.meaning_vi],
                              word_pool=[e.headword for e in others], rng=random.Random(seed + level_no))
        out.append({"requested_level": level_no, **q.public, "answer": q.key["answer"]})
    return out


async def rewrite_field(level: str, code: str, key: str, field: str, note: str) -> dict:
    if field not in REWRITABLE:
        raise AppError("CONTENT_FIELD_NOT_EDITABLE", details={"field": field})
    topic = _load(level, code)
    entry = _entry(topic, key)
    if ai_provider() == "agent":
        async with _lock:
            item = rewrite.enqueue(topic.level, code, entry, field, note, WORK_ROOT)
        return {"field": field, "old": getattr(entry, field), "new": None, "queued": True, "request": item}
    system, user = rewrite.request(topic, entry, field, note)
    try:
        client = ai_client()
        got = await asyncio.to_thread(call_json, client, system, user, RewriteItem, max_tokens=1000)
    except RuntimeError as e:  # thiếu key / model, lỗi mạng, JSON sai
        if isinstance(e, (AIError, AIJsonError)) or "ANTHROPIC" in str(e):
            raise AppError("CONTENT_AI_UNAVAILABLE", details={"reason": str(e)[:200]}) from None
        raise
    return {"field": field, "old": getattr(entry, field), "new": rewrite.normalize(field, got.value), "queued": False}


async def resolve_rewrite(level: str, code: str, request_id: str, accept: bool) -> dict:
    """Người duyệt chọn bản mới (ghi vào file, chạy lại kiểm tra) hoặc giữ bản cũ cho một yêu cầu viết lại."""
    item = next((i for i in rewrite.open_for_topic(level, code, WORK_ROOT) if i["id"] == request_id), None)
    if item is None:
        raise AppError("CONTENT_NOT_FOUND")
    if accept and item["status"] != "ready":
        raise AppError("CONTENT_REWRITE_NOT_READY")
    result = await update_entry(level, code, item["content_key"], {item["field"]: item["new"]}) if accept else None
    async with _lock:
        rewrite.resolve(request_id, accept, WORK_ROOT)
    topic = _load(level, code)
    return {"entry": (result or {}).get("entry") or _entry(topic, item["content_key"]).model_dump(mode="json"),
            "summary": summary(topic), "rewrites": rewrite.open_for_topic(level, code, WORK_ROOT)}
