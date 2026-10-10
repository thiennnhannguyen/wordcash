"""
Công cụ duyệt /dev/content lưu được vào FILE NỘI DUNG THẬT (backend/content/a1/*.json):
- gửi đúng request mà nút "Duyệt" / "Từ chối" của trang gửi (PATCH …/entries/{key} với review_note, status, reject_reason);
- đọc lại file trên đĩa: status, reviewed_at, review_note, reject_reason, review_method = "manual" đúng như đã bấm; các mục
  khác trong file không đổi (trừ cờ do bước 04 tính lại);
- HOÀN TÁC: mọi file content/a1/*.json được ghi lại đúng từng byte như trước test (kể cả khi test lỗi), có kiểm tra.
"""

import json
from datetime import UTC, datetime

import httpx
import pytest
from fastapi import FastAPI

from app.api.deps import get_current_user
from app.core.errors import register_exception_handlers
from app.services import dev_content_service as svc
from data_pipeline import config as pconfig

API = "/api/v1/dev/content/A1"
TOPIC = "greetings"
VOLATILE = {"flags", "flag_details"}  # bước 04 tính lại sau mỗi lần lưu


@pytest.fixture
async def real_files(tmp_path, monkeypatch):
    files = sorted((pconfig.CONTENT / "a1").glob("*.json"))
    assert files, "thiếu backend/content/a1/*.json"
    snapshot = {p: p.read_bytes() for p in files}
    monkeypatch.setattr(svc, "CONTENT_ROOT", pconfig.CONTENT)
    monkeypatch.setattr(svc, "PROCESSED", pconfig.PROCESSED)
    monkeypatch.setattr(svc, "WORK_ROOT", tmp_path / "work")
    monkeypatch.setattr(svc, "ai_provider", lambda: "agent")
    from app.api.v1.routers import dev_content

    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(dev_content.router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: object()
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            yield c, pconfig.CONTENT / "a1" / f"{TOPIC}.json"
    finally:
        for p, data in snapshot.items():
            p.write_bytes(data)
        for p in (pconfig.CONTENT / "a1").glob("*"):
            assert p in snapshot, f"test để lại file lạ: {p.name}"
        assert all(p.read_bytes() == data for p, data in snapshot.items())  # hoàn tác đúng từng byte


def on_disk(path):
    return {e["content_key"]: e for e in json.loads(path.read_text(encoding="utf-8"))["entries"]}


def stable(entry):
    return {k: v for k, v in entry.items() if k not in VOLATILE}


async def test_approve_and_reject_buttons_write_content_file(real_files):
    c, path = real_files
    before = on_disk(path)
    drafts = [k for k, e in before.items() if e["status"] == "draft"]
    approve_key, reject_key = drafts[0], drafts[1]
    started = datetime.now(UTC)

    # Nút "Duyệt" (EntryDetail → ContentReview.approve): ghi chú + status
    res = await c.patch(f"{API}/{TOPIC}/entries/{approve_key}", json={"review_note": "ổn, giữ nguyên", "status": "approved"})
    assert res.status_code == 200, res.text
    # Nút "Từ chối" → hộp lý do → confirmReject
    res = await c.patch(f"{API}/{TOPIC}/entries/{reject_key}",
                        json={"review_note": "câu ví dụ gượng", "status": "rejected", "reject_reason": "nghĩa chưa đúng chủ đề"})
    assert res.status_code == 200, res.text

    after = on_disk(path)
    ok, bad = after[approve_key], after[reject_key]
    assert (ok["status"], ok["review_note"], ok["review_method"], ok["reject_reason"]) == ("approved", "ổn, giữ nguyên", "manual", "")
    assert (bad["status"], bad["review_note"], bad["review_method"], bad["reject_reason"]) == (
        "rejected", "câu ví dụ gượng", "manual", "nghĩa chưa đúng chủ đề")
    for e in (ok, bad):
        assert datetime.fromisoformat(e["reviewed_at"]) >= started.replace(microsecond=0)
    # Ngoài trường duyệt, nội dung hai mục không đổi; các mục khác giữ nguyên
    review_fields = {"status", "reviewed_at", "review_note", "review_method", "reject_reason"}
    for key in (approve_key, reject_key):
        assert {k: v for k, v in stable(after[key]).items() if k not in review_fields} == \
               {k: v for k, v in stable(before[key]).items() if k not in review_fields}
    assert {k: stable(e) for k, e in after.items() if k not in (approve_key, reject_key)} == \
           {k: stable(e) for k, e in before.items() if k not in (approve_key, reject_key)}

    # Về lại draft: review_method xóa
    res = await c.patch(f"{API}/{TOPIC}/entries/{approve_key}", json={"status": "draft"})
    assert on_disk(path)[approve_key]["review_method"] == "" and res.json()["entry"]["status"] == "draft"
