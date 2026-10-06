"""
Xuất / nhập bảng tính để duyệt ngoài app (gọi từ data_pipeline/05_review_export.py).

- Xuất: mọi mục của một cấp ra CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt) hoặc XLSX. Danh sách nối bằng " | ".
- Nhập: đối chiếu theo `content_key`; chỉ các cột sửa được (EDITABLE_COLUMNS) và trạng thái duyệt. Luôn tính bảng khác biệt
  trước; chỉ ghi khi `apply=True`. Dòng có content_key không tồn tại, trạng thái sai, hoặc từ chối không có lý do → lỗi
  (không ghi gì của file đó). Đổi trạng thái thì ghi reviewed_at.
"""

import csv
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from data_pipeline.lib import content
from data_pipeline.lib.schemas import ContentEntry

LIST_COLUMNS = ("collocations", "word_family", "synonyms")
EDITABLE_COLUMNS = ("meaning_vi", "definition_en", "example_en", "example_vi", "collocations", "word_family", "synonyms",
                    "mnemonic_vi", "image_keyword", "ipa", "status", "review_note", "reject_reason")
COLUMNS = ("content_key", "topic", "headword", "pos", *EDITABLE_COLUMNS, "flags")
SEP = " | "


def _cell(entry: ContentEntry, col: str, topic_code: str) -> str:
    if col == "topic":
        return topic_code
    value = getattr(entry, col)
    if col in LIST_COLUMNS or col == "flags":
        return SEP.join(value)
    return "" if value is None else str(value)


def export(level: str, out: Path, root: Path | None = None) -> int:
    rows = []
    for path in content.level_files(level, root):
        t = content.load_topic(path)
        rows += [[_cell(e, c, t.topic_code) for c in COLUMNS] for e in t.entries]
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() == ".xlsx":
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = level.upper()
        ws.append(list(COLUMNS))
        for r in rows:
            ws.append(r)
        wb.save(out)
    else:
        with out.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(COLUMNS)
            w.writerows(rows)
    return len(rows)


def _read(path: Path) -> list[dict[str, str]]:
    from data_pipeline.lib.sources import read_table

    return read_table(path, {"content_key"})


@dataclass
class ImportResult:
    changes: list[dict] = field(default_factory=list)  # {content_key, field, old, new}
    errors: list[str] = field(default_factory=list)
    applied: bool = False


def import_sheet(level: str, path: Path, *, apply: bool = False, root: Path | None = None, now: datetime | None = None) -> ImportResult:
    result = ImportResult()
    topics = {p: content.load_topic(p) for p in content.level_files(level, root)}
    index = {e.content_key: (p, e) for p, t in topics.items() for e in t.entries}
    staged: dict[str, dict] = {}
    for n, row in enumerate(_read(path), start=2):
        key = (row.get("content_key") or "").strip()
        if key not in index:
            result.errors.append(f"Dòng {n}: không có content_key {key!r}")
            continue
        _, entry = index[key]
        data = entry.model_dump()
        for col in EDITABLE_COLUMNS:
            if col not in row:
                continue
            raw = row[col].strip()
            new = [v.strip() for v in raw.split("|") if v.strip()] if col in LIST_COLUMNS else (raw or (None if col == "ipa" else ""))
            if new != data[col]:
                result.changes.append({"content_key": key, "field": col, "old": data[col], "new": new})
                data[col] = new
        if data["status"] not in ("draft", "approved", "rejected"):
            result.errors.append(f"Dòng {n}: trạng thái {data['status']!r} không hợp lệ")
            continue
        if data["status"] == "rejected" and not data["reject_reason"].strip():
            result.errors.append(f"Dòng {n}: từ chối thì phải có reject_reason")
            continue
        if data["status"] != entry.status:
            data["reviewed_at"] = now or datetime.now(UTC)
        staged[key] = data
    if result.errors or not apply:
        return result
    for p, t in topics.items():
        changed = False
        for i, e in enumerate(t.entries):
            if e.content_key in staged and staged[e.content_key] != e.model_dump():
                t.entries[i] = ContentEntry.model_validate(staged[e.content_key])
                changed = True
        if changed:
            content.save_topic(t, root)
    result.applied = True
    return result
