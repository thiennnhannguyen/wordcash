"""
Đợt chọn mẫu duyệt và duyệt hàng loạt theo mẫu.

Chọn mẫu (`choose`, lệnh `pipeline sample`):
- Mỗi chủ đề: N mục ngẫu nhiên (hạt giống cố định, ghi lại được) CỘNG THÊM mọi mục bắt buộc phải xem (`must_review`):
  headword do AI đề xuất (`ai_suggested_headword`), IPA chưa xác minh (`ipa_unverified`), có ghi chú Anh-Mỹ (`variant_note`),
  hoặc còn cờ kiểm tra tự động (ngoài cờ thông tin `config.INFO_FLAGS`). Phần ngẫu nhiên chọn trong các mục còn lại.
- Chỉ chọn trong mục chưa từ chối. Mặc định DỪNG nếu còn mục draft chưa có câu điền từ Mức 4 (cloze_en + 3 cloze_distractors)
  — phải chạy bước 03b trước (`allow_missing_cloze` bỏ qua kiểm tra).
- Ghi `review_sample = true` vào chính file nội dung (mục ngoài mẫu `false`) — trang /dev/content lọc "Mẫu duyệt" theo trường
  này. Kèm bản ghi work/review_sample_<cấp>.json: {level, seed, per_topic, created_at, keys, forced: {chủ đề: {key: [lý do]}}}.
  Đã có mẫu thì không chọn lại trừ khi `force` (tránh vô tình đổi mẫu giữa chừng).

Duyệt hàng loạt theo mẫu (`approve_by_sample`, lệnh `pipeline approve-by-sample`), từng chủ đề:
- chỉ chạy khi MỌI mục mẫu đã approved hoặc rejected (còn draft → bỏ qua, báo số mục chưa xem);
- tỉ lệ rejected trong mẫu > `config.SAMPLE_MAX_REJECT_RATE` (7%: với mẫu 15–28 mục là
  cho phép 1 mục bị từ chối, từ 2 mục trở lên) → DỪNG chủ đề, báo "cần duyệt toàn bộ";
- đạt → mục draft còn lại (ngoài mẫu) chuyển approved, `review_method = "sample"`, `reviewed_at` = lúc chạy. Mục draft còn cờ
  kiểm tra tự động KHÔNG được duyệt hàng loạt (để người duyệt xem tay). Mục duyệt tay giữ `review_method = "manual"`.
"""

import random
from datetime import UTC, datetime
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content
from data_pipeline.lib.jsonio import read_json, write_json
from data_pipeline.lib.schemas import ContentEntry


class SampleError(RuntimeError):
    pass


def sample_path(level: str, root: Path | None = None) -> Path:
    return Path(root or config.WORK) / f"review_sample_{level.lower()}.json"


def load(level: str, root: Path | None = None) -> dict | None:
    return read_json(sample_path(level, root))


def problem_flags(e: ContentEntry) -> list[str]:
    return sorted(set(e.flags) - config.INFO_FLAGS)


def must_review(e: ContentEntry) -> list[str]:
    """Lý do mục phải nằm trong mẫu dù không được bốc ngẫu nhiên ([] = không bắt buộc)."""
    reasons = []
    if "ai_suggested_headword" in e.flags or "ai_suggested_headword" in e.origin_flags:
        reasons.append("ai_suggested_headword")
    if e.ipa_unverified:
        reasons.append("ipa_unverified")
    if e.variant_note.strip():
        reasons.append("variant_note")
    reasons += [f"flag:{f}" for f in problem_flags(e)]
    return reasons


def missing_cloze(level: str, content_root: Path | None = None) -> list[str]:
    out = []
    for p in content.level_files(level, content_root):
        out += [e.content_key for e in content.load_topic(p).entries
                if e.status == "draft" and not (e.cloze_en.strip() and e.cloze_distractors)]
    return out


