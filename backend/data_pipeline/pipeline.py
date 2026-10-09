"""
Lệnh tổng của quy trình kho từ (chạy trong backend/):

- `python -m data_pipeline.pipeline status [--level A1]`: với mỗi bước có AI — số gói đã emit / đã có output / đã ingest, gói
  sai schema, việc phải làm tiếp; tiến độ nội dung theo chủ đề (đã chọn / đã soạn / đã duyệt); hàng đợi viết lại. Bị ngắt
  giữa chừng thì lệnh này cho biết chính xác làm tiếp từ đâu.
- `python -m data_pipeline.pipeline rewrite --emit | --ingest`: xử lý hàng đợi "viết lại một trường" (work/rewrite_queue.json)
  do người duyệt gửi từ /dev/content. AI_PROVIDER=anthropic: `rewrite` không cần cờ, gọi API cho từng yêu cầu.
"""

import argparse
import json
import sys

from data_pipeline import config
from data_pipeline.lib import agent, cli, content, rewrite
from data_pipeline.lib.jsonio import read_json


def content_progress(level: str) -> list[dict]:
    selection = read_json(config.PROCESSED / f"{level.lower()}_selection.json", {}) or {}
    rows = []
    for t in config.topics(level):
        selected = len(selection.get("topics", {}).get(t.code, []))
        path = content.topic_path(level, t.code)
        entries = content.load_topic(path).entries if path.exists() else []
        rows.append({"topic": t.code, "selected": selected, "drafted": len(entries),
                     "approved": sum(e.status == "approved" for e in entries), "rejected": sum(e.status == "rejected" for e in entries),
                     "done": bool(selected) and len(entries) >= selected})
    return rows


def print_status(level: str) -> None:
    print(f"== Gói việc (AI_PROVIDER={config.ai_provider()}) ==")
    for s in agent.status():
        print(f"- {s['step']}: emit {s['emitted']} · có output {s['with_output']} · đã ingest {s['ingested']}"
              f"{' · SAI SCHEMA ' + str(s['rejected']) if s['rejected'] else ''}"
              f"{' · lỗi thời (bỏ qua) ' + str(len(s['stale'])) if s['stale'] else ''}")
        if s["args"]:
            print(f"    phạm vi lần gần nhất: {json.dumps(s['args'], ensure_ascii=False)}")
        print(f"    tiếp theo: {s['next']}")
    report = read_json(config.PROCESSED / "report_02.json", {}) or {}
    if report.get("pending"):
        print(f"\nBước 02 đang chờ gói ở giai đoạn: {report['pending_stage']} (chưa ghi {level.lower()}_selection.json)")
    rows = content_progress(level)
    done = sum(r["done"] for r in rows)
    print(f"\n== Nội dung {level} — {done}/{len(rows)} chủ đề đã soạn đủ ==")
    for r in rows:
        print(f"- {r['topic']:<13} chọn {r['selected']:>3} · soạn {r['drafted']:>3} · duyệt {r['approved']:>3} · từ chối {r['rejected']:>3}"
              f"{'  ✓' if r['done'] else ''}")
    queue = rewrite.load_queue()
    by_status: dict[str, int] = {}
    for i in queue:
        by_status[i["status"]] = by_status.get(i["status"], 0) + 1
    print(f"\n== Hàng đợi viết lại: {json.dumps(by_status, ensure_ascii=False) if queue else 'trống'} ==")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    st = sub.add_parser("status", help="tình trạng gói việc và tiến độ nội dung")
    st.add_argument("--level", default="A1")
    rw = sub.add_parser("rewrite", help="xử lý hàng đợi viết lại")
    cli.add_ai_args(rw)
    args = parser.parse_args()
    if args.command == "status":
        print_status(args.level.upper())
        return
    queued = sum(i["status"] == "queued" for i in rewrite.load_queue())
    est = {"items": queued, "requests": queued, "input_tokens": queued * 2500, "output_tokens": queued * 80,
           "cost_usd": round(queued * (2500 * config.PRICE_INPUT_PER_MTOK + 80 * config.PRICE_OUTPUT_PER_MTOK) / 1e6, 2)}
    client = cli.make_client("rewrite", args, lambda: est, "viết lại")
    result = rewrite.process(client)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    cli.agent_footer(client)
    sys.exit(0)


if __name__ == "__main__":
    main()
