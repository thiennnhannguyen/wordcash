"""
Bước 03 (AI soạn nháp) với AI giả: ghi content/<cấp>/<chủ-đề>.json đúng schema, status draft, IPA lấy từ CMUdict (AI không
ghi đè), từ không có trong CMUdict dùng gợi ý của AI kèm ipa_unverified, cache, --limit, mục đã có (đã duyệt / đã sửa) giữ
nguyên, --redo-drafts chỉ soạn lại draft chưa duyệt, mục AI trả thiếu → failed_03.json. Định dạng file ổn định.
"""

import json

from data_pipeline import config
from data_pipeline.lib import content, step03
from data_pipeline.lib.jsonio import read_json, write_json
from tests.pipeline import fake_ai


def selection(items_by_topic):
    topics = {t.code: [] for t in config.topics("A1")}
    for code, words in items_by_topic.items():
        topics[code] = [{"headword": h, "pos": p, "topic_code": code, "commonness": 4, "basic_communication": False,
                         "subgroup": "x", "origin": "source", "flags": ["phrase"] if p == "phrase" else [],
                         "sources": ["cefrj"], "rank_in_topic": i} for i, (h, p) in enumerate(words, 1)]
    return {"level": "A1", "topics": topics}


def setup(tmp_path, words):
    write_json(tmp_path / "a1_selection.json", selection(words))
    return dict(processed=tmp_path, content_root=tmp_path / "content", cache_root=tmp_path / "cache")


def test_enrich_writes_drafts_with_cmudict_ipa(tmp_path):
    paths = setup(tmp_path, {"food": [("rice", "noun"), ("eat", "verb"), ("zzqxbanh", "noun"), ("thank you", "phrase")]})
    client = fake_ai.client()
    report = step03.run("A1", client, **paths)
    assert report["written"] == {"food": 4} and report["failed"] == 0
    topic = content.load_topic(content.topic_path("A1", "food", paths["content_root"]))
    by = {e.headword.lower(): e for e in topic.entries}
    assert by["thank you"].headword == "Thank you"  # chữ hoa hiển thị, content_key vẫn viết thường
    assert all(e.status == "draft" for e in topic.entries) and topic.topic_title == "Đồ ăn"
    assert by["rice"].ipa == "/raɪs/" and not by["rice"].ipa_unverified and by["rice"].meaning_vi == "cơm"
    assert by["zzqxbanh"].ipa == "/tɛst/" and by["zzqxbanh"].ipa_unverified  # không có trong CMUdict
    assert by["thank you"].entry_type == "phrase" and by["thank you"].content_key == "a1.food.thank_you.phrase"
    assert by["thank you"].origin_flags == ["phrase"] and by["rice"].ai_prompt.startswith("enrich_v2#")
    calls = len(client.calls)
    # chạy lại: không có mục mới → không gọi AI; file không đổi
    before = content.topic_path("A1", "food", paths["content_root"]).read_bytes()
    step03.run("A1", client, **paths)
    assert len(client.calls) == calls and content.topic_path("A1", "food", paths["content_root"]).read_bytes() == before


def test_limit_cache_and_existing_entries_preserved(tmp_path):
    words = {"food": [(w, "noun") for w in ("rice", "apple", "water", "egg")]}
    paths = setup(tmp_path, words)
    client = fake_ai.client()
    assert step03.estimate("A1", limit=2, **paths)["items"] == 2
    step03.run("A1", client, limit=2, **paths)
    path = content.topic_path("A1", "food", paths["content_root"])
    topic = content.load_topic(path)
    assert [e.headword for e in topic.entries] == ["rice", "apple"]
    topic.entries[0].meaning_vi = "cơm (đã sửa tay)"
    topic.entries[0].status = "approved"
    content.save_topic(topic, paths["content_root"])
    step03.run("A1", client, **paths)  # thêm egg, water; giữ nguyên mục đã duyệt
    topic = content.load_topic(path)
    assert [e.headword for e in topic.entries] == ["rice", "apple", "water", "egg"]
    assert topic.entries[0].meaning_vi == "cơm (đã sửa tay)" and topic.entries[0].status == "approved"
    calls = len(client.calls)
    step03.run("A1", client, redo_drafts=True, **paths)  # soạn lại 3 draft: lấy từ cache, không gọi AI
    assert len(client.calls) == calls and content.load_topic(path).entries[0].meaning_vi == "cơm (đã sửa tay)"


