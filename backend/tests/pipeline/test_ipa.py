"""
ARPAbet → IPA (en-US) và tra CMUdict (data_pipeline/lib/ipa.py): 35 từ mẫu, nhấn chính / phụ, từ một âm tiết không có dấu
nhấn, cụm từ, từ không có trong cmudict → None (bước 03 gắn ipa_unverified).
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
    assert ipa.lookup("good morning") == "/ɡʊd ˈmɔːrnɪŋ/"
    assert ipa.lookup("thank you") == "/θæŋk juː/"
    assert ipa.lookup("Thank   You") == "/θæŋk juː/"
    assert ipa.lookup("zzqxv") is None and ipa.lookup("good zzqxv") is None


def test_custom_dictionary():
    cmu = {"pho": "F AH1"}
    assert ipa.lookup("pho", cmu) == "/fʌ/" and ipa.lookup("water", cmu) is None
