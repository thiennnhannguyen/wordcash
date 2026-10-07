"""
Chế độ agent (AI_PROVIDER=agent, mặc định): thay lệnh gọi API trả phí bằng "gói việc" (work packet) cho agent đang code soạn.

Đường đi giống hệt provider API: các bước vẫn gọi `ai.call_json(client, system, user, Schema)`; chỉ khác client.
- `AgentClient.complete` với request chưa có output: ghi work/<bước>/batch_<số>.input.json (mục cần xử lý, JSON schema đầu ra
  lấy từ đúng model Pydantic, nguyên khối quy tắc trích từ docs/content-style-guide.md, prompt hệ thống + tin nhắn như gửi API)
  rồi ném `AgentPending` (bước coi mục đó là "đang chờ", không ghi vào failed).
- Agent đọc gói input, ghi batch_<số>.output.json (CHỈ JSON đúng schema).
- `--ingest` (replay=True): request trùng gói (cùng mã băm prompt) → đọc output, kiểm bằng model Pydantic; sai → ghi
  work/<bước>/rejected.json, gói ở trạng thái `rejected` (sửa output rồi ingest lại); đúng → trả về như câu trả lời API, bước
  ghi cache và nội dung (status = draft) như bình thường. Request mới phát sinh (giai đoạn sau, mục còn thiếu) → gói mới.
- Gói được đánh số theo thứ tự tạo, nhận diện bằng mã băm (prompt hệ thống + tin nhắn) nên emit lại không tạo trùng.
- Mỗi lần chạy một bước tăng `run`; gói chưa có output mà lần chạy gần nhất không yêu cầu lại (prompt / phạm vi đã đổi) là gói
  lỗi thời (`stale`): không tính vào việc phải làm.
- work/ nằm trong .gitignore; chỉ content/**/*.json được commit. `status()` cho biết từng bước đang ở đâu (lệnh
  `python -m data_pipeline.pipeline status`).
"""

import hashlib
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from pydantic import TypeAdapter, ValidationError

from data_pipeline import config
from data_pipeline.lib import prompts
from data_pipeline.lib.ai import AgentPending, AIResponse, extract_json
from data_pipeline.lib.jsonio import read_json, write_json

