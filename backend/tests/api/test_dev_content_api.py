"""
Công cụ duyệt nội dung (router dev_content, services/dev_content_service.py):
- BẢO MẬT: router chỉ được gắn khi ENV=development — không tồn tại ở production, testing, e2e (dựng lại app với từng ENV),
  và app test hiện tại trả 404.
- Chức năng (app thử chỉ gồm router này, thư mục nội dung tạm): danh sách chủ đề + tiến độ, sửa trường (kiểm lại cờ), duyệt
  ghi reviewed_at, từ chối bắt buộc lý do, câu hỏi mẫu mức 1–4, nhờ AI viết lại (AI giả; thiếu key → CONTENT_AI_UNAVAILABLE),
  sửa tên bài; file ghi nguyên tử, định dạng ổn định.
"""

import importlib
import json

import httpx
import pytest
from fastapi import FastAPI

from app.api.deps import get_current_user
from app.core.errors import register_exception_handlers
from app.services import dev_content_service as svc
from data_pipeline.lib import content
from data_pipeline.lib.ai import FakeAIClient
from data_pipeline.lib.schemas import ContentEntry, ContentUnit, TopicFile

API = "/api/v1"


def test_dev_content_router_only_in_development():
    from fastapi import FastAPI as Probe

    from app.core.config import settings
    import app.api.v1 as v1

    original = settings.ENV
    try:
        for env, expected in (("production", False), ("testing", False), ("e2e", False), ("development", True)):
            settings.ENV = env
            module = importlib.reload(v1)
            probe = Probe()
            probe.include_router(module.api_router)
            found = any(p.startswith("/api/v1/dev/content") for p in probe.openapi()["paths"])
            assert found is expected, env
    finally:
        settings.ENV = original
        importlib.reload(v1)


async def test_dev_content_absent_in_testing_app(client, auth_user):
    for method, path in (("GET", "/dev/content"), ("GET", "/dev/content/A1/food"), ("PATCH", "/dev/content/A1/food/entries/a1.food.rice.noun")):
        res = await client.request(method, f"{API}{path}", headers=auth_user["headers"], json={} if method == "PATCH" else None)
        assert res.status_code == 404, path


def make_entry(head, meaning, example, **kw):
    return ContentEntry(content_key=f"a1.food.{head}.noun", headword=head, pos="noun", ipa="/x/", meaning_vi=meaning,
                        definition_en="a kind of food", example_en=example, example_vi="câu", collocations=[f"a {head}"],
                        image_keyword=head, **kw)


