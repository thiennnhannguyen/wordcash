"""
Chế độ agent (AI_PROVIDER=agent, mặc định — không gọi API trả phí):
- emit tạo gói batch_<số>.input.json đủ mục, JSON schema đầu ra (từ model Pydantic), khối quy tắc của hướng dẫn soạn; emit lại
  không tạo gói trùng; chưa có output thì mục "đang chờ", không vào failed;
- ingest output mẫu (fixture) → content/<cấp>/*.json status draft, IPA vẫn lấy từ CMUdict (output không ghi đè);
- output sai schema → rejected.json, gói `rejected`, không ghi nội dung; sửa output rồi ingest lại thì nhận;
- bước 02 không ghi selection khi còn gói chờ; gói giai đoạn sau (cụm từ, đề xuất) sinh ra khi ingest;
- status cho biết làm tiếp từ đâu; chọn provider: agent cần --emit/--ingest, anthropic thiếu key báo lỗi rõ, không tự gọi API.
"""

import argparse
import json

import pytest

from data_pipeline import config
from data_pipeline.lib import agent, cli, content, step02, step03
from data_pipeline.lib.agent import AgentClient, WorkDir
from data_pipeline.lib.jsonio import read_json, write_json
from tests.pipeline import fake_ai
from tests.pipeline.agent_driver import answer_waiting, drive
from tests.pipeline.test_enrich import setup

RICE = {"headword": "rice", "pos": "noun", "meaning_vi": "cơm", "definition_en": "small white grains that people cook and eat",
        "example_en": "We eat rice with fish for dinner.", "example_vi": "Chúng tôi ăn cơm với cá vào bữa tối.",
        "collocations": ["cook rice", "a bowl of rice"], "word_family": [], "synonyms": [], "mnemonic_vi": "",
        "image_keyword": "bowl of rice", "ipa_suggestion": "/WRONG/"}
BANH = {**RICE, "headword": "zzqxbanh", "meaning_vi": "bánh", "example_en": "Lan buys a zzqxbanh at the market.",
        "collocations": ["a zzqxbanh"], "image_keyword": "cake", "ipa_suggestion": "/bæŋ/"}


def test_emit_packet_then_ingest_fixture_output(tmp_path):
    paths = setup(tmp_path, {"food": [("rice", "noun"), ("zzqxbanh", "noun")]})
    work = tmp_path / "work"
    emit = AgentClient("03_enrich", root=work)
    report = step03.run("A1", emit, **paths)
    assert report["pending"] == 2 and report["failed"] == 0 and report["written"] == {}
    assert not content.topic_path("A1", "food", paths["content_root"]).exists()
    assert not (tmp_path / "failed_03.json").exists()
    packet = json.loads(WorkDir("03_enrich", work).input_path(1).read_text())
    assert [i["headword"] for i in packet["items"]] == ["rice", "zzqxbanh"] and packet["items"][1]["ipa"] == "missing"
    assert packet["output_schema"]["type"] == "array" and "meaning_vi" in json.dumps(packet["output_schema"])
    assert "ONE card = ONE main meaning" in packet["style_guide_rules"] and "batch_0001.output.json" in packet["instructions"]
    assert packet["system_prompt"].startswith("You are a careful lexicographer")
    # emit lại: cùng gói, không tạo trùng
    step03.run("A1", AgentClient("03_enrich", root=work), **paths)
    assert agent.step_status("03_enrich", work)["emitted"] == 1

    WorkDir("03_enrich", work).output_path(1).write_text(json.dumps([RICE, BANH], ensure_ascii=False), encoding="utf-8")
    st = agent.step_status("03_enrich", work)
    assert st["with_output"] == 1 and st["to_ingest"] == [1] and "--ingest" in st["next"]
    ingest = AgentClient("03_enrich", replay=True, root=work)
    report = step03.run("A1", ingest, **paths)
    assert report["written"] == {"food": 2} and report["pending"] == 0 and ingest.ingested == [1]
    by = {e.headword: e for e in content.load_topic(content.topic_path("A1", "food", paths["content_root"])).entries}
    assert by["rice"].status == "draft" and by["rice"].meaning_vi == "cơm"
    assert by["rice"].ipa == "/raɪs/" and not by["rice"].ipa_unverified  # CMUdict, không lấy "/WRONG/" của output
    assert by["zzqxbanh"].ipa == "/bæŋ/" and by["zzqxbanh"].ipa_unverified
    st = agent.step_status("03_enrich", work)
    assert st["ingested"] == 1 and st["next"].startswith("Xong")


def test_wrong_schema_is_rejected_then_fixed(tmp_path):
    paths = setup(tmp_path, {"food": [("rice", "noun")]})
    work = tmp_path / "work"
    step03.run("A1", AgentClient("03_enrich", root=work), **paths)
    wd = WorkDir("03_enrich", work)
    wd.output_path(1).write_text(json.dumps([{**RICE, "meaning_vi": 5, "extra_field": "x"}]), encoding="utf-8")
    ingest = AgentClient("03_enrich", replay=True, root=work)
    report = step03.run("A1", ingest, **paths)
    assert report["written"] == {} and report["pending"] == 1 and report["failed"] == 0 and ingest.rejected == [1]
    rejected = read_json(wd.rejected_path)
    assert rejected[0]["batch"] == 1 and "meaning_vi" in rejected[0]["error"] and "extra_field" in rejected[0]["error"]
    assert agent.step_status("03_enrich", work)["rejected"] == [1]
    wd.output_path(1).write_text("không phải JSON", encoding="utf-8")
    step03.run("A1", AgentClient("03_enrich", replay=True, root=work), **paths)
    assert "JSON" in read_json(wd.rejected_path)[0]["error"]

    wd.output_path(1).write_text(json.dumps([RICE]), encoding="utf-8")
    report = step03.run("A1", AgentClient("03_enrich", replay=True, root=work), **paths)
    assert report["written"] == {"food": 1} and read_json(wd.rejected_path) == []
    assert agent.step_status("03_enrich", work)["rejected"] == []