# Bước có gọi AI → lệnh ingest (gợi ý trong status)
STEPS = {
    "02_select": "python -m data_pipeline.02_select_and_tag --level {level} --ingest",
    "03_enrich": "python -m data_pipeline.03_enrich_entries --level {level} --ingest",
    "06_units": "python -m data_pipeline.06_build_units --level {level} --ingest",
    "rewrite": "python -m data_pipeline.pipeline rewrite --ingest",
}
INSTRUCTIONS = (
    "Đọc system_prompt và user_message như một request API. Soạn câu trả lời và ghi vào file {output} (cùng thư mục): CHỈ "
    "JSON đúng output_schema, không kèm chữ nào khác. Tuân thủ style_guide_rules. Không ghi IPA trừ khi mục ghi \"ipa\": "
    "\"missing\" (IPA lấy từ CMUdict). Xong thì chạy lệnh ingest: {ingest}"
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def packet_id(system: str, user: str) -> str:
    return hashlib.sha256(f"{system}\n\x00\n{user}".encode()).hexdigest()[:16]


def parse_items(user: str) -> list:
    """Các mục trong tin nhắn: dòng JSON → đối tượng, dòng khác (vd. "Lesson 1: …") giữ nguyên chuỗi; bỏ dòng dẫn đầu."""
    items = []
    for line in user.splitlines()[1:] if "\n" in user else [user]:
        line = line.strip()
        if not line:
            continue
        try:
            items.append(json.loads(line))
        except ValueError:
            items.append(line)
    return items


class WorkDir:
    def __init__(self, step: str, root: Path | None = None):
        if step not in STEPS:
            raise ValueError(f"Bước không có gói việc: {step}")
        self.step = step
        self.dir = Path(root or config.WORK) / step

    @property
    def manifest_path(self) -> Path:
        return self.dir / "manifest.json"

    @property
    def rejected_path(self) -> Path:
        return self.dir / "rejected.json"

    def input_path(self, n: int) -> Path:
        return self.dir / f"batch_{n:04d}.input.json"

    def output_path(self, n: int) -> Path:
        return self.dir / f"batch_{n:04d}.output.json"

    def manifest(self) -> dict:
        return read_json(self.manifest_path, {"step": self.step, "batches": [], "args": {}})

    def save_manifest(self, m: dict) -> None:
        write_json(self.manifest_path, m)

    def rejected(self) -> list[dict]:
        return read_json(self.rejected_path, [])

    def set_rejected(self, n: int, error: str | None) -> None:
        records = [r for r in self.rejected() if r["batch"] != n]
        if error is not None:
            records.append({"batch": n, "file": self.output_path(n).name, "error": error[:3000], "at": now_iso()})
        if records or self.rejected_path.exists():
            write_json(self.rejected_path, sorted(records, key=lambda r: r["batch"]))


@dataclass
class AgentClient:
    """Client AI của chế độ agent. `replay=False` (--emit): chỉ tạo gói; `replay=True` (--ingest): dùng output đã có."""

    step: str
    replay: bool = False
    root: Path | None = None
    emitted: list[int] = field(default_factory=list)  # gói mới tạo trong lần chạy này
    waiting: list[int] = field(default_factory=list)  # gói còn chờ output (kể cả gói cũ)
    ingested: list[int] = field(default_factory=list)
    rejected: list[int] = field(default_factory=list)

    def __post_init__(self):
        self.work = WorkDir(self.step, self.root)
        m = self.work.manifest()
        m["run"] = self.run = m.get("run", 0) + 1
        self.work.save_manifest(m)

    def remember_args(self, args: dict) -> None:
        m = self.work.manifest()
        m["args"] = args
        self.work.save_manifest(m)

    def last_args(self) -> dict:
        return self.work.manifest().get("args", {})

    def _packet(self, m: dict, system: str, user: str, schema: object) -> dict:
        pid = packet_id(system, user)
        entry = next((b for b in m["batches"] if b["id"] == pid), None)
        if entry is not None:
            return entry
        n = max((b["n"] for b in m["batches"]), default=0) + 1
        items = parse_items(user)
        output_schema = TypeAdapter(schema).json_schema() if schema is not None else None
        ingest = STEPS[self.step].format(level=m.get("args", {}).get("level", "A1"))
        write_json(self.work.input_path(n), {
            "step": self.step, "batch": n, "id": pid, "created_at": now_iso(),
            "instructions": INSTRUCTIONS.format(output=self.work.output_path(n).name, ingest=ingest),
            "items": items, "output_schema": output_schema, "style_guide_rules": prompts.style_guide_rules(),
            "system_prompt": system, "user_message": user,
        })
        entry = {"n": n, "id": pid, "status": "emitted", "items": len(items), "created_at": now_iso()}
        m["batches"].append(entry)
        self.emitted.append(n)
        return entry

    def complete(self, system: str, user: str, *, max_tokens: int = 4096, schema: object = None) -> AIResponse:
        m = self.work.manifest()
        entry = self._packet(m, system, user, schema)
        entry["last_run"] = self.run
        n = entry["n"]
        out = self.work.output_path(n)
        if self.replay and out.exists():
            text = out.read_text(encoding="utf-8")
            try:
                data = extract_json(text)
                if schema is not None:
                    TypeAdapter(schema).validate_python(data)
            except (ValueError, ValidationError) as e:
                entry["status"] = "rejected"
                self.work.save_manifest(m)
                self.work.set_rejected(n, str(e))
                if n not in self.rejected:
                    self.rejected.append(n)
                raise AgentPending(f"Output gói {n} sai schema — xem {self.work.rejected_path}") from None
            entry["status"], entry["ingested_at"] = "ingested", now_iso()
            self.work.save_manifest(m)
            self.work.set_rejected(n, None)
            if n not in self.ingested:
                self.ingested.append(n)
            return AIResponse(text, 0, 0)
        self.work.save_manifest(m)
        if n not in self.waiting:
            self.waiting.append(n)
        raise AgentPending(f"Chờ output gói {n}: {self.work.input_path(n)}")

    def summary(self) -> dict:
        return {"step": self.step, "emitted_new": self.emitted, "waiting_output": sorted(set(self.waiting) - set(self.ingested)),
                "ingested": self.ingested, "rejected": self.rejected, "work_dir": str(self.work.dir)}


def step_status(step: str, root: Path | None = None) -> dict:
    work = WorkDir(step, root)
    m = work.manifest()
    batches = m["batches"]
    has_output = [b["n"] for b in batches if work.output_path(b["n"]).exists()]
    ingested = [b["n"] for b in batches if b["status"] == "ingested"]
    stale = [b["n"] for b in batches if b["status"] != "ingested" and b.get("last_run", 0) < m.get("run", 0)]
    rejected = [b["n"] for b in batches if b["status"] == "rejected" and b["n"] not in stale]
    waiting = [b["n"] for b in batches if b["n"] not in has_output and b["n"] not in stale]
    to_ingest = [n for n in has_output if n not in ingested and n not in stale]
    ingest_cmd = STEPS[step].format(level=m.get("args", {}).get("level", "A1"))
    if waiting:
        nxt = f"Soạn output cho {', '.join(work.output_path(n).name for n in waiting[:5])}{' …' if len(waiting) > 5 else ''}"
    elif to_ingest:
        nxt = f"Chạy: {ingest_cmd}"
    elif batches:
        nxt = "Xong (mọi gói đã ingest)"
    else:
        nxt = "Chưa có gói nào"
    return {"step": step, "emitted": len(batches), "with_output": len(has_output), "ingested": len(ingested),
            "rejected": rejected, "waiting_output": waiting, "to_ingest": to_ingest, "stale": stale, "args": m.get("args", {}),
            "next": nxt}


def status(root: Path | None = None) -> list[dict]:
    return [step_status(step, root) for step in STEPS]
