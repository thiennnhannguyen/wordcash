"""
Giả lập "agent soạn output" cho test chế độ agent: đọc các gói work/<bước>/batch_<số>.input.json còn chờ và ghi
batch_<số>.output.json bằng AI giả (fake_ai.handler) — đúng vai agent đang code trong phiên làm việc thật.
`drive` chạy một bước như người dùng: --emit, soạn output, --ingest (lặp tới khi hết gói chờ, vì ingest có thể sinh gói của
giai đoạn sau).
"""

import json
from pathlib import Path
from typing import Callable

from data_pipeline.lib import agent
from data_pipeline.lib.agent import AgentClient, WorkDir
from tests.pipeline import fake_ai


def answer_waiting(step: str, root: Path, handler: Callable[[str, str], str] = fake_ai.handler) -> list[int]:
    work = WorkDir(step, root)
    answered = []
    for n in agent.step_status(step, root)["waiting_output"]:
        packet = json.loads(work.input_path(n).read_text(encoding="utf-8"))
        work.output_path(n).write_text(handler(packet["system_prompt"], packet["user_message"]), encoding="utf-8")
        answered.append(n)
    return answered


def drive(step: str, run: Callable[[AgentClient], object], root: Path, rounds: int = 6):
    """emit → soạn → ingest (lặp). Trả kết quả của lần ingest cuối."""
    result = run(AgentClient(step, root=root))
    for _ in range(rounds):
        if not answer_waiting(step, root) and not agent.step_status(step, root)["to_ingest"]:
            return result
        result = run(AgentClient(step, replay=True, root=root))
    raise AssertionError(f"{step}: vẫn còn gói chờ sau {rounds} vòng")
