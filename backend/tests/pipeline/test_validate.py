"""
Bước 04 (kiểm tra tự động): từng quy tắc một test (đúng thì không gắn cờ, sai thì gắn cờ kèm chi tiết), quy tắc trùng lặp
nhiều mục, chạy trên file nội dung (cờ tính lại, giữ origin_flags, mục rejected bỏ qua), báo cáo theo loại / chủ đề.
"""

from data_pipeline.lib import content, validate
from data_pipeline.lib.jsonio import write_json
from data_pipeline.lib.schemas import ContentEntry, TopicFile

KW = {"coca-cola", "beer", "taylor swift"}


def entry(**kw) -> ContentEntry:
    base = dict(content_key="a1.food.rice.noun", headword="rice", pos="noun", ipa="/raɪs/", meaning_vi="cơm",
                definition_en="white grains that people cook and eat", example_en="We eat rice for lunch every day.",
                example_vi="Nhà mình ăn cơm mỗi trưa.", collocations=["cook rice", "a bowl of rice"], image_keyword="bowl of rice")
    base.update(kw)
    return ContentEntry(**base)


def flags(e, whitelist=None):
    return {f for f, _ in validate.entry_rules(e, whitelist=whitelist, keywords=KW)}


def test_clean_entry_has_no_flags():
    assert flags(entry()) == set()


def test_example_must_contain_headword_or_inflection():
    assert validate.rule_example_contains_headword(entry(example_en="We eat noodles for lunch every day."))[0] == "example_missing_headword"
    assert validate.rule_example_contains_headword(entry(headword="egg", content_key="a1.food.egg.noun", example_en="I buy six eggs today.")) is None
    assert validate.rule_example_contains_headword(entry(headword="go", pos="verb", content_key="a1.food.go.verb", example_en="She went to the market.")) is None
    assert validate.rule_example_contains_headword(entry(headword="get up", pos="verb", content_key="a1.home.get_up.verb", example_en="I got up at six today.")) is None


def test_length_rules():
    assert validate.rule_meaning(entry(meaning_vi=" "))[0] == "meaning_empty"
    assert validate.rule_meaning(entry(meaning_vi="một loại ngũ cốc trắng rất phổ biến"))[0] == "meaning_too_long"
    assert validate.rule_meaning(entry(meaning_vi="cơm, gạo")) is None
    assert validate.rule_definition_length(entry(definition_en=" ".join(["word"] * 13)))[0] == "definition_too_long"
    assert validate.rule_example_length(entry(example_en="I eat rice."))[0] == "example_length"
    assert validate.rule_example_length(entry(example_en=" ".join(["rice"] * 13)))[0] == "example_length"
    assert validate.rule_example_length(entry(example_en="I wake up at 6:30 every day.")) is None  # số vẫn tính là từ


def test_hard_words():
    whitelist = {"we", "eat", "for", "lunch", "every", "day", "a", "the"}
    assert validate.rule_hard_words(entry(), whitelist) is None
    flag, detail = validate.rule_hard_words(entry(example_en="We eat delicious rice for lunch every day."), whitelist)
    assert flag == "hard_words" and detail == "delicious"
    assert validate.rule_hard_words(entry(example_en="We cook rice for lunch."), whitelist | {"we"}) is None  # từ trong cụm đi kèm
    assert validate.rule_hard_words(entry(), None) is None  # chưa có danh sách trắng: bỏ qua


def test_ipa_sensitive_collocations():
    assert validate.rule_ipa(entry(ipa="/tɛst/", ipa_unverified=True))[0] == "ipa_unverified"
    assert validate.rule_ipa(entry(ipa=None))[0] == "ipa_unverified"
    assert validate.rule_sensitive(entry(example_en="We eat rice and drink beer."), KW) == ("sensitive", "beer")
    assert validate.rule_sensitive(entry(example_en="Taylor Swift eats rice."), KW)[1] == "taylor swift"
    assert validate.rule_sensitive(entry(example_en="We eat rice with beef."), KW) is None  # không khớp một phần từ
    flag, detail = validate.rule_collocations(entry(collocations=["cook rice", "white grains"]))
    assert flag == "collocation_missing_headword" and detail == "white grains"


def test_duplicates_across_level_and_topic():
    food = TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn", entries=[
        entry(), entry(content_key="a1.food.meal.noun", headword="meal", meaning_vi="Cơm", example_en="We eat a meal at noon."),
        entry(content_key="a1.food.dish.noun", headword="dish", meaning_vi="món ăn", example_en="We eat rice for lunch every day.",
              status="rejected"),
    ])
    home = TopicFile(level="A1", topic_code="home", topic_title="Nhà cửa", entries=[
        entry(content_key="a1.home.rice.noun", meaning_vi="gạo", example_en="We eat rice for lunch every day."),
    ])
    d = validate.rule_duplicates([food, home])
    assert {f for f, _ in d["a1.food.rice.noun"]} == {"duplicate_headword", "duplicate_example", "same_meaning_vi"}
    assert {f for f, _ in d["a1.food.meal.noun"]} == {"same_meaning_vi"}  # cùng nghĩa (không phân biệt hoa thường)
    assert {f for f, _ in d["a1.home.rice.noun"]} == {"duplicate_headword", "duplicate_example"}  # khác chủ đề: không xét nghĩa
    assert "a1.food.dish.noun" not in d  # mục rejected bỏ qua