def test_missing_items_in_output_become_a_new_packet(tmp_path):
    paths = setup(tmp_path, {"food": [("rice", "noun"), ("zzqxbanh", "noun")]})
    work = tmp_path / "work"
    step03.run("A1", AgentClient("03_enrich", root=work), **paths)
    WorkDir("03_enrich", work).output_path(1).write_text(json.dumps([RICE]), encoding="utf-8")  # thiếu 1 mục
    report = step03.run("A1", AgentClient("03_enrich", replay=True, root=work), **paths)
    assert report["written"] == {"food": 1} and report["pending"] == 1
    st = agent.step_status("03_enrich", work)
    assert st["emitted"] == 2 and st["waiting_output"] == [2]
    packet = json.loads(WorkDir("03_enrich", work).input_path(2).read_text())
    assert [i["headword"] for i in packet["items"]] == ["zzqxbanh"]


def test_topic_scope_per_topic(tmp_path):
    paths = setup(tmp_path, {"food": [(w, "noun") for w in ("rice", "apple", "water")],
                             "home": [(w, "noun") for w in ("house", "room", "bed")], "travel": [("bus", "noun")]})
    jobs = step03.plan("A1", read_json(tmp_path / "a1_selection.json"), limit=None, content_root=paths["content_root"],
                       topics=["food", "home"], per_topic=2)
    assert [(j.topic_code, j.item["headword"]) for j in jobs] == [("food", "rice"), ("food", "apple"), ("home", "house"), ("home", "room")]


def test_step02_waits_for_each_stage(tmp_path, monkeypatch):
    for name, value in {"TARGET_PER_LEVEL": 50, "TOPIC_SIZE_MIN": 4, "TOPIC_SIZE_MAX": 6, "PHRASE_RATIO": 0.2}.items():
        monkeypatch.setattr(config, name, value)
    words = [w for w in fake_ai.TOPIC_OF][:30]
    write_json(tmp_path / "candidates.json", [{"headword": w, "pos": "noun", "cefr": {"cefrj": "A1"}, "rank": {"cefrj": i},
                                              "sources": ["cefrj"], "topic_hints": ["Food and drink"] if w == "rice" else []}
                                             for i, w in enumerate(words)])
    work, cache = tmp_path / "work", tmp_path / "cache"
    report = step02.run("A1", AgentClient("02_select", root=work), processed=tmp_path, cache_root=cache)
    assert report["pending"] and report["pending_stage"] == "classify" and not (tmp_path / "a1_selection.json").exists()
    packet = json.loads(WorkDir("02_select", work).input_path(1).read_text())
    assert {"headword": "rice", "pos": "noun", "hints": ["Food and drink"]} in packet["items"]
    answer_waiting("02_select", work)
    report = step02.run("A1", AgentClient("02_select", replay=True, root=work), processed=tmp_path, cache_root=cache)
    assert report["pending_stage"] == "phrases"  # phân loại xong → gói cụm từ (mỗi chủ đề một gói)
    report = drive("02_select", lambda c: step02.run("A1", c, processed=tmp_path, cache_root=cache), work)
    assert not report.get("pending") and report["classified"] == 30
    assert read_json(tmp_path / "a1_selection.json")["topics"]["food"]


def _args(**kw):
    return argparse.Namespace(**{"emit": False, "ingest": False, "yes": False, **kw})


def test_provider_selection(monkeypatch, capsys):
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.setattr(config, "_read_env_file", lambda path: {})
    assert config.ai_provider() == "agent"
    with pytest.raises(SystemExit) as e:  # agent mà không có --emit / --ingest: hướng dẫn, không làm gì
        cli.make_client("03_enrich", _args(), lambda: pytest.fail("không ước tính chi phí ở chế độ agent"), "03")
    assert e.value.code == 2 and "--emit" in capsys.readouterr().err
    client = cli.make_client("03_enrich", _args(emit=True), lambda: pytest.fail("không ước tính chi phí"), "03")
    assert isinstance(client, AgentClient) and not client.replay
    assert "$" not in capsys.readouterr().out  # không in chi phí ở luồng mặc định

    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-test")
    est = {"items": 1, "requests": 1, "input_tokens": 10, "output_tokens": 10, "cost_usd": 0.01}
    with pytest.raises(SystemExit) as e:
        cli.make_client("03_enrich", _args(yes=True), lambda: est, "03")
    assert "ANTHROPIC_API_KEY" in str(e.value.code) and "agent" in str(e.value.code)
    with pytest.raises(SystemExit):
        cli.make_client("03_enrich", _args(emit=True), lambda: est, "03")  # --emit chỉ cho agent
    monkeypatch.setenv("AI_PROVIDER", "openai")
    with pytest.raises(RuntimeError):
        config.ai_provider()
