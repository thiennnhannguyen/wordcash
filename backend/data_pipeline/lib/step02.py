"""
Bước 02 — chọn từ một cấp (A1) và chia chủ đề (gọi từ data_pipeline/02_select_and_tag.py).

1. Ứng viên: được ít nhất một nguồn gắn đúng cấp (CEFR-J A1); bỏ từ chức năng (exclude_function_words.txt).
2. AI phân loại (prompts/classify_v1.md, theo lô CLASSIFY_BATCH_SIZE, có cache): mỗi từ vào ĐÚNG MỘT chủ đề, kèm độ tự tin,
   lý do, điểm phổ biến 1–5, cờ giao tiếp cơ bản, nhóm nhỏ. Độ tự tin < TOPIC_CONFIDENCE_MIN → cờ `needs_topic_review`.
3. Cụm từ cố định (~PHRASE_RATIO mỗi chủ đề, prompts/phrases_v1.md): `pos = phrase`, cờ `phrase`.
4. Cân bằng: chủ đề dưới TOPIC_SIZE_MIN → AI đề xuất thêm từ (prompts/suggest_v1.md), cờ `ai_suggested_headword`; chủ đề
   trên TOPIC_SIZE_MAX, hoặc cả cấp vượt TARGET_PER_LEVEL quá 5% → bớt mục ưu tiên thấp nhất của chủ đề đông nhất, đưa vào
   `reserve` (người duyệt có thể đổi lại).
5. Thứ tự trong chủ đề (nguồn CEFR-J không có tần suất): cụm từ cố định và từ giao tiếp cơ bản trước, rồi điểm phổ biến do AI
   chấm (lưu trong mục, người duyệt chỉnh được), rồi từ ngắn trước.

`--limit N` (chạy thử): chỉ phân loại N ứng viên đầu, KHÔNG thêm cụm từ, đề xuất hay cân bằng.
Đầu ra: processed/<cấp>_selection.json + processed/report_02.json.
"""

from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import prompts
from data_pipeline.lib.ai import AIClient, AIError, AIJsonError, Usage, call_json
from data_pipeline.lib.cache import DiskCache, digest
from data_pipeline.lib.jsonio import read_json, write_json
from data_pipeline.lib.normalize import normalize_headword
from data_pipeline.lib.schemas import ClassifyItem, PhraseItem, SuggestItem

CLASSIFY_V, PHRASES_V, SUGGEST_V = 1, 1, 1
FUNCTION_POS_OK = {"noun", "verb", "adjective", "adverb", "number", "interjection", "phrase"}


@dataclass
class Context:
    level: str
    client: AIClient | None
    cache: DiskCache
    usage: Usage = field(default_factory=Usage)
    failed: list[dict] = field(default_factory=list)


def topic_lines(level: str) -> str:
    return "\n".join(f"- {t.code}: {t.hint_en} (Vietnamese title: {t.title})" for t in config.topics(level))


def classify_prompt(level: str) -> str:
    return prompts.load("classify", CLASSIFY_V, level=level, topics=topic_lines(level))


def select_level(candidates: list[dict], level: str, function_words: set[str]) -> tuple[list[dict], list[dict]]:
    chosen, excluded = [], []
    for c in candidates:
        if level not in (c.get("cefr") or {}).values():
            continue
        if c["headword"] in function_words:
            excluded.append({"headword": c["headword"], "pos": c["pos"], "reason": "function_word"})
            continue
        chosen.append(c)
    return chosen, excluded


def _classify_key(ctx: Context, system: str, c: dict) -> str:
    return digest("classify", ctx.level, c["headword"], c["pos"], CLASSIFY_V, prompts.rendered_hash(system))


def uncached_classify(ctx: Context, items: list[dict]) -> list[dict]:
    system = classify_prompt(ctx.level)
    return [c for c in items if not ctx.cache.has(_classify_key(ctx, system, c))]