@pytest.fixture
async def dev_api(tmp_path, monkeypatch):
    root = tmp_path / "content"
    monkeypatch.setattr(svc, "CONTENT_ROOT", root)
    monkeypatch.setattr(svc, "PROCESSED", tmp_path)  # không có candidates.json: bỏ qua hard_words
    topic = TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn", landmark_key="a1_pho_co", entries=[
        make_entry("rice", "cơm", "We eat rice for lunch every day.", rank_in_topic=1),
        make_entry("egg", "quả trứng", "My mom buys six eggs at the market.", rank_in_topic=2),
        make_entry("noodle", "mì", "I eat noodle soup in the morning.", rank_in_topic=3),
    ], units=[ContentUnit(content_key="a1.food.u1", position=1, title="Bữa sáng", entries=["a1.food.rice.noun"])])
    content.save_topic(topic, root)
    from app.api.v1.routers import dev_content

    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(dev_content.router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: object()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c, root


async def test_list_get_edit_and_revalidate(dev_api):
    c, root = dev_api
    levels = (await c.get(f"{API}/dev/content")).json()
    food = next(t for t in levels[0]["topics"] if t["code"] == "food")
    assert (food["total"], food["approved"], food["draft"]) == (3, 0, 3)
    assert next(t for t in levels[0]["topics"] if t["code"] == "home")["total"] == 0  # chưa có file
    topic = (await c.get(f"{API}/dev/content/A1/food")).json()
    assert [e["headword"] for e in topic["entries"]] == ["rice", "egg", "noodle"] and "hard_words" in topic["flag_help"]
    assert (await c.get(f"{API}/dev/content/A1/nope")).json()["error"]["code"] == "CONTENT_NOT_FOUND"

    res = await c.patch(f"{API}/dev/content/A1/food/entries/a1.food.egg.noun", json={"example_en": "We eat rice at home today."})
    entry = res.json()["entry"]
    assert res.status_code == 200 and "example_missing_headword" in entry["flags"]  # kiểm lại cờ ngay sau khi sửa
    assert entry["flag_details"]["example_missing_headword"] == "We eat rice at home today."
    res = await c.patch(f"{API}/dev/content/A1/food/entries/a1.food.egg.noun", json={"example_en": "We eat eggs at home today."})
    assert "example_missing_headword" not in res.json()["entry"]["flags"]
    saved = json.loads(content.topic_path("A1", "food", root).read_text(encoding="utf-8"))
    assert saved["entries"][1]["example_en"] == "We eat eggs at home today."
    assert not [p for p in root.rglob("*") if p.name.endswith(".tmp")]  # ghi nguyên tử, không để file tạm


async def test_approve_reject_and_reason_required(dev_api):
    c, root = dev_api
    res = await c.patch(f"{API}/dev/content/A1/food/entries/a1.food.rice.noun", json={"status": "approved", "review_note": "ổn"})
    body = res.json()
    assert body["entry"]["status"] == "approved" and body["entry"]["reviewed_at"] and body["entry"]["review_note"] == "ổn"
    assert body["summary"]["approved"] == 1
    res = await c.patch(f"{API}/dev/content/A1/food/entries/a1.food.noodle.noun", json={"status": "rejected"})
    assert res.status_code == 422 and res.json()["error"]["code"] == "CONTENT_REJECT_REASON_REQUIRED"
    res = await c.patch(f"{API}/dev/content/A1/food/entries/a1.food.noodle.noun", json={"status": "rejected", "reject_reason": "trùng"})
    assert res.json()["entry"]["status"] == "rejected" and res.json()["entry"]["reject_reason"] == "trùng"
    res = await c.patch(f"{API}/dev/content/A1/food/entries/a1.food.rice.noun", json={"headword": "Rice "})
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_sample_questions_all_levels(dev_api):
    c, _ = dev_api
    qs = (await c.get(f"{API}/dev/content/A1/food/entries/a1.food.rice.noun/questions")).json()
    assert [q["level"] for q in qs] == [1, 2, 3, 4]
    assert qs[0]["answer"] == "cơm" and "cơm" in qs[0]["options"] and len(qs[0]["options"]) == 3
    assert qs[1]["answer"] == "rice" and qs[3]["sentence"].startswith("We eat ______")


async def test_rewrite_field_with_ai(dev_api, monkeypatch):
    c, _ = dev_api
    fake = FakeAIClient(lambda s, u: '{"value": "We cook rice for dinner."}')
    monkeypatch.setattr(svc, "ai_client", lambda: fake)
    res = await c.post(f"{API}/dev/content/A1/food/entries/a1.food.rice.noun/rewrite", json={"field": "example_en", "note": "ngắn hơn"})
    assert res.json() == {"field": "example_en", "old": "We eat rice for lunch every day.", "new": "We cook rice for dinner."}
    system, user = fake.calls[0]
    assert "Rewrite only the field \"example_en\"" in system and "ngắn hơn" in user and "ONE card = ONE main meaning" in system
    topic = (await c.get(f"{API}/dev/content/A1/food")).json()
    assert topic["entries"][0]["example_en"] == "We eat rice for lunch every day."  # không tự lưu
    res = await c.post(f"{API}/dev/content/A1/food/entries/a1.food.rice.noun/rewrite", json={"field": "status"})
    assert res.json()["error"]["code"] == "CONTENT_FIELD_NOT_EDITABLE"

    def no_key():
        raise RuntimeError("Thiếu ANTHROPIC_API_KEY (đặt trong backend/.env hoặc biến môi trường).")

    monkeypatch.setattr(svc, "ai_client", no_key)
    res = await c.post(f"{API}/dev/content/A1/food/entries/a1.food.rice.noun/rewrite", json={"field": "meaning_vi"})
    assert res.status_code == 503 and res.json()["error"]["code"] == "CONTENT_AI_UNAVAILABLE"


async def test_unit_title_review(dev_api):
    c, _ = dev_api
    res = await c.patch(f"{API}/dev/content/A1/food/units/a1.food.u1", json={"title": "Ăn sáng", "title_status": "approved"})
    assert res.json()["unit"]["title"] == "Ăn sáng" and res.json()["summary"]["units_approved"] == 1