def test_missing_items_go_to_failed(tmp_path):
    def drop_egg(system, user):
        return json.dumps([d for d in json.loads(fake_ai.handler(system, user)) if d["headword"] != "egg"])

    paths = setup(tmp_path, {"food": [("rice", "noun"), ("egg", "noun")]})
    report = step03.run("A1", fake_ai.client(drop_egg), **paths)
    assert report["written"] == {"food": 1} and report["failed"] == 1
    assert read_json(tmp_path / "failed_03.json")[0]["headword"] == "egg"


def test_stable_file_format(tmp_path):
    paths = setup(tmp_path, {"food": [("rice", "noun")]})
    step03.run("A1", fake_ai.client(), **paths)
    text = content.topic_path("A1", "food", paths["content_root"]).read_text(encoding="utf-8")
    assert text.endswith("}\n") and '\n  "level": "A1"' in text and "Đồ ăn" in text  # indent 2, giữ dấu tiếng Việt
    assert list(json.loads(text)) == ["schema_version", "level", "topic_code", "topic_title", "entries", "units"]


def test_display_headword_casing():
    from data_pipeline.lib.casing import display_headword as d

    assert d("i'm hungry", "phrase") == "I'm hungry" and d("good morning", "interjection") == "Good morning"
    assert d("tet", "noun") == "Tet" and d("ho chi minh city", "noun") == "Ho Chi Minh City" and d("monday", "noun") == "Monday"
    assert d("it's hot", "phrase") == "It's hot" and d("thank you", "phrase", True) == "Thank you"
    assert d("happy tet", "phrase") == "Happy Tet" and d("tv", "noun") == "TV"
    # cụm thường, từ đơn, món ăn Việt giữ chữ thường; tên người không viết hoa giữa cụm
    assert d("fried rice", "phrase") == "fried rice" and d("a cup of", "phrase") == "a cup of" and d("hello", "noun") == "hello"
    assert d("pho", "noun") == "pho" and d("an apple", "phrase") == "an apple"
    assert d("miss", "noun") == "Miss" and d("miss", "verb") == "miss"  # danh xưng viết hoa theo từ loại
    assert d(d("i'm hungry", "phrase"), "phrase") == "I'm hungry"  # lũy đẳng


def test_drafts_keep_case_but_keys_lowercase_and_refresh(tmp_path):
    paths = setup(tmp_path, {"food": [("i'm hungry", "phrase"), ("rice", "noun")]})
    step03.run("A1", fake_ai.client(), **paths)
    by = {e.content_key: e for e in content.load_topic(content.topic_path("A1", "food", paths["content_root"])).entries}
    assert by["a1.food.i_m_hungry.phrase"].headword == "I'm hungry" and by["a1.food.rice.noun"].headword == "rice"
    # mục cũ (soạn trước khi có quy tắc chữ hoa) được sửa bằng refresh_derived, mục đã duyệt giữ nguyên
    topic = content.load_topic(content.topic_path("A1", "food", paths["content_root"]))
    for e in topic.entries:
        e.headword = e.headword.lower()
    content.save_topic(topic, paths["content_root"])
    out = step03.refresh_derived("A1", content_root=paths["content_root"])
    assert "a1.food.i_m_hungry.phrase" in out["changed"]["food"]
    by = {e.content_key: e for e in content.load_topic(content.topic_path("A1", "food", paths["content_root"])).entries}
    assert by["a1.food.i_m_hungry.phrase"].headword == "I'm hungry"
    assert step03.refresh_derived("A1", content_root=paths["content_root"])["changed"] == {}  # chạy lại không đổi gì