def classify(ctx: Context, items: list[dict]) -> dict[tuple[str, str], ClassifyItem]:
    """Kết quả theo (headword, pos). Mục AI không trả (sau AI_MAX_RETRIES vòng) vào ctx.failed."""
    system = classify_prompt(ctx.level)
    codes = {t.code for t in config.topics(ctx.level)}
    out: dict[tuple[str, str], ClassifyItem] = {}
    todo = []
    for c in items:
        hit = ctx.cache.get(_classify_key(ctx, system, c))
        if hit is not None:
            out[(c["headword"], c["pos"])] = ClassifyItem.model_validate(hit)
        else:
            todo.append(c)
    for start in range(0, len(todo), config.CLASSIFY_BATCH_SIZE):
        batch = todo[start:start + config.CLASSIFY_BATCH_SIZE]
        for _ in range(config.AI_MAX_RETRIES):
            if not batch:
                break
            user = "Classify these items:\n" + "\n".join(f'{{"headword": "{c["headword"]}", "pos": "{c["pos"]}"}}' for c in batch)
            try:
                got = call_json(ctx.client, system, user, list[ClassifyItem], usage=ctx.usage, max_tokens=8000)
            except (AIError, AIJsonError):
                continue
            by_key = {(g.headword.strip().lower(), g.pos.strip().lower()): g for g in got}
            remaining = []
            for c in batch:
                g = by_key.get((c["headword"], c["pos"]))
                if g is None or g.topic_code not in codes:
                    remaining.append(c)
                    continue
                g = g.model_copy(update={"headword": c["headword"], "pos": c["pos"]})
                ctx.cache.set(_classify_key(ctx, system, c), g.model_dump())
                out[(c["headword"], c["pos"])] = g
            batch = remaining
        ctx.failed += [{"step": "classify", "headword": c["headword"], "pos": c["pos"]} for c in batch]
    return out


def make_item(c: dict, g: ClassifyItem) -> dict:
    flags = ["needs_topic_review"] if g.confidence < config.TOPIC_CONFIDENCE_MIN else []
    if c["pos"] == config.POS_PHRASE:
        flags.append("phrase")
    return {
        "headword": c["headword"], "pos": c["pos"], "topic_code": g.topic_code, "topic_confidence": round(g.confidence, 2),
        "topic_reason": g.reason, "commonness": g.commonness, "basic_communication": g.basic_communication,
        "subgroup": g.subgroup.strip().lower(), "origin": "source", "flags": flags,
        "cefr": c.get("cefr", {}), "sources": c.get("sources", []),
    }


def _generated(ctx: Context, kind: str, version: int, topic, count: int, existing: list[str], schema) -> list:
    template = prompts.load(kind, version, level=ctx.level, topic_code=topic.code, topic_hint=topic.hint_en, count=str(count),
                            existing="(see below)")
    key = digest(kind, ctx.level, topic.code, count, version, prompts.rendered_hash(template))
    hit = ctx.cache.get(key)
    if hit is not None:
        return [schema.model_validate(x) for x in hit]
    system = prompts.load(kind, version, level=ctx.level, topic_code=topic.code, topic_hint=topic.hint_en, count=str(count),
                          existing=", ".join(sorted(existing)) or "(none)")
    try:
        got = call_json(ctx.client, system, f"Give {count} items for topic {topic.code}.", list[schema], usage=ctx.usage)
    except (AIError, AIJsonError) as e:
        ctx.failed.append({"step": kind, "topic": topic.code, "error": str(e)})
        return []
    ctx.cache.set(key, [g.model_dump() for g in got])
    return got


def priority(item: dict) -> tuple:
    """Khóa sắp xếp trong chủ đề (nhỏ = dạy trước)."""
    basic = item["pos"] == config.POS_PHRASE or item.get("basic_communication")
    return (0 if basic else 1, -item.get("commonness", 3), len(item["headword"].split()), len(item["headword"]), item["headword"])


def removal_order(item: dict) -> tuple:
    """Khóa bớt mục khi chủ đề quá đông (nhỏ = bớt trước): không bớt cụm từ / giao tiếp cơ bản trước."""
    protected = item["pos"] == config.POS_PHRASE or item.get("basic_communication")
    return (1 if protected else 0, item.get("commonness", 3), item.get("topic_confidence", 1), -len(item["headword"]))


def balance(topics: dict[str, list[dict]], reserve: list[dict], target_total: int) -> None:
    for items in topics.values():
        items.sort(key=removal_order)
        while len(items) > config.TOPIC_SIZE_MAX:
            reserve.append({**items.pop(0), "reserve_reason": "topic_overflow"})
    target_per_topic = target_total // max(len(topics), 1)
    while sum(map(len, topics.values())) > target_total * 1.05:
        code = max(topics, key=lambda k: len(topics[k]))
        if len(topics[code]) <= target_per_topic:
            break
        topics[code].sort(key=removal_order)
        reserve.append({**topics[code].pop(0), "reserve_reason": "level_over_target"})


