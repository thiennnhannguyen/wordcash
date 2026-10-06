"""
Bước 01 — nhập và chuẩn hóa danh sách từ (gọi từ data_pipeline/01_import_wordlist.py).

Đọc mọi file trong raw/ bằng bộ đọc nguồn tương ứng (lib/sources/), chuẩn hóa (lib/normalize.py), lấy lemma bảo thủ, gộp theo
(headword, pos): giữ cấp CEFR và thứ hạng theo từng nguồn, tên nguồn, các biến thể gốc. File dữ liệu không có bộ đọc → lỗi
(không dùng nguồn chưa khai báo giấy phép). Đầu ra: processed/candidates.json + processed/report_01.json.
"""

from collections import Counter, defaultdict
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import morph
from data_pipeline.lib.jsonio import write_json
from data_pipeline.lib.normalize import normalize_headword, normalize_pos
from data_pipeline.lib.sources import reader_for

CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]
IGNORED = {"readme", "license", "licence", "notice"}


class UnknownSourceError(ValueError):
    pass


def source_files(raw_dir: Path) -> list[Path]:
    files = []
    for p in sorted(Path(raw_dir).iterdir()):
        if p.is_dir() or p.name.startswith(".") or p.stem.lower().split(".")[0] in IGNORED or p.suffix.lower() in (".md", ".pdf"):
            continue
        files.append(p)
    return files


def import_sources(raw_dir: Path = config.RAW) -> tuple[list[dict], dict]:
    report = {"sources": [], "dropped": {}, "dropped_examples": {}, "lemmatized": [], "merged_duplicates": 0}
    unknown = [p.name for p in source_files(raw_dir) if reader_for(p) is None]
    if unknown:
        raise UnknownSourceError(f"Không có bộ đọc cho: {', '.join(unknown)}. Khai báo nguồn trong docs/data-sources.md và "
                                 "viết bộ đọc trong data_pipeline/lib/sources/ trước.")
    rows = []
    for path in source_files(raw_dir):
        reader = reader_for(path)
        raw = reader.read(path)
        report["sources"].append({"file": path.name, "source": reader.name, "version": reader.version(path), "rows": len(raw),
                                  "has_frequency_rank": reader.has_frequency_rank})
        rows.extend(raw)

    dropped: Counter = Counter()
    examples: dict[str, list[str]] = defaultdict(list)

    def drop(reason: str, value: str) -> None:
        dropped[reason] += 1
        if len(examples[reason]) < 10:
            examples[reason].append(value)

    normalized = []
    for row in rows:
        head = normalize_headword(row.headword)
        pos = normalize_pos(row.pos)
        if head is None:
            drop("invalid_headword", row.headword)
            continue
        if pos is None:
            drop("unknown_pos", f"{row.headword} ({row.pos})")
            continue
        normalized.append((head, pos, row))

    known = {h for h, _, _ in normalized}
    merged: dict[tuple[str, str], dict] = {}
    for head, pos, row in normalized:
        base = morph.lemma(head, pos, known)
        if base != head:
            report["lemmatized"].append(f"{head} → {base}")
            head = base
        key = (head, pos)
        item = merged.get(key)
        if item is None:
            item = merged[key] = {"headword": head, "pos": pos, "cefr": {}, "rank": {}, "sources": [], "variants": []}
        else:
            report["merged_duplicates"] += 1
        src = row.source
        if src not in item["sources"]:
            item["sources"].append(src)
        if row.cefr and (src not in item["cefr"] or CEFR_ORDER.index(row.cefr) < CEFR_ORDER.index(item["cefr"][src])):
            item["cefr"][src] = row.cefr
        if row.rank is not None and (src not in item["rank"] or row.rank < item["rank"][src]):
            item["rank"][src] = row.rank
        variant = row.headword.strip()
        if variant.lower() != head and variant not in item["variants"]:
            item["variants"].append(variant)

    candidates = []
    for item in merged.values():
        levels = [lv for lv in item["cefr"].values() if lv]
        item["cefr_min"] = min(levels, key=CEFR_ORDER.index) if levels else None
        candidates.append(item)
    candidates.sort(key=lambda c: (CEFR_ORDER.index(c["cefr_min"]) if c["cefr_min"] else 9, min(c["rank"].values(), default=10**9),
                                   c["headword"], c["pos"]))
    for s in report["sources"]:
        s["kept"] = sum(1 for c in candidates if s["source"] in c["sources"])
    report["dropped"] = dict(dropped)
    report["dropped_examples"] = dict(examples)
    report["total_rows"] = len(rows)
    report["candidates"] = len(candidates)
    report["by_cefr"] = dict(Counter(c["cefr_min"] or "none" for c in candidates))
    return candidates, report


def run(raw_dir: Path = config.RAW, out_dir: Path = config.PROCESSED) -> dict:
    candidates, report = import_sources(raw_dir)
    write_json(Path(out_dir) / "candidates.json", candidates)
    write_json(Path(out_dir) / "report_01.json", report)
    return report
