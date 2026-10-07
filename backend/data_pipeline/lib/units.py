"""
Bước 06 — chia bài cho từng chủ đề (gọi từ data_pipeline/06_build_units.py).

- Chỉ dùng mục `approved`. Số bài k ∈ [UNITS_PER_TOPIC_MIN, UNITS_PER_TOPIC_MAX] sao cho mỗi bài có UNIT_SIZE_MIN–MAX mục,
  ưu tiên cỡ bài gần 18 nhất (hòa thì nhiều bài hơn, bài ngắn hơn). Không chia được → lỗi cho chủ đề đó (không ghi).
- Thứ tự dạy: theo độ dễ (cụm từ / giao tiếp cơ bản, điểm phổ biến, độ dài — giống bước 02), các mục cùng `subgroup` gom liền
  nhau để vào cùng bài; cụm từ cố định rải đều các bài (cụm dễ nhất vào bài 1) và rải đều trong bài (không dồn lên đầu),
  tối đa `phrase_cap(chủ đề)` cụm mỗi bài (PHRASES_PER_UNIT_MAX, riêng greetings 8); vượt thì lỗi.
- Tên bài: AI đề xuất (prompts/unit_titles_v1.md), `title_status = draft` để duyệt ở tab "Bài học" của /dev/content. Bài cùng
  vị trí, cùng danh sách mục với lần trước thì GIỮ tên và trạng thái tên cũ. Chế độ agent: chưa có output thì bài được ghi với
  tên trống; sau `--ingest` bài chưa có tên được đặt tên.
- `check_units`: không mục nào thuộc 2 bài cùng nhánh, mỗi bài 16–20 mục, không quá số cụm từ cho phép, mục trong bài phải tồn
  tại và đã duyệt (loader dùng lại).
- `interleave`: rải đều cụm từ vào danh sách từ (dùng cả ở bước 02 để xếp thứ tự soạn).
"""

from dataclasses import dataclass, field
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content, prompts
from data_pipeline.lib.ai import AIClient, AIError, AIJsonError, Usage, call_json
from data_pipeline.lib.cache import DiskCache, digest
from data_pipeline.lib.schemas import ContentEntry, ContentUnit, TopicFile, UnitTitleItem

TITLES_V = 1
IDEAL_UNIT_SIZE = 18


class UnitError(ValueError):
    pass


def unit_count(n: int) -> int:
    options = [k for k in range(config.UNITS_PER_TOPIC_MIN, config.UNITS_PER_TOPIC_MAX + 1)
               if k * config.UNIT_SIZE_MIN <= n <= k * config.UNIT_SIZE_MAX]
    if not options:
        raise UnitError(f"{n} mục đã duyệt không chia được thành {config.UNITS_PER_TOPIC_MIN}–{config.UNITS_PER_TOPIC_MAX} bài "
                        f"× {config.UNIT_SIZE_MIN}–{config.UNIT_SIZE_MAX} mục")
    return min(options, key=lambda k: (abs(n / k - IDEAL_UNIT_SIZE), -k))


def estimated_units(n: int) -> int:
    """Số bài dự kiến cho chủ đề n mục (bước 02, báo cáo): đúng như `unit_count` (luật 15–20 mục mỗi bài, vd. 61 → 4 bài);
    cỡ không chia được (dưới 45 mục…) thì lấy số bài gần nhất trong UNITS_PER_TOPIC_MIN–MAX."""
    try:
        return unit_count(n)
    except UnitError:
        k = round(n / IDEAL_UNIT_SIZE)
        return min(config.UNITS_PER_TOPIC_MAX, max(config.UNITS_PER_TOPIC_MIN, k))


def phrase_cap(topic_code: str) -> int:
    return config.PHRASES_PER_UNIT_MAX_BY_TOPIC.get(topic_code, config.PHRASES_PER_UNIT_MAX)


def interleave(words: list, phrases: list) -> list:
    """Rải đều `phrases` vào giữa `words` (giữ thứ tự từng danh sách): cụm thứ j ở vị trí ~ (j + 0.5) · n / số cụm."""
    if not phrases:
        return list(words)
    n = len(words) + len(phrases)
    slots = {int((j + 0.5) * n / len(phrases)) for j in range(len(phrases))}
    w, p = iter(words), iter(phrases)
    return [next(p) if i in slots else next(w) for i in range(n)]


def ease_key(e: ContentEntry) -> tuple:
    basic = e.pos == config.POS_PHRASE or e.basic_communication
    return (0 if basic else 1, -e.commonness, len(e.headword.split()), len(e.headword), e.rank_in_topic, e.headword)


def teaching_order(entries: list[ContentEntry]) -> list[ContentEntry]:
    """Sắp theo độ dễ, rồi gom mục cùng subgroup liền nhau (nhóm xếp theo mục dễ nhất của nhóm)."""
    ordered = sorted(entries, key=ease_key)
    groups: dict[str, list[ContentEntry]] = {}
    for e in ordered:
        groups.setdefault(e.subgroup or f"_{e.content_key}", []).append(e)
    return [e for g in groups.values() for e in g]