def test_run_on_files_recomputes_flags_and_reports(tmp_path):
    root = tmp_path / "content"
    t = TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn", entries=[
        entry(origin_flags=["phrase"], flags=["phrase", "stale_flag"]),
        entry(content_key="a1.food.egg.noun", headword="egg", meaning_vi="quả trứng", example_en="We eat rice for dinner here."),
    ])
    content.save_topic(t, root)
    write_json(tmp_path / "candidates.json", [{"headword": w, "pos": "noun", "cefr": {"cefrj": "A1"}} for w in
                                              ["we", "eat", "lunch", "every", "day", "dinner", "here"]])
    report = validate.run("A1", processed=tmp_path, content_root=root)
    saved = content.by_key(content.load_topic(content.topic_path("A1", "food", root)))
    assert saved["a1.food.rice.noun"].flags == ["phrase"]  # cờ cũ không còn đúng bị bỏ, giữ origin_flags
    assert "example_missing_headword" in saved["a1.food.egg.noun"].flags
    assert saved["a1.food.egg.noun"].flag_details["example_missing_headword"] == "We eat rice for dinner here."
    assert report["by_flag"]["example_missing_headword"] == 1 and report["by_topic"]["food"]["flagged"] == 1  # "phrase" chỉ là thông tin
    assert report["hard_words_checked"] is True
    assert set(validate.FLAG_HELP) >= set(report["by_flag"])  # mọi cờ đều có giải thích cho người duyệt


def test_vn_context_allowlist():
    vn = {"pho", "banh mi", "tet", "hanoi", "ha long bay", "ha long", "motorbike"}
    assert validate.vn_terms("I eat Phở for breakfast.", vn) == ["pho"]  # so khớp bỏ dấu, không phân biệt hoa thường
    assert validate.vn_terms("We visit Ha Long Bay at Tết.", vn) == ["ha long bay", "tet"]  # cụm dài khớp trước
    assert validate.rule_vn_context(entry(example_en="I eat pho for breakfast."), vn) is None
    flag, detail = validate.rule_vn_context(entry(example_en="In Hanoi, I eat pho and banh mi."), vn)
    assert flag == "vn_context_overuse" and detail == "hanoi, pho, banh mi"
    # Từ trong danh sách (file thật) không bị cờ hard_words
    whitelist = validate.build_whitelist("A1", [], [])
    assert validate.rule_hard_words(entry(example_en="My dad goes to Hanoi by motorbike."),
                                    whitelist | {"my", "dad", "go", "goes", "to", "by"}) is None
    assert "vn_context_overuse" in flags(entry(example_en="We eat banh mi and pho in Hoi An."))


def test_phrase_related_phrases():
    hungry = dict(content_key="a1.food.i_m_hungry.phrase", headword="I'm hungry", pos="phrase", ipa="/aɪm ˈhʌŋɡri/",
                  meaning_vi="đói rồi", example_en="I'm hungry. Let's eat now.", example_vi="Mình đói rồi. Đi ăn thôi.")
    # Cụm liên quan (biến thể, câu đáp lại) không cần chứa headword
    assert validate.rule_collocations(entry(**hungry, collocations=["I'm thirsty", "I'm full"])) is None
    flag, detail = validate.rule_collocations(entry(**hungry, collocations=["I'm hungry now", "I'm thirsty"]))
    assert flag == "phrase_related_repeats_headword" and detail == "I'm hungry now"
    flag, _ = validate.rule_collocations(entry(**hungry, collocations=["i'm HUNGRY again"]))  # không phân biệt hoa thường
    assert flag == "phrase_related_repeats_headword"
    # Chứa một phần (không nguyên văn) thì được
    assert validate.rule_collocations(entry(**hungry, collocations=["I'm not hungry"])) is None


def test_meaning_vi_pronoun():
    assert validate.rule_meaning_pronoun(entry(meaning_vi="đói rồi")) is None
    assert validate.rule_meaning_pronoun(entry(meaning_vi="tôi đói rồi")) == ("meaning_vi_pronoun", "tôi đói rồi")
    assert validate.rule_meaning_pronoun(entry(meaning_vi="Tôi tên là")) is not None
    assert validate.rule_meaning_pronoun(entry(meaning_vi="tối nay")) is None  # "tối" ≠ "tôi"


def test_negative_contractions_are_not_hard_words():
    assert [validate.contraction_base(t) for t in ("don't", "can't", "won't", "isn't", "it's")] == ["do", "can", "will", "is", "it"]
    allowed = {"do", "put", "your", "bag", "on", "the", "floor", "can", "find", "my", "key", "i"}
    assert validate.rule_hard_words(entry(headword="floor", example_en="Don't put your bag on the floor."), allowed) is None
    assert validate.rule_hard_words(entry(headword="key", example_en="I can't find my key."), allowed) is None


def test_hyphenated_headwords_are_allowed_in_other_examples():
    tshirt = entry(content_key="a1.shopping.t_shirt.noun", headword="T-shirt", example_en="I like this T-shirt.")
    whitelist = validate.build_whitelist("A1", [], [TopicFile(level="A1", topic_code="shopping", topic_title="Mua sắm", entries=[tshirt])])
    green = entry(headword="green", pos="adjective", example_en="I like the green T-shirt.")
    assert validate.rule_hard_words(green, whitelist | {"i", "like", "the"}) is None


def test_info_flags_are_not_counted():
    assert {"phrase", "ai_suggested_headword"} <= validate.INFO_FLAGS
    assert {"phrase", "ai_suggested_headword"} <= set(validate.FLAG_HELP)
