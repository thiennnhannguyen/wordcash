"""
Bước 02 (chọn từ và chia chủ đề) với AI giả: lọc đúng cấp và loại từ chức năng, mỗi từ đúng một chủ đề, độ tự tin thấp gắn
từ độ tự tin thấp / không hợp giọng A1 vào dự phòng (không ép vào chủ đề), cache (chạy lại không gọi AI), mục AI bỏ sót được thử lại rồi ghi failed, thêm cụm từ ~10%, đề xuất
thêm từ cho chủ đề thiếu, cân bằng / reserve, thứ tự trong chủ đề. Kèm test lớp gọi AI: thử lại khi JSON sai, không lộ key.
"""

import json

import httpx
import pytest

from data_pipeline import config
from data_pipeline.lib import ai, step02, units
from data_pipeline.lib.jsonio import read_json, write_json
from data_pipeline.lib.schemas import ClassifyItem
from tests.pipeline import fake_ai

WORDS = list(fake_ai.TOPIC_OF)


def candidates(words, level="A1"):
    return [{"headword": w, "pos": "noun", "cefr": {"cefrj": level}, "cefr_min": level, "rank": {"cefrj": i}, "sources": ["cefrj"],
             "variants": []} for i, w in enumerate(words, 1)]


@pytest.fixture
def small_scale(monkeypatch):
    monkeypatch.setattr(config, "TOPIC_SIZE_MIN", 5)
    monkeypatch.setattr(config, "TOPIC_SIZE_MAX", 7)
    monkeypatch.setattr(config, "TARGET_PER_LEVEL", 60)


def test_select_level_filters_level_and_function_words():
    cands = candidates(["apple", "the", "can"]) + candidates(["bus"], "A2")
    chosen, excluded = step02.select_level(cands, "A1", {"the", "can"})
    assert [c["headword"] for c in chosen] == ["apple"]
    assert {e["headword"] for e in excluded} == {"the", "can"} and {e["reason"] for e in excluded} == {"function_word"}
    # Từ loại chức năng bị loại kể cả khi không có trong danh sách; cùng chữ khác từ loại vẫn giữ (above: trạng từ)
    more = [{**candidates([w])[0], "pos": p} for w, p in (("anybody", "pronoun"), ("above", "preposition"), ("above", "adverb"))]
    chosen, excluded = step02.select_level(more, "A1", set())
    assert [(c["headword"], c["pos"]) for c in chosen] == [("above", "adverb")]
    assert [(e["headword"], e["reason"]) for e in excluded] == [("anybody", "function_pos"), ("above", "function_pos")]


def test_limited_run_classifies_once_and_uses_cache(tmp_path):
    write_json(tmp_path / "candidates.json", candidates(WORDS + ["the"]))
    client = fake_ai.client()
    report = step02.run("A1", client, limit=10, processed=tmp_path, cache_root=tmp_path / "cache")
    sel = read_json(tmp_path / "a1_selection.json")
    items = [i for items in sel["topics"].values() for i in items]
    assert report["classified"] == 10 and len(items) == 9 and report["limited_to"] == 10
    assert len({(i["headword"], i["pos"]) for i in items}) == 9  # mỗi từ đúng một chủ đề
    assert all(i["topic_code"] == fake_ai.TOPIC_OF[i["headword"]] for i in items)
    # "happy": AI không chắc chủ đề → dự phòng, không ép vào chủ đề
    assert [(r["headword"], r["reserve_reason"]) for r in sel["reserve"]] == [("happy", "low_topic_confidence")]
    assert report["reserve_reasons"] == {"low_topic_confidence": 1}
    assert all(i["origin"] == "source" for i in items)  # --limit: không thêm cụm từ / đề xuất
    calls = len(client.calls)
    step02.run("A1", client, limit=10, processed=tmp_path, cache_root=tmp_path / "cache")
    assert len(client.calls) == calls  # lần 2 lấy hết từ cache
    assert step02.estimate("A1", limit=10, processed=tmp_path, cache_root=tmp_path / "cache")["items"] == 0


def test_a1_tone_words_go_to_reserve(tmp_path, monkeypatch):
    tone = tmp_path / "tone.txt"
    tone.write_text("# thử\nwar\nghost\n", encoding="utf-8")
    monkeypatch.setattr(config, "A1_EXCLUDED_TONE", tone)
    write_json(tmp_path / "candidates.json", candidates(["hello", "war", "ghost", "rice"]))
    client = fake_ai.client()
    step02.run("A1", client, limit=4, processed=tmp_path, cache_root=tmp_path / "cache")
    sel = read_json(tmp_path / "a1_selection.json")
    assert {(r["headword"], r["reserve_reason"]) for r in sel["reserve"]} == {("war", "tone_a1"), ("ghost", "tone_a1")}
    assert "war" not in client.calls[0][1] and "ghost" not in client.calls[0][1]  # không gửi đi phân loại
    assert {i["headword"] for items in sel["topics"].values() for i in items} == {"hello", "rice"}


def test_missing_and_invalid_answers_are_retried_then_failed(tmp_path):
    def stubborn(system, user):
        data = json.loads(fake_ai.handler(system, user))
        for d in data:
            if d["headword"] == "rice":
                d["topic_code"] = "cooking"  # mã không tồn tại → coi như chưa trả
        return json.dumps([d for d in data if d["headword"] != "egg"])  # bỏ sót "egg"

    write_json(tmp_path / "candidates.json", candidates(["rice", "egg", "apple"]))
    client = fake_ai.client(stubborn)
    report = step02.run("A1", client, limit=3, processed=tmp_path, cache_root=tmp_path / "cache")
    assert report["classified"] == 1 and report["failed"] == 2
    assert len(client.calls) == config.AI_MAX_RETRIES
    assert {f["headword"] for f in read_json(tmp_path / "failed_02.json")} == {"rice", "egg"}