def split(entries: list[ContentEntry], topic_code: str = "") -> list[list[ContentEntry]]:
    k = unit_count(len(entries))
    sizes = [len(entries) // k + (1 if i < len(entries) % k else 0) for i in range(k)]
    phrases = sorted([e for e in entries if e.pos == config.POS_PHRASE], key=ease_key)
    if len(phrases) > phrase_cap(topic_code) * k:
        raise UnitError(f"{len(phrases)} cụm từ đã duyệt, quá {phrase_cap(topic_code)} cụm × {k} bài — bớt cụm từ (từ chối) trước")
    words = teaching_order([e for e in entries if e.pos != config.POS_PHRASE])
    unit_phrases: list[list[ContentEntry]] = [[] for _ in range(k)]
    for i, p in enumerate(phrases):
        unit_phrases[i % k].append(p)
    it = iter(words)
    units = []
    for i in range(k):
        unit_words = [next(it) for _ in range(sizes[i] - len(unit_phrases[i]))]
        units.append(interleave(unit_words, unit_phrases[i]))
    return units


def check_units(topic: TopicFile, branch: str = config.DEFAULT_BRANCH) -> list[str]:
    """Danh sách lỗi (rỗng = hợp lệ) của các bài trong một nhánh."""
    errors = []
    approved = {e.content_key for e in topic.entries if e.status == "approved"}
    seen: dict[str, int] = {}
    units = [u for u in topic.units if u.branch == branch]
    is_phrase = {e.content_key for e in topic.entries if e.pos == config.POS_PHRASE}
    if not units:
        return [f"{topic.topic_code}: chưa chia bài"]
    if [u.position for u in sorted(units, key=lambda u: u.position)] != list(range(1, len(units) + 1)):
        errors.append(f"{topic.topic_code}: vị trí bài phải liên tiếp từ 1")
    for u in units:
        if not config.UNIT_SIZE_MIN <= len(u.entries) <= config.UNIT_SIZE_MAX:
            errors.append(f"{u.content_key}: {len(u.entries)} mục (phải {config.UNIT_SIZE_MIN}–{config.UNIT_SIZE_MAX})")
        n_phrases = sum(k in is_phrase for k in u.entries)
        if n_phrases > phrase_cap(topic.topic_code):
            errors.append(f"{u.content_key}: {n_phrases} cụm từ (tối đa {phrase_cap(topic.topic_code)})")
        for key in u.entries:
            if key in seen:
                errors.append(f"{key} thuộc 2 bài: bài {seen[key]} và bài {u.position}")
            seen[key] = u.position
            if key not in approved:
                errors.append(f"{u.content_key}: {key} không phải mục đã duyệt")
    return errors


@dataclass
class BuildResult:
    usage: Usage = field(default_factory=Usage)
    topics: dict[str, dict] = field(default_factory=dict)
    errors: dict[str, list[str]] = field(default_factory=dict)


def _titles(client: AIClient | None, topic: TopicFile, groups: list[list[ContentEntry]], cache: DiskCache, usage: Usage) -> dict[int, str]:
    system = prompts.load("unit_titles", TITLES_V, level=topic.level, topic_title=topic.topic_title)
    user = "\n".join(f"Lesson {i}: " + ", ".join(e.headword for e in g) for i, g in enumerate(groups, 1))
    key = digest("unit_titles", topic.level, topic.topic_code, TITLES_V, prompts.rendered_hash(system), user)
    hit = cache.get(key)
    if hit is not None:
        return {int(k): v for k, v in hit.items()}
    if client is None:
        return {}
    try:
        got = call_json(client, system, user, list[UnitTitleItem], usage=usage)
    except (AIError, AIJsonError):
        return {}
    titles = {g.position: g.title.strip() for g in got if 1 <= g.position <= len(groups) and g.title.strip()}
    cache.set(key, {str(k): v for k, v in titles.items()})
    return titles


def build_topic(topic: TopicFile, client: AIClient | None, cache: DiskCache, usage: Usage, branch: str = config.DEFAULT_BRANCH) -> TopicFile:
    approved = [e for e in topic.entries if e.status == "approved"]
    groups = split(approved, topic.topic_code)
    old = {u.position: u for u in topic.units if u.branch == branch}
    titles = _titles(client, topic, groups, cache, usage)
    units = []
    for i, g in enumerate(groups, 1):
        keys = [e.content_key for e in g]
        prev = old.get(i)
        if prev is not None and prev.entries == keys and prev.title:
            units.append(prev)
        else:
            units.append(ContentUnit(content_key=f"{topic.level.lower()}.{topic.topic_code}.u{i}", branch=branch, position=i,
                                     title=titles.get(i, ""), title_status="draft", entries=keys))
    topic.units = [u for u in topic.units if u.branch != branch] + units
    errors = check_units(topic, branch)
    if errors:
        raise UnitError("; ".join(errors))
    return topic


def run(level: str, client: AIClient | None, *, topic_code: str | None = None, content_root: Path | None = None,
        cache_root: Path | None = None) -> BuildResult:
    result = BuildResult()
    cache = DiskCache("units", cache_root)
    for path in content.level_files(level, content_root):
        topic = content.load_topic(path)
        if topic_code and topic.topic_code != topic_code:
            continue
        try:
            built = build_topic(topic, client, cache, result.usage)
        except UnitError as e:
            result.errors[topic.topic_code] = [str(e)]
            continue
        content.save_topic(built, content_root)
        result.topics[topic.topic_code] = {"units": [len(u.entries) for u in built.units],
                                           "untitled": sum(1 for u in built.units if not u.title)}
    return result