def choose(level: str, per_topic: int, *, seed: int | None = None, force: bool = False, allow_missing_cloze: bool = False,
           content_root: Path | None = None, work_root: Path | None = None) -> dict:
    level = level.upper()
    path = sample_path(level, work_root)
    if path.exists() and not force:
        raise SampleError(f"Đã có mẫu ({path.name}); thêm --force để chọn lại.")
    if not allow_missing_cloze:
        missing = missing_cloze(level, content_root)
        if missing:
            raise SampleError(f"Còn {len(missing)} mục draft chưa có câu điền từ Mức 4 (vd. {missing[0]}): chạy bước 03b trước.")
    seed = seed if seed is not None else random.SystemRandom().randrange(1, 10**6)
    rng = random.Random(seed)
    keys: dict[str, list[str]] = {}
    forced: dict[str, dict[str, list[str]]] = {}
    rows = []
    for p in content.level_files(level, content_root):
        topic = content.load_topic(p)
        pool = [e for e in topic.entries if e.status != "rejected"]
        must = {e.content_key: must_review(e) for e in pool if must_review(e)}
        rest = sorted(e.content_key for e in pool if e.content_key not in must)
        picked = set(rng.sample(rest, min(per_topic, len(rest)))) | set(must)
        for e in topic.entries:
            e.review_sample = e.content_key in picked
        content.save_topic(topic, content_root)
        keys[topic.topic_code] = sorted(picked)
        forced[topic.topic_code] = dict(sorted(must.items()))
        rows.append({"topic": topic.topic_code, "entries": len(topic.entries), "random": len(picked) - len(must),
                     "forced": len(must), "sample": len(picked)})
    data = {"level": level, "seed": seed, "per_topic": per_topic, "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "keys": keys, "forced": forced}
    write_json(path, data)
    return {**data, "topics": rows}


def progress(level: str, content_root: Path | None = None, work_root: Path | None = None) -> dict | None:
    s = load(level, work_root)
    if not s:
        return None
    rows = []
    for p in content.level_files(level, content_root):
        topic = content.load_topic(p)
        status = [e.status for e in topic.entries if e.review_sample]
        rows.append({"topic": topic.topic_code, "total": len(status), **{st: status.count(st) for st in ("draft", "approved", "rejected")}})
    return {"level": s["level"], "seed": s["seed"], "per_topic": s["per_topic"], "created_at": s["created_at"], "topics": rows}


def approve_by_sample(level: str, topics: list[str] | None = None, *, apply: bool = True, now: datetime | None = None,
                      content_root: Path | None = None) -> list[dict]:
    """Mỗi chủ đề một dòng: {topic, sample, approved, rejected, draft, reject_rate, result, approved_now, held_flagged}.
    `result`: "approved" (đã duyệt phần còn lại), "need_full_review" (vượt ngưỡng từ chối), "sample_unfinished",
    "no_sample", "missing". `topics=None` = mọi chủ đề của cấp. `apply=False` chỉ tính, không ghi file."""
    level = level.upper()
    now = now or datetime.now(UTC)
    paths = {p.stem: p for p in content.level_files(level, content_root)}
    rows = []
    for code in topics or sorted(paths):
        row = {"topic": code, "sample": 0, "approved": 0, "rejected": 0, "draft": 0, "reject_rate": 0.0, "approved_now": 0,
               "held_flagged": 0}
        if code not in paths:
            rows.append({**row, "result": "missing"})
            continue
        topic = content.load_topic(paths[code])
        smp = [e for e in topic.entries if e.review_sample]
        row.update(sample=len(smp), **{st: sum(e.status == st for e in smp) for st in ("approved", "rejected", "draft")})
        if not smp:
            rows.append({**row, "result": "no_sample"})
            continue
        if row["draft"]:
            rows.append({**row, "result": "sample_unfinished"})
            continue
        row["reject_rate"] = round(row["rejected"] / len(smp), 4)
        if row["reject_rate"] > config.SAMPLE_MAX_REJECT_RATE:
            rows.append({**row, "result": "need_full_review"})
            continue
        for e in topic.entries:
            if e.review_sample or e.status != "draft":
                continue
            if problem_flags(e):
                row["held_flagged"] += 1
                continue
            e.status, e.review_method, e.reviewed_at, e.reject_reason = "approved", "sample", now, ""
            row["approved_now"] += 1
        if apply and row["approved_now"]:
            content.save_topic(topic, content_root)
        rows.append({**row, "result": "approved"})
    return rows