def test_full_run_adds_phrases_suggestions_and_balances(tmp_path, small_scale):
    thin = [w for w in WORDS if w not in ("kitchen", "door", "bed")]  # chủ đề home thiếu → AI đề xuất thêm
    # Từ đề xuất chỉ được lấy trong nguồn ở cấp A1–A2 (ở đây: các từ A2); AI giả trả thêm 2 từ ngoài nguồn → bị bỏ
    write_json(tmp_path / "candidates.json", candidates(thin) + candidates(["kitchen", "door", "bed", "lamp"], "A2"))
    report = step02.run("A1", fake_ai.client(), processed=tmp_path, cache_root=tmp_path / "cache")
    sel = read_json(tmp_path / "a1_selection.json")
    for code, items in sel["topics"].items():
        assert config.TOPIC_SIZE_MIN <= len(items) <= config.TOPIC_SIZE_MAX, code
        phrases = [i for i in items if i["pos"] == "phrase"]
        assert phrases and all("phrase" in i["flags"] for i in phrases)
        assert [i["rank_in_topic"] for i in items] == list(range(1, len(items) + 1))
        assert items[0]["pos"] != "phrase"  # cụm từ rải đều, không dồn lên đầu
        assert len(phrases) <= units.phrase_cap(code) * config.UNITS_PER_TOPIC_MAX
    suggested = [i for items in sel["topics"].values() for i in items if i["origin"] == "ai_suggested"]
    assert suggested and all("ai_suggested_headword" in i["flags"] and i["topic_code"] == "home" for i in suggested)
    assert {i["headword"] for i in suggested} <= {"kitchen", "door", "bed", "lamp"}
    assert all(i["cefr"] == {"cefrj": "A2"} for i in suggested)
    assert report["dropped_suggestions"] and all(d["reason"] == "not_in_source_levels" for d in report["dropped_suggestions"])
    home = sel["topics"]["home"]
    assert len(home) == config.TOPIC_SIZE_MIN  # chỉ đề xuất cho đủ mức tối thiểu, không độn tới chỉ tiêu
    assert report["total"] <= config.TARGET_PER_LEVEL * 1.05 and report["total"] + report["reserve"] >= report["total"]


def test_order_topic_spreads_phrases_and_caps(monkeypatch):
    monkeypatch.setattr(config, "UNITS_PER_TOPIC_MIN", 3)
    items = [{"headword": f"w{i}", "pos": "noun", "commonness": 3} for i in range(40)]
    items += [{"headword": f"good p{i}", "pos": "phrase", "commonness": 5, "basic_communication": True} for i in range(10)]
    reserve = []
    ordered = step02.order_topic("food", items, reserve)  # ~3 bài × 3 cụm = 9
    pos = [i for i, x in enumerate(ordered) if x["pos"] == "phrase"]
    assert len(pos) == 9 and pos[0] > 0 and max(b - a for a, b in zip(pos, pos[1:])) <= 6
    assert [r["reserve_reason"] for r in reserve] == ["phrase_cap"]
    assert len(step02.order_topic("greetings", items, [])) == 50  # chào hỏi: 8 cụm mỗi bài


def test_balance_moves_overflow_to_reserve(monkeypatch):
    monkeypatch.setattr(config, "TOPIC_SIZE_MAX", 90)
    big = [{"headword": f"w{i}", "pos": "noun", "commonness": 1 + i % 5, "topic_confidence": 0.9} for i in range(95)]
    big.append({"headword": "thank you", "pos": "phrase", "commonness": 1, "topic_confidence": 1})
    topics, reserve = {"a": big, "b": [{"headword": "x", "pos": "noun", "commonness": 3}]}, []
    step02.balance(topics, reserve, target_total=800)
    assert len(topics["a"]) == 90 and len(reserve) == 6 and all(r["reserve_reason"] == "topic_overflow" for r in reserve)
    assert any(i["headword"] == "thank you" for i in topics["a"])  # cụm từ không bị bớt trước
    assert all(r["commonness"] == 1 for r in reserve)


def test_call_json_retries_on_bad_json_then_succeeds():
    answers = iter(["xin lỗi, đây là kết quả", '```json\n[{"headword": "a", "pos": "noun", "topic_code": "food", "confidence": 2, "commonness": 3}]\n```',
                    '[{"headword": "a", "pos": "noun", "topic_code": "food", "confidence": 0.8, "commonness": 3}]'])
    client = ai.FakeAIClient(lambda s, u: next(answers))
    usage = ai.Usage()
    got = ai.call_json(client, "sys", "user", list[ClassifyItem], usage=usage)
    assert got[0].topic_code == "food" and len(client.calls) == 3 and usage.failures == 2
    assert "KHÔNG hợp lệ" in client.calls[1][1]
    with pytest.raises(ai.AIJsonError):
        ai.call_json(ai.FakeAIClient(lambda s, u: "không có JSON"), "s", "u", list[ClassifyItem])


def test_anthropic_client_never_exposes_key():
    secret = "sk-ant-SECRET-XYZ"
    seen = {}

    def transport(request: httpx.Request):
        seen["key"] = request.headers["x-api-key"]
        return httpx.Response(401, json={"error": {"type": "authentication_error", "message": f"bad key {secret}"}})

    client = ai.AnthropicClient(model="claude-test", api_key=secret, transport=httpx.MockTransport(transport))
    assert secret not in repr(client)
    with pytest.raises(ai.AIError) as err:
        client.complete("s", "u")
    assert seen["key"] == secret and secret not in str(err.value) and "401" in str(err.value)
