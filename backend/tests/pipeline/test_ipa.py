"""
ARPAbet → IPA (en-US) và tra CMUdict (data_pipeline/lib/ipa.py): 35 từ mẫu, nhấn chính / phụ, từ một âm tiết không có dấu
nhấn, cụm từ, từ không có trong cmudict → None (bước 03 gắn ipa_unverified); dạng đọc lướt của từ chức năng trong cụm
(of /əv/, the /ðə/ ~ /ði/…), từ chức năng đứng riêng giữ dạng đầy đủ.
"""

import pytest

from data_pipeline.lib import ipa

SAMPLES = {
    "water": "/ˈwɔːtɚ/", "hello": "/həˈloʊ/", "apple": "/ˈæpəl/", "family": "/ˈfæməli/", "mother": "/ˈmʌðɚ/",
    "father": "/ˈfɑːðɚ/", "brother": "/ˈbrʌðɚ/", "sister": "/ˈsɪstɚ/", "teacher": "/ˈtiːtʃɚ/", "student": "/ˈstuːdənt/",
    "computer": "/kəmˈpjuːtɚ/", "banana": "/bəˈnænə/", "tomato": "/təˈmeɪtoʊ/", "breakfast": "/ˈbrɛkfəst/",
    "morning": "/ˈmɔːrnɪŋ/", "evening": "/ˈiːvnɪŋ/", "yesterday": "/ˈjɛstɚdeɪ/", "tomorrow": "/təˈmɑːroʊ/",
    "beautiful": "/ˈbjuːtəfəl/", "happy": "/ˈhæpi/", "station": "/ˈsteɪʃən/", "hospital": "/ˈhɑːspɪtəl/",
    "umbrella": "/əmˈbrɛlə/", "elephant": "/ˈɛləfənt/", "thirteen": "/ˌθɝːˈtiːn/", "afternoon": "/ˌæftɚˈnuːn/",
    "orange": "/ˈɔːrəndʒ/", "chicken": "/ˈtʃɪkən/", "table": "/ˈteɪbəl/", "window": "/ˈwɪndoʊ/", "bicycle": "/ˈbaɪsɪkəl/",
    "extra": "/ˈɛkstrə/", "street": "/striːt/", "bird": "/bɝːd/", "house": "/haʊs/", "dog": "/dɔːɡ/", "thank": "/θæŋk/",
}


@pytest.mark.parametrize("word,expected", sorted(SAMPLES.items()))
def test_cmudict_words(word, expected):
    assert ipa.lookup(word) == expected


def test_sample_size():
    assert len(SAMPLES) >= 30


def test_arpabet_rules():
    assert ipa.arpabet_to_ipa("K AE1 T") == "kæt"  # một âm tiết: không dấu nhấn
    assert ipa.arpabet_to_ipa("S P L AE1 SH") == "splæʃ"  # phụ âm đầu 3 âm
    assert ipa.arpabet_to_ipa("AH0 B AW1 T") == "əˈbaʊt"
    assert ipa.arpabet_to_ipa("IH0 K S K Y UW1 S") == "ɪkˈskjuːs"  # chia cụm phụ âm theo phụ âm đầu dài nhất
    assert ipa.arpabet_to_ipa("HH AE1 P IY0 N AH0 S") == "ˈhæpinəs"
    assert ipa.arpabet_to_ipa("B ER1 D") == "bɝːd" and ipa.arpabet_to_ipa("S IH1 S T ER0") == "ˈsɪstɚ"


def test_phrases_and_missing_words():
    assert ipa.lookup("good morning") == "/ˈɡʊd ˈmɔːrnɪŋ/"
    assert ipa.lookup("thank you") == "/ˈθæŋk juː/"
    assert ipa.lookup("Thank   You") == "/ˈθæŋk juː/"
    assert ipa.lookup("zzqxv") is None and ipa.lookup("good zzqxv") is None


def test_custom_dictionary():
    cmu = {"pho": "F AH1"}
    assert ipa.lookup("pho", cmu) == "/fʌ/" and ipa.lookup("water", cmu) is None


@pytest.mark.parametrize("phrase,expected", [
    ("take care of", "/ˈteɪk ˈkɛr əv/"),  # từ nội dung một âm tiết có nhấn; "of" (chức năng) đọc lướt
    ("a cup of", "/ə ˈkʌp əv/"),
    ("i'm hungry", "/aɪm ˈhʌŋɡri/"),  # dạng rút gọn của từ chức năng: không nhấn
    ("rainy season", "/ˈreɪni ˈsiːzən/"),
    ("I'm Hungry", "/aɪm ˈhʌŋɡri/"),  # chữ hoa hiển thị không ảnh hưởng
])
def test_phrase_ipa_stress(phrase, expected):
    assert ipa.lookup(phrase) == expected


def test_phrase_with_unknown_word_is_unverified():
    assert ipa.lookup("zzqxbanh rice") is None and ipa.lookup("rice") == "/raɪs/"


@pytest.mark.parametrize("phrase,expected", [
    ("a cup of tea", "/ə ˈkʌp əv ˈtiː/"),
    ("go to school", "/ˈɡoʊ tə ˈskuːl/"),
    ("wait for", "/ˈweɪt fər/"),
    ("salt and pepper", "/ˈsɔːlt ən ˈpɛpɚ/"),
    ("I can swim", "/aɪ kən ˈswɪm/"),
    ("at home", "/ət ˈhoʊm/"),
    ("come from", "/ˈkʌm frəm/"),
    ("some water", "/səm ˈwɔːtɚ/"),
    ("an apple", "/ən ˈæpəl/"),
    ("the sun", "/ðə ˈsʌn/"),
    ("the apple", "/ði ˈæpəl/"),  # "the" trước âm nguyên âm
    ("the hour", "/ði ˈaʊɚ/"),  # quyết định theo âm, không theo chữ
    ("the year", "/ðə ˈjɪr/"),  # chữ y- đọc /j/: phụ âm
])
def test_phrase_weak_forms(phrase, expected):
    assert ipa.lookup(phrase) == expected


@pytest.mark.parametrize("word", sorted(ipa.WEAK_FORMS))
def test_function_word_alone_keeps_full_form(word):
    alone = ipa.lookup(word)
    assert alone is not None
    if word not in ("a", "the"):  # cmudict ghi sẵn a /ə/, the /ðə/ là cách đọc chính
        assert alone.strip("/") != ipa.WEAK_FORMS[word]


@pytest.mark.parametrize("word,pos,expected", [
    ("close", "verb", "/kloʊz/"), ("close", "adjective", "/kloʊs/"),
    ("live", "verb", "/lɪv/"), ("live", "adjective", "/laɪv/"),
    ("wind", "noun", "/wɪnd/"), ("use", "verb", "/juːz/"), ("use", "noun", "/juːs/"),
    ("read", "verb", "/riːd/"), ("excuse", "noun", "/ɪkˈskjuːs/"),
    ("excuse me", "phrase", "/ɪkˈskjuːz miː/"),  # trong cụm: đọc như động từ; "me" là từ chức năng
])
def test_heteronyms_by_part_of_speech(word, pos, expected):
    assert ipa.lookup(word, pos=pos) == expected