def run(level: str, client: AIClient | None, *, limit: int | None = None, processed: Path = config.PROCESSED,
        cache_root: Path | None = None) -> dict:
    level = level.upper()
    ctx = Context(level, client, DiskCache("select", cache_root))
    candidates = read_json(Path(processed) / "candidates.json", [])
    function_words = config.read_word_list(config.EXCLUDE_FUNCTION_WORDS)
    chosen, excluded = select_level(candidates, level, function_words)
    if limit:
        chosen = chosen[:limit]

    results = classify(ctx, chosen)
    topics: dict[str, list[dict]] = {t.code: [] for t in config.topics(level)}
    for c in chosen:
        g = results.get((c["headword"], c["pos"]))
        if g is not None:
            topics[g.topic_code].append(make_item(c, g))

    reserve: list[dict] = []
    target_topic = config.TARGET_PER_LEVEL // len(topics)
    if not limit:
        taken = {i["headword"] for items in topics.values() for i in items} | function_words
        for t in config.topics(level):
            have = sum(1 for i in topics[t.code] if i["pos"] == config.POS_PHRASE)
            need = round(target_topic * config.PHRASE_RATIO) - have
            if need > 0:
                for p in _generated(ctx, "phrases", PHRASES_V, t, need, sorted(taken), PhraseItem):
                    head = normalize_headword(p.headword)
                    if not head or head in taken or len(head.split()) < 2:
                        continue
                    taken.add(head)
                    topics[t.code].append({"headword": head, "pos": config.POS_PHRASE, "topic_code": t.code, "topic_confidence": 1.0,
                                           "topic_reason": "AI đề xuất cụm từ cho chủ đề", "commonness": p.commonness,
                                           "basic_communication": p.basic_communication, "subgroup": p.subgroup.strip().lower(),
                                           "origin": "ai_phrase", "flags": ["phrase"], "cefr": {}, "sources": []})
        for t in config.topics(level):
            missing = config.TOPIC_SIZE_MIN - len(topics[t.code])
            if missing > 0:
                want = target_topic - len(topics[t.code])
                for s in _generated(ctx, "suggest", SUGGEST_V, t, want, sorted(taken), SuggestItem):
                    head = normalize_headword(s.headword)
                    if not head or head in taken or s.pos not in FUNCTION_POS_OK:
                        continue
                    taken.add(head)
                    topics[t.code].append({"headword": head, "pos": s.pos, "topic_code": t.code, "topic_confidence": 1.0,
                                           "topic_reason": s.reason, "commonness": s.commonness, "basic_communication": False,
                                           "subgroup": s.subgroup.strip().lower(), "origin": "ai_suggested",
                                           "flags": ["ai_suggested_headword"], "cefr": {}, "sources": []})
        balance(topics, reserve, config.TARGET_PER_LEVEL)

    for items in topics.values():
        items.sort(key=priority)
        for i, item in enumerate(items, start=1):
            item["rank_in_topic"] = i

    selection = {"level": level, "generated_at": datetime.now(UTC).isoformat(timespec="seconds"), "limited_to": limit,
                 "topics": topics, "reserve": reserve, "excluded": excluded, "failed": ctx.failed}
    report = {
        "level": level, "limited_to": limit, "candidates_at_level": len(chosen) + len(excluded) if not limit else None,
        "classified": len(results), "excluded": dict(Counter(e["reason"] for e in excluded)),
        "topics": {code: {"total": len(items), "phrases": sum(i["pos"] == config.POS_PHRASE for i in items),
                          "ai_suggested": sum(i["origin"] == "ai_suggested" for i in items),
                          "needs_topic_review": sum("needs_topic_review" in i["flags"] for i in items)}
                   for code, items in topics.items()},
        "total": sum(map(len, topics.values())), "reserve": len(reserve), "failed": len(ctx.failed), "ai": ctx.usage.as_dict(),
    }
    write_json(Path(processed) / f"{level.lower()}_selection.json", selection)
    write_json(Path(processed) / "report_02.json", report)
    if ctx.failed:
        write_json(Path(processed) / "failed_02.json", ctx.failed)
    return report


def estimate(level: str, *, limit: int | None, processed: Path = config.PROCESSED, cache_root: Path | None = None) -> dict:
    """Số mục / request cần gọi AI (bỏ qua mục đã có trong cache), ước tính token và chi phí."""
    ctx = Context(level.upper(), None, DiskCache("select", cache_root))
    candidates = read_json(Path(processed) / "candidates.json", [])
    chosen, _ = select_level(candidates, ctx.level, config.read_word_list(config.EXCLUDE_FUNCTION_WORDS))
    if limit:
        chosen = chosen[:limit]
    todo = len(uncached_classify(ctx, chosen))
    extra = 0 if limit else 2 * len(config.topics(ctx.level))  # cụm từ + đề xuất thêm (tối đa) mỗi chủ đề
    requests = -(-todo // config.CLASSIFY_BATCH_SIZE) + extra
    inp = requests * config.EST_INPUT_TOKENS_PER_REQUEST // 3 + todo * 20
    outp = todo * 60 + extra * 800
    return {"items": todo, "requests": requests, "input_tokens": inp, "output_tokens": outp,
            "cost_usd": round(inp / 1e6 * config.PRICE_INPUT_PER_MTOK + outp / 1e6 * config.PRICE_OUTPUT_PER_MTOK, 2)}
