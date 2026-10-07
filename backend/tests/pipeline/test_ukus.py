"""
Chuẩn từ vựng Anh-Mỹ (data_pipeline/uk_us_vocab.tsv, lib/ukus.py): đọc file thật; headword chỉ dùng ở Anh đổi sang từ Mỹ
(theo từ loại nếu có); từ người Mỹ vẫn dùng thì có variant_note; quét từ Anh-Anh trong câu (cụm, số nhiều, không bắt nhầm
từ khác); quy tắc uk_vocab của bước 04; bước 02 đổi headword hoặc đưa vào dự phòng; bước 03 điền variant_note.
"""

from data_pipeline.lib import step02, ukus, validate
from data_pipeline.lib.schemas import ContentEntry


def test_real_file_has_common_pairs():
    pairs = {p.uk: p for p in ukus.load()}
    for uk, us in [("flat", "apartment"), ("trousers", "pants"), ("autumn", "fall"), ("football", "soccer"),
                   ("mobile phone", "cell phone"), ("rubbish", "trash"), ("maths", "math"), ("mum", "mom")]:
        assert pairs[uk].us == us
    assert {p.mode for p in pairs.values()} <= set(ukus.MODES)


def test_headword_replacement_and_note():
    assert ukus.headword_replacement("flat", "noun") == "apartment"
    assert ukus.headword_replacement("flat", "adjective") is None  # "a flat road" vẫn là tiếng Mỹ
    assert ukus.headword_replacement("Trousers", "noun") == "pants"
    assert ukus.headword_replacement("pants", "noun") is None
    assert ukus.variant_note("autumn", "noun") == "Mỹ thường dùng: fall"
    assert ukus.variant_note("shop", "noun") == "Mỹ thường dùng: store" and ukus.variant_note("store", "noun") == ""


def test_text_terms():
    found = [p.uk for p in ukus.text_terms("We play Football, eat sweets and take the mobile phones home.")]
    assert set(found) == {"football", "sweets", "mobile phone"}
    assert ukus.text_terms("This candy is very sweet. I go to the post office. Lift the box.") == []
    assert ukus.text_terms("a mobile phone")[0].uk == "mobile phone"  # cụm dài khớp trước, không bắt thêm "mobile"


def entry(**kw) -> ContentEntry:
    base = dict(content_key="a1.home.house.noun", headword="house", pos="noun", ipa="/haʊs/", meaning_vi="ngôi nhà",
                definition_en="a building where people live", example_en="My house is near the park.",
                example_vi="Nhà mình ở gần công viên.", collocations=["a big house"])
    base.update(kw)
    return ContentEntry(**base)


def test_uk_vocab_rule():
    assert validate.rule_uk_vocab(entry()) is None
    flag, detail = validate.rule_uk_vocab(entry(headword="flat", example_en="We live in a flat.", collocations=["a small flat"]))
    assert flag == "uk_vocab" and "headword: flat → apartment" in detail
    _, detail = validate.rule_uk_vocab(entry(example_en="We play football after school.", definition_en="a place to buy sweets"))
    assert "example_en: football → soccer" in detail and "definition_en: sweets → candy" in detail
    _, detail = validate.rule_uk_vocab(entry(headword="autumn", content_key="a1.weather.autumn.noun"))
    assert "thiếu variant_note" in detail
    assert validate.rule_uk_vocab(entry(headword="autumn", variant_note="Mỹ thường dùng: fall")) is None
    assert "uk_vocab" in validate.FLAG_HELP


def test_step02_apply_us_vocab():
    item = lambda h, **kw: {"headword": h, "pos": "noun", "commonness": 3, "basic_communication": False, **kw}
    topics = {"home": [item("flat", commonness=5), item("pants")], "shopping": [item("trousers", commonness=5)]}
    reserve: list[dict] = []
    step02.apply_us_vocab(topics, reserve)
    assert [i["headword"] for i in topics["home"]] == ["apartment", "pants"]
    assert topics["home"][0]["uk_variant_of"] == "flat"
    assert topics["shopping"] == [] and reserve[0]["reserve_reason"] == "uk_vocab" and reserve[0]["us_word"] == "pants"
    assert topics["home"][1]["commonness"] == 5  # từ Mỹ nhận độ ưu tiên của từ Anh
