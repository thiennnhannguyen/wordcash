"""
Bước 03 — AI soạn nháp mục từ (gọi từ data_pipeline/03_enrich_entries.py).

- Đầu vào: processed/<cấp>_selection.json (bước 02). Đầu ra: content/<cấp>/<chủ-đề>.json, mọi mục mới `status = draft`.
- Gọi AI theo lô ENRICH_BATCH_SIZE (10–20) mục cùng chủ đề, prompt prompts/enrich_v1.md; câu trả lời kiểm bằng Pydantic
  (EnrichItem). Mục thiếu / sai được hỏi lại, tối đa AI_MAX_RETRIES vòng; vẫn lỗi → processed/failed_03.json.
- Cache theo (cấp, chủ đề, headword, pos, phiên bản prompt, mã băm prompt đã dựng): chạy lại không gọi API lần nữa.
- IPA: luôn lấy từ CMUdict (lib/ipa.py); AI KHÔNG ghi đè. Chỉ khi CMUdict không có từ thì dùng `ipa_suggestion` của AI và
  đặt `ipa_unverified = true`.
- File nội dung đã có: mục đã có (theo content_key) GIỮ NGUYÊN (người duyệt có thể đã sửa); chỉ thêm mục mới. `--redo-drafts`:
  soạn lại các mục còn `draft` và chưa từng được duyệt (vd. sau khi sửa prompt).
- Chọn phạm vi: `topics` (chỉ các chủ đề này), `per_topic` (N mục đầu mỗi chủ đề, theo `rank_in_topic`), `limit` (N mục đầu).
- Chế độ agent: lô chưa có output là "đang chờ" (`pending`), không vào failed_03.json; mục đã có output thì vẫn được ghi.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content, ipa, prompts
from data_pipeline.lib.ai import AgentPending, AIClient, AIError, AIJsonError, Usage, call_json
from data_pipeline.lib.cache import DiskCache, digest
from data_pipeline.lib.jsonio import read_json, write_json
from data_pipeline.lib.schemas import ContentEntry, EnrichItem

ENRICH_V = 1


@dataclass
class Job:
    topic_code: str
    item: dict  # mục của selection (bước 02)
    key: str  # content_key


@dataclass
class Result:
    usage: Usage = field(default_factory=Usage)
    failed: list[dict] = field(default_factory=list)
    pending: list[dict] = field(default_factory=list)
    written: dict[str, int] = field(default_factory=dict)
    from_cache: int = 0


def system_prompt(level: str, topic_code: str) -> str:
    t = config.topic(level, topic_code)
    return prompts.load("enrich", ENRICH_V, level=level, topic_title=t.title, topic_hint=t.hint_en,
                        meaning_max=str(config.MEANING_VI_MAX_WORDS), definition_max=str(config.DEFINITION_EN_MAX_WORDS),
                        example_min=str(config.EXAMPLE_EN_MIN_WORDS), example_max=str(config.EXAMPLE_EN_MAX_WORDS))


def cache_key(level: str, job: Job, system: str) -> str:
    return digest("enrich", level, job.topic_code, job.item["headword"], job.item["pos"], ENRICH_V, prompts.rendered_hash(system))


def plan(level: str, selection: dict, *, limit: int | None, content_root: Path | None, redo_drafts: bool = False,
         topics: list[str] | None = None, per_topic: int | None = None) -> list[Job]:
    jobs = []
    for t in config.topics(level):
        if topics and t.code not in topics:
            continue
        topic_jobs = []
        existing = content.by_key(content.load_or_new(level, t.code, content_root))
        for item in selection.get("topics", {}).get(t.code, []):
            key = content.content_key(level, t.code, item["headword"], item["pos"])
            old = existing.get(key)
            if old is not None and not (redo_drafts and old.status == "draft" and old.reviewed_at is None):
                continue
            topic_jobs.append(Job(t.code, item, key))
        jobs += topic_jobs[:per_topic] if per_topic else topic_jobs
    return jobs[:limit] if limit else jobs


def _user_message(jobs: list[Job], cmu: dict) -> str:
    lines = []
    for j in jobs:
        d = {"headword": j.item["headword"], "pos": j.item["pos"], "subgroup": j.item.get("subgroup", "")}
        if ipa.lookup(j.item["headword"], cmu) is None:
            d["ipa"] = "missing"
        lines.append(json.dumps(d, ensure_ascii=False))
    return "Write cards for these items:\n" + "\n".join(lines)


def _clean_ipa(text: str) -> str | None:
    text = (text or "").strip().strip("/").strip()
    return f"/{text}/" if text else None


def build_entry(level: str, job: Job, got: EnrichItem, prompt_tag: str, cmu: dict) -> ContentEntry:
    item = job.item
    cmu_ipa = ipa.lookup(item["headword"], cmu)
    return ContentEntry(
        content_key=job.key, headword=item["headword"], pos=item["pos"], entry_type=content.entry_type(item["headword"], item["pos"]),
        ipa=cmu_ipa or _clean_ipa(got.ipa_suggestion), ipa_unverified=cmu_ipa is None,
        meaning_vi=got.meaning_vi.strip(), definition_en=got.definition_en.strip(), example_en=got.example_en.strip(),
        example_vi=got.example_vi.strip(), collocations=[c.strip() for c in got.collocations if c.strip()],
        word_family=[w.strip().lower() for w in got.word_family if w.strip()], synonyms=[s.strip().lower() for s in got.synonyms if s.strip()],
        mnemonic_vi=got.mnemonic_vi.strip(), image_keyword=got.image_keyword.strip().lower(),
        commonness=item.get("commonness", 3), basic_communication=bool(item.get("basic_communication")),
        subgroup=item.get("subgroup", ""), rank_in_topic=item.get("rank_in_topic", 0), origin=item.get("origin", "source"),
        sources=item.get("sources", []), origin_flags=list(item.get("flags", [])), flags=list(item.get("flags", [])),
        status="draft", ai_prompt=prompt_tag,
    )


def enrich_batch(client: AIClient, level: str, jobs: list[Job], system: str, cache: DiskCache, result: Result, cmu: dict) -> dict[str, EnrichItem]:
    out: dict[str, EnrichItem] = {}
    todo = []
    for j in jobs:
        hit = cache.get(cache_key(level, j, system))
        if hit is not None:
            out[j.key] = EnrichItem.model_validate(hit)
            result.from_cache += 1
        else:
            todo.append(j)
    for _ in range(config.AI_MAX_RETRIES):
        if not todo:
            break
        try:
            got = call_json(client, system, _user_message(todo, cmu), list[EnrichItem], usage=result.usage, max_tokens=8000)
        except AgentPending:
            result.pending += [{"topic": j.topic_code, "headword": j.item["headword"], "pos": j.item["pos"]} for j in todo]
            todo = []
            break
        except (AIError, AIJsonError):
            continue
        by_word = {(g.headword.strip().lower(), g.pos.strip().lower()): g for g in got}
        remaining = []
        for j in todo:
            g = by_word.get((j.item["headword"], j.item["pos"]))
            if g is None or not g.meaning_vi.strip() or not g.example_en.strip():
                remaining.append(j)
                continue
            g = g.model_copy(update={"headword": j.item["headword"], "pos": j.item["pos"]})
            cache.set(cache_key(level, j, system), g.model_dump())
            out[j.key] = g
        todo = remaining
    result.failed += [{"step": "enrich", "topic": j.topic_code, "headword": j.item["headword"], "pos": j.item["pos"]} for j in todo]
    return out


def run(level: str, client: AIClient | None, *, limit: int | None = None, processed: Path = config.PROCESSED,
        content_root: Path | None = None, cache_root: Path | None = None, redo_drafts: bool = False,
        topics: list[str] | None = None, per_topic: int | None = None) -> dict:
    level = level.upper()
    selection = read_json(Path(processed) / f"{level.lower()}_selection.json", {})
    jobs = plan(level, selection, limit=limit, content_root=content_root, redo_drafts=redo_drafts, topics=topics, per_topic=per_topic)
    cache = DiskCache("enrich", cache_root)
    cmu = ipa.load_cmudict()
    result = Result()
    by_topic: dict[str, list[Job]] = {}
    for j in jobs:
        by_topic.setdefault(j.topic_code, []).append(j)
    for code, topic_jobs in by_topic.items():
        system = system_prompt(level, code)
        tag = f"enrich_v{ENRICH_V}#{prompts.rendered_hash(system)}"
        made: dict[str, EnrichItem] = {}
        for start in range(0, len(topic_jobs), config.ENRICH_BATCH_SIZE):
            made |= enrich_batch(client, level, topic_jobs[start:start + config.ENRICH_BATCH_SIZE], system, cache, result, cmu)
        topic = content.load_or_new(level, code, content_root)
        keep = [e for e in topic.entries if e.content_key not in made]
        new = [build_entry(level, j, made[j.key], tag, cmu) for j in topic_jobs if j.key in made]
        if not new and not (content.topic_path(level, code, content_root)).exists():
            continue  # cả chủ đề còn chờ output: chưa tạo file rỗng
        topic.entries = keep + new
        content.save_topic(topic, content_root)
        result.written[code] = len(new)
    if result.failed:
        write_json(Path(processed) / "failed_03.json", result.failed)
    report = {"level": level, "jobs": len(jobs), "written": result.written, "from_cache": result.from_cache,
              "failed": len(result.failed), "pending": len(result.pending), "ai": result.usage.as_dict()}
    write_json(Path(processed) / "report_03.json", report)
    return report


def estimate(level: str, *, limit: int | None, processed: Path = config.PROCESSED, content_root: Path | None = None,
             cache_root: Path | None = None, redo_drafts: bool = False, topics: list[str] | None = None,
             per_topic: int | None = None) -> dict:
    level = level.upper()
    selection = read_json(Path(processed) / f"{level.lower()}_selection.json", {})
    jobs = plan(level, selection, limit=limit, content_root=content_root, redo_drafts=redo_drafts, topics=topics, per_topic=per_topic)
    cache = DiskCache("enrich", cache_root)
    todo: dict[str, int] = {}
    for j in jobs:
        if not cache.has(cache_key(level, j, system_prompt(level, j.topic_code))):
            todo[j.topic_code] = todo.get(j.topic_code, 0) + 1
    items = sum(todo.values())
    requests = sum(-(-n // config.ENRICH_BATCH_SIZE) for n in todo.values())
    inp = requests * config.EST_INPUT_TOKENS_PER_REQUEST + items * config.EST_INPUT_TOKENS_PER_ENTRY
    outp = items * config.EST_OUTPUT_TOKENS_PER_ENTRY
    return {"items": items, "requests": requests, "input_tokens": inp, "output_tokens": outp,
            "cost_usd": round(inp / 1e6 * config.PRICE_INPUT_PER_MTOK + outp / 1e6 * config.PRICE_OUTPUT_PER_MTOK, 2)}
