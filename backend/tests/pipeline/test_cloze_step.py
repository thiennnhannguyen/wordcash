"""
Bước 03b (soạn nháp câu Mức 4 — data_pipeline/lib/step_cloze.py):
- chỉ mục draft chưa có câu (approved / rejected giữ nguyên; --redo soạn lại mục draft đã có câu); ghi cloze_en + 3 đáp án nhiễu,
  KHÔNG đụng trường khác, mục vẫn draft; lý do tự kiểm `why_wrong` không lưu vào nội dung;
- prompt có kho từ của cấp theo từ loại + quy tắc cloze của hướng dẫn soạn; output sai (không đủ 3 đáp án nhiễu) bị từ chối;
- chế độ agent: emit gói work/03b_cloze, ingest output → file nội dung; status đếm mục có câu.
"""

import json

from data_pipeline.lib import agent, content, step_cloze
from data_pipeline.lib.agent import AgentClient, WorkDir
from data_pipeline.lib.ai import FakeAIClient
from data_pipeline.lib.schemas import ContentEntry, TopicFile

CLOZE = {
    "rice": ("In Vietnam, people cook white rice and eat it with fish.", ["milk", "juice", "tea"]),
    "egg": ("A hen sits on her egg to keep it warm until the baby comes out.", ["spoon", "table", "door"]),
}


def entry(head, **kw):
    base = dict(content_key=f"a1.food.{head}.noun", headword=head, pos="noun", meaning_vi=head, example_en=f"I like {head}.")
    return ContentEntry(**{**base, **kw})


def setup(tmp_path):
    root = tmp_path / "content"
    topic = TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn", entries=[
        entry("rice", rank_in_topic=1), entry("egg", rank_in_topic=2),
        entry("tea", rank_in_topic=3, status="approved"),  # đã duyệt: không đụng
        entry("soup", rank_in_topic=4, status="rejected"),
        entry("milk", rank_in_topic=5, cloze_en="Babies drink warm milk from a bottle every night.", cloze_distractors=["a", "b", "c"]),
    ])
    content.save_topic(topic, root)
    return {"content_root": root, "processed": tmp_path, "cache_root": tmp_path / "cache"}


def answer(system, user):
    items = [json.loads(line) for line in user.splitlines()[1:] if line.strip().startswith("{")]
    return json.dumps([{"headword": i["headword"], "pos": i["pos"], "cloze_en": CLOZE[i["headword"]][0],
                        "cloze_distractors": CLOZE[i["headword"]][1], "why_wrong": ["x", "y", "z"]} for i in items])


def saved(paths):
    return content.by_key(content.load_topic(content.topic_path("A1", "food", paths["content_root"])))


def test_only_drafts_without_cloze_and_other_fields_untouched(tmp_path):
    paths = setup(tmp_path)
    fake = FakeAIClient(answer)
    report = step_cloze.run("A1", fake, **paths)
    assert report["written"] == {"food": 2} and report["failed"] == 0
    by = saved(paths)
    rice = by["a1.food.rice.noun"]
    assert rice.cloze_en == CLOZE["rice"][0] and rice.cloze_distractors == ["milk", "juice", "tea"]
    assert rice.status == "draft" and rice.example_en == "I like rice." and "why_wrong" not in rice.model_dump()
    assert by["a1.food.tea.noun"].cloze_en == "" and by["a1.food.soup.noun"].cloze_en == ""  # approved / rejected giữ nguyên
    assert by["a1.food.milk.noun"].cloze_distractors == ["a", "b", "c"]  # đã có câu: không soạn lại
    system, user = fake.calls[0]
    assert "- noun: egg, milk, rice, tea" in system  # kho từ theo từ loại (bỏ mục rejected)
    assert "cloze_distractors: exactly 3 words" in system and "SEPARATE from example_en" in system
    assert '"headword": "rice"' in user and '"headword": "tea"' not in user
    assert step_cloze.progress("A1", paths["content_root"]) == [{"topic": "food", "entries": 4, "with_cloze": 3}]
    # chạy lại: mọi mục draft đã có câu → không gọi AI; --redo soạn lại cả mục draft đã có câu
    idle = FakeAIClient(lambda s, u: "[]")
    assert step_cloze.run("A1", idle, **paths)["written"] == {} and idle.calls == []
    CLOZE["milk"] = ("Babies drink warm milk from a bottle before they sleep.", ["rice", "egg", "tea"])
    redo = step_cloze.run("A1", FakeAIClient(answer), redo=True, **paths)
    assert redo["written"] == {"food": 3} and redo["from_cache"] == 2  # rice, egg lấy từ cache
    assert saved(paths)["a1.food.milk.noun"].cloze_distractors == ["rice", "egg", "tea"]


def test_bad_output_is_rejected(tmp_path):
    paths = setup(tmp_path)
    bad = FakeAIClient(lambda s, u: json.dumps([{"headword": "rice", "pos": "noun", "cloze_en": "x rice y",
                                                  "cloze_distractors": ["milk"], "why_wrong": ["x"]}]))
    report = step_cloze.run("A1", bad, **paths)
    assert report["written"] == {} and report["failed"] == 2
    assert saved(paths)["a1.food.rice.noun"].cloze_en == ""


def test_agent_emit_then_ingest(tmp_path):
    paths = setup(tmp_path)
    work = tmp_path / "work"
    report = step_cloze.run("A1", AgentClient("03b_cloze", root=work), **paths)
    assert report["pending"] == 2 and report["written"] == {}
    packet = json.loads(WorkDir("03b_cloze", work).input_path(1).read_text())
    assert [i["headword"] for i in packet["items"]] == ["rice", "egg"]
    assert "why_wrong" in json.dumps(packet["output_schema"]) and "cloze_en" in packet["style_guide_rules"]
    WorkDir("03b_cloze", work).output_path(1).write_text(answer(packet["system_prompt"], packet["user_message"]), encoding="utf-8")
    report = step_cloze.run("A1", AgentClient("03b_cloze", replay=True, root=work), **paths)
    assert report["written"] == {"food": 2}
    assert saved(paths)["a1.food.egg.noun"].cloze_distractors == ["spoon", "table", "door"]
    assert agent.step_status("03b_cloze", work)["next"].startswith("Xong")
