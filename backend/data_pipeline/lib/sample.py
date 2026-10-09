"""
Đợt chọn mẫu duyệt: chọn ngẫu nhiên (hạt giống cố định, ghi lại được) N mục mỗi chủ đề để người duyệt xem kỹ trước,
từ đó đánh giá chất lượng cả lô (vd. tỉ lệ phải sửa / từ chối) trước khi duyệt hết.

- Chỉ chọn trong mục chưa từ chối của cấp. Mặc định DỪNG nếu còn mục draft chưa có câu điền từ Mức 4 (cloze_en + 3
  cloze_distractors) — phải chạy bước 03b trước để các mục mẫu có đủ trường mới (`allow_missing_cloze` bỏ qua kiểm tra).
- Ghi work/review_sample_<cấp>.json: {level, seed, per_topic, created_at, keys: {chủ đề: [content_key…]}}. Đã có mẫu thì
  không chọn lại trừ khi `force` (tránh vô tình đổi mẫu giữa chừng).
- `progress`: số mục mẫu theo trạng thái (draft / approved / rejected) và số mục mẫu được người duyệt sửa (reviewed_at ≠ None
  nhưng nội dung khác bản nháp không đo được ở đây — chỉ đếm trạng thái). Trang /dev/content lọc "Mẫu duyệt" theo danh sách này.
"""

import random
from datetime import UTC, datetime
from pathlib import Path

from data_pipeline import config
from data_pipeline.lib import content
from data_pipeline.lib.jsonio import read_json, write_json


class SampleError(RuntimeError):
    pass


def sample_path(level: str, root: Path | None = None) -> Path:
    return Path(root or config.WORK) / f"review_sample_{level.lower()}.json"


def load(level: str, root: Path | None = None) -> dict | None:
    return read_json(sample_path(level, root))


def keys_for(level: str, topic_code: str, root: Path | None = None) -> list[str]:
    s = load(level, root)
    return list((s or {}).get("keys", {}).get(topic_code, []))


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
    for p in content.level_files(level, content_root):
        topic = content.load_topic(p)
        pool = sorted(e.content_key for e in topic.entries if e.status != "rejected")
        keys[topic.topic_code] = sorted(rng.sample(pool, min(per_topic, len(pool))))
    data = {"level": level, "seed": seed, "per_topic": per_topic, "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "keys": keys}
    write_json(path, data)
    return data


def progress(level: str, content_root: Path | None = None, work_root: Path | None = None) -> dict | None:
    s = load(level, work_root)
    if not s:
        return None
    rows = []
    for code, keys in s["keys"].items():
        path = content.topic_path(level, code, content_root)
        by = content.by_key(content.load_topic(path)) if path.exists() else {}
        status = [by[k].status if k in by else "missing" for k in keys]
        rows.append({"topic": code, "total": len(keys), **{st: status.count(st) for st in ("draft", "approved", "rejected", "missing")}})
    return {"level": s["level"], "seed": s["seed"], "per_topic": s["per_topic"], "created_at": s["created_at"], "topics": rows}
