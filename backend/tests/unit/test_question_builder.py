"""
Kiểm thử sinh câu hỏi 4 mức: phần đề không lộ đáp án, đáp án nhiễu, lùi mức khi thiếu điều kiện, chấm câu trả lời.
Mức 4 chỉ dùng câu cloze riêng + 3 đáp án nhiễu soạn sẵn; thiếu thì lùi về Mức 3 (kể cả khi câu ví dụ có chứa từ).
"""

import random

from app.services import question_builder as qb

ENTRY = qb.EntryData(1, "deadline", "hạn chót", "noun", "/ˈdedlaɪn/", "The deadline for applications is Friday.", None,
                     cloze_en="Hurry! The deadline to send the form is today at five.",
                     cloze_distractors=("salary", "colleague", "holiday"))
MEANINGS = ["lương", "đồng nghiệp", "ứng viên", "kỹ năng"]
WORDS = ["salary", "colleague", "candidate", "skill"]


def _build(level, entry=ENTRY, meanings=MEANINGS, words=WORDS):
    return qb.build_question("q1", entry, level, meaning_pool=meanings, word_pool=words, rng=random.Random(1))


def _leaks(public: dict, answer: str) -> bool:
    """Đáp án có xuất hiện trong phần đề ngoài danh sách lựa chọn không."""
    rest = {k: v for k, v in public.items() if k != "options"}
    return answer.lower() in str(rest).lower()


def test_level_1_choose_meaning():
    q = _build(1)
    assert q.public["word"] == "deadline" and len(q.public["options"]) == 4
    assert "hạn chót" in q.public["options"] and q.key["answer"] == "hạn chót"
    assert "entry_id" not in q.public and "answer" not in q.public and not _leaks(q.public, "hạn chót")


def test_level_2_without_audio_falls_back_to_level_1():
    assert _build(2).public["level"] == 1
    with_audio = qb.EntryData(**{**ENTRY.__dict__, "audio_url": "https://cdn/a.mp3"})
    q = _build(2, with_audio)
    assert q.public["level"] == 2 and q.public["audio_url"] and "word" not in q.public and q.key["answer"] == "deadline"


def test_level_3_type_word_sends_only_letter_count():
    q = _build(3)
    assert q.public["prompt"] == "hạn chót" and q.public["letter_count"] == 8
    assert not _leaks(q.public, "deadline")


def test_level_4_uses_cloze_sentence_and_prepared_distractors():
    q = _build(4)
    assert q.public["sentence"] == "Hurry! The ______ to send the form is today at five."  # câu cloze, không phải câu ví dụ
    assert sorted(q.public["options"]) == sorted(["deadline", "salary", "colleague", "holiday"])  # không bốc từ word_pool
    assert q.key["answer"] == "deadline" and not _leaks(q.public, "deadline")


def test_level_4_without_cloze_falls_back_to_3_even_if_example_matches():
    entry = qb.EntryData(2, "deadline", "hạn chót", "noun", None, "The deadline is Friday.", None)  # câu ví dụ chứa từ
    assert _build(4, entry).public["level"] == 3
    assert 4 not in qb.available_levels(entry)


def test_level_4_needs_exactly_three_valid_distractors():
    def ready(**kw):
        return qb.cloze_ready(qb.EntryData(**{**ENTRY.__dict__, **kw}))
    assert ready()
    assert not ready(cloze_distractors=("salary", "colleague"))  # thiếu
    assert not ready(cloze_distractors=("salary", "colleague", "holiday", "skill"))  # thừa
    assert not ready(cloze_distractors=("salary", "Salary", "holiday"))  # trùng nhau
    assert not ready(cloze_distractors=("salary", "deadline", "holiday"))  # trùng đáp án đúng
    assert not ready(cloze_en="Hurry, it is today at five.")  # câu không chứa từ
    assert _build(4, qb.EntryData(**{**ENTRY.__dict__, "cloze_distractors": ("salary",)})).public["level"] == 3


def test_choice_question_without_distractors_becomes_typing():
    q = _build(1, meanings=[], words=[])
    assert q.public["level"] == 3 and q.key["level"] == 3


def test_distractors_skip_same_meaning():
    q = _build(1, meanings=["Hạn chót", "hạn chót ", "lương"])
    assert sorted(q.public["options"]) == sorted(["hạn chót", "lương"])


def test_blank_sentence_matches_whole_word_only():
    assert qb.blank_sentence("Use a reliable source.", "rely") is None
    assert qb.blank_sentence("Look forward to it.", "look forward to") == "______ it."


def test_check_answer_normalizes():
    key = {"answer": "Look forward to"}
    assert qb.check_answer(key, "  look   FORWARD to ")
    assert not qb.check_answer(key, "")
    assert qb.check_answer({"answer": "don't"}, "don’t")


def test_session_engine_uses_entry_cloze_fields():
    """Mục từ DB → câu Mức 4 dùng cloze_en + cloze_distractors của chính mục đó; mục không có thì lùi về Mức 3."""
    from app.models import Entry
    from app.services import session_engine

    with_cloze = Entry(id=1, headword="rice", meaning_vi="cơm", pos="noun", example="We eat rice.",
                       cloze_en="People cook white rice and eat it with fish.", cloze_distractors=["milk", "juice", "tea"])
    plain = Entry(id=2, headword="egg", meaning_vi="quả trứng", pos="noun", example="I eat an egg.", cloze_distractors=[])
    pool = [with_cloze, plain, Entry(id=3, headword="soup", meaning_vi="canh", pos="noun"),
            Entry(id=4, headword="bread", meaning_vi="bánh mì", pos="noun")]
    public, keys = session_engine.build_questions([(with_cloze, 4), (plain, 4)], pool, random.Random(3))
    assert public[0]["type"] == "fill_blank" and sorted(public[0]["options"]) == ["juice", "milk", "rice", "tea"]
    assert public[0]["sentence"] == "People cook white ______ and eat it with fish." and keys[0]["answer"] == "rice"
    assert public[1]["type"] == "type_word" and keys[1]["level"] == 3
    assert session_engine.strong_level(plain, random.Random(1)) == 3
