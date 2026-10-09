"""
Bước 03b — AI soạn nháp câu Mức 4 (cloze_en + đúng 3 cloze_distractors) cho các mục đã soạn (gọi từ
data_pipeline/03b_cloze.py). Tách khỏi bước 03 để soạn bù cho mục cũ mà không đụng các trường khác.

- Chỉ xử lý mục `status = draft` (AI chỉ soạn bản nháp; mục đã approved / rejected giữ nguyên — muốn soạn lại câu cho mục đã
  duyệt thì người duyệt đưa mục về draft). Mặc định chỉ mục chưa có câu; `--redo`: soạn lại cả mục draft đã có câu.
- Gọi AI theo lô CLOZE_BATCH_SIZE mục cùng chủ đề, prompt prompts/cloze_v1.md (kèm kho từ của cấp theo từ loại để chọn đáp
  án nhiễu cùng từ loại, cùng cấp); câu trả lời kiểm bằng Pydantic (ClozeItem: đúng 3 đáp án nhiễu + 3 lý do tự kiểm
  `why_wrong` — lý do không lưu vào nội dung). Mục thiếu / sai được hỏi lại tối đa AI_MAX_RETRIES vòng; vẫn lỗi →
  processed/failed_03b.json.
- Cache theo (cấp, chủ đề, content_key, phiên bản prompt, mã băm prompt đã dựng).
- Chế độ agent: lô chưa có output là "đang chờ"; `--emit` tạo gói work/03b_cloze/batch_<số>.input.json, agent soạn output,
  `--ingest` ghi vào file nội dung. Sau đó chạy bước 04 (quy tắc cloze_*).
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content, prompts
from data_pipeline.lib.ai import AgentPending, AIClient, AIError, AIJsonError, Usage, call_json
from data_pipeline.lib.cache import DiskCache, digest
from data_pipeline.lib.jsonio import write_json
from data_pipeline.lib.schemas import ClozeItem, ContentEntry, TopicFile
from data_pipeline.lib.validate import ALLOWED_EXAMPLE_LEVELS

CLOZE_V = 1


@dataclass
class Result:
    usage: Usage = field(default_factory=Usage)
    failed: list[dict] = field(default_factory=list)
    pending: list[dict] = field(default_factory=list)
    written: dict[str, int] = field(default_factory=dict)
    from_cache: int = 0


def word_bank(topics: list[TopicFile]) -> str:
    """Headword đã soạn (không rejected) của cả cấp, nhóm theo từ loại — nguồn chọn đáp án nhiễu cùng từ loại, cùng cấp."""
    groups: dict[str, set[str]] = {}
    for t in topics:
        for e in t.entries:
            if e.status != "rejected":
                groups.setdefault(e.pos, set()).add(e.headword)
    return "\n".join(f"- {pos}: {', '.join(sorted(words, key=str.lower))}" for pos, words in sorted(groups.items()))


def system_prompt(level: str, topic_code: str, bank: str) -> str:
    t = config.topic(level, topic_code)
    allowed = "–".join(ALLOWED_EXAMPLE_LEVELS[level][:2])
    return prompts.load("cloze", CLOZE_V, level=level, topic_title=t.title, cloze_min=str(config.CLOZE_EN_MIN_WORDS),
                        cloze_max=str(config.CLOZE_EN_MAX_WORDS), allowed_levels=allowed, word_bank=bank)


def cache_key(level: str, topic_code: str, e: ContentEntry, system: str) -> str:
    return digest("cloze", level, topic_code, e.content_key, e.meaning_vi, CLOZE_V, prompts.rendered_hash(system))


def needs_cloze(e: ContentEntry, redo: bool) -> bool:
    return e.status == "draft" and (redo or not (e.cloze_en.strip() and e.cloze_distractors))


def _user_message(entries: list[ContentEntry]) -> str:
    lines = [json.dumps({"headword": e.headword, "pos": e.pos, "meaning_vi": e.meaning_vi, "example_en": e.example_en,
                         "synonyms": e.synonyms, "word_family": e.word_family}, ensure_ascii=False) for e in entries]
    return "Write fill-in-the-blank items for these cards:\n" + "\n".join(lines)


def cloze_batch(client: AIClient, level: str, code: str, entries: list[ContentEntry], system: str, cache: DiskCache,
                result: Result) -> dict[str, ClozeItem]:
    out: dict[str, ClozeItem] = {}
    todo = []
    for e in entries:
        hit = cache.get(cache_key(level, code, e, system))
        if hit is not None:
            out[e.content_key] = ClozeItem.model_validate(hit)
            result.from_cache += 1
        else:
            todo.append(e)
    for _ in range(config.AI_MAX_RETRIES):
        if not todo:
            break
        try:
            got = call_json(client, system, _user_message(todo), list[ClozeItem], usage=result.usage, max_tokens=6000)
        except AgentPending:
            result.pending += [{"topic": code, "content_key": e.content_key} for e in todo]
            todo = []
            break
        except (AIError, AIJsonError):
            continue
        by_word = {(g.headword.strip().lower(), g.pos.strip().lower()): g for g in got}
        remaining = []
        for e in todo:
            g = by_word.get((e.headword.lower(), e.pos))
            if g is None or not g.cloze_en.strip():
                remaining.append(e)
                continue
            g = g.model_copy(update={"headword": e.headword, "pos": e.pos})
            cache.set(cache_key(level, code, e, system), g.model_dump())
            out[e.content_key] = g
        todo = remaining
    result.failed += [{"step": "cloze", "topic": code, "content_key": e.content_key} for e in todo]
    return out


def run(level: str, client: AIClient | None, *, topics: list[str] | None = None, redo: bool = False, limit: int | None = None,
        processed: Path = config.PROCESSED, content_root: Path | None = None, cache_root: Path | None = None) -> dict:
    level = level.upper()
    files = {p.stem: content.load_topic(p) for p in content.level_files(level, content_root)}
    bank = word_bank(list(files.values()))
    cache = DiskCache("cloze", cache_root)
    result = Result()
    budget = limit
    for t in config.topics(level):
        topic = files.get(t.code)
        if topic is None or (topics and t.code not in topics):
            continue
        todo = [e for e in topic.entries if needs_cloze(e, redo)]
        if budget is not None:
            todo, budget = todo[:budget], max(budget - len(todo), 0)
        if not todo:
            continue
        system = system_prompt(level, t.code, bank)
        made: dict[str, ClozeItem] = {}
        for start in range(0, len(todo), config.CLOZE_BATCH_SIZE):
            made |= cloze_batch(client, level, t.code, todo[start:start + config.CLOZE_BATCH_SIZE], system, cache, result)
        if not made:
            continue
        for e in topic.entries:
            got = made.get(e.content_key)
            if got is not None:
                e.cloze_en = " ".join(got.cloze_en.split())
                e.cloze_distractors = [d.strip() for d in got.cloze_distractors]
        content.save_topic(topic, content_root)
        result.written[t.code] = len(made)
    if result.failed:
        write_json(Path(processed) / "failed_03b.json", result.failed)
    report = {"level": level, "written": result.written, "from_cache": result.from_cache, "failed": len(result.failed),
              "pending": len(result.pending), "ai": result.usage.as_dict()}
    write_json(Path(processed) / "report_03b.json", report)
    return report


def progress(level: str, content_root: Path | None = None) -> list[dict]:
    """Số mục có câu Mức 4 theo chủ đề (cho `pipeline status`)."""
    rows = []
    for p in content.level_files(level.upper(), content_root):
        t = content.load_topic(p)
        live = [e for e in t.entries if e.status != "rejected"]
        rows.append({"topic": t.topic_code, "entries": len(live),
                     "with_cloze": sum(bool(e.cloze_en.strip() and e.cloze_distractors) for e in live)})
    return rows


def estimate(level: str, *, topics: list[str] | None = None, redo: bool = False, limit: int | None = None,
             content_root: Path | None = None) -> dict:
    items = 0
    for p in content.level_files(level.upper(), content_root):
        t = content.load_topic(p)
        if topics and t.topic_code not in topics:
            continue
        items += sum(needs_cloze(e, redo) for e in t.entries)
    items = min(items, limit) if limit else items
    requests = -(-items // config.CLOZE_BATCH_SIZE)
    inp = requests * (config.EST_INPUT_TOKENS_PER_REQUEST + 4000) + items * 60
    outp = items * 90
    return {"items": items, "requests": requests, "input_tokens": inp, "output_tokens": outp,
            "cost_usd": round(inp / 1e6 * config.PRICE_INPUT_PER_MTOK + outp / 1e6 * config.PRICE_OUTPUT_PER_MTOK, 2)}
