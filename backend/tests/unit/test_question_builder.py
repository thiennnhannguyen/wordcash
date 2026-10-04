"""
Kiểm thử sinh câu hỏi 4 mức: phần đề không lộ đáp án, đáp án nhiễu, lùi mức khi thiếu điều kiện, chấm câu trả lời.
"""

import random

from app.services import question_builder as qb

ENTRY = qb.EntryData(1, "deadline", "hạn chót", "noun", "/ˈdedlaɪn/", "The deadline for applications is Friday.", None)
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


def test_level_4_fill_blank():
    q = _build(4)
    assert q.public["sentence"] == "The ______ for applications is Friday."
    assert "deadline" in q.public["options"] and not _leaks(q.public, "deadline")


def test_level_4_without_matching_example_falls_back_to_3():
    entry = qb.EntryData(2, "hire", "thuê", "verb", None, "They hired ten people.", None)
    assert _build(4, entry).public["level"] == 3


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
