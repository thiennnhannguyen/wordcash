"""
Bước 01 (nhập và chuẩn hóa): bộ đọc CEFR-J (CSV, TSV, XLSX; dòng tiêu đề không ở dòng 1), chuẩn hóa chữ thường / khoảng
trắng / Anh-Anh → Anh-Mỹ / biến thể "a/b", từ loại về bộ nhãn chung, lemma bảo thủ (chỉ với nguồn không phải danh sách
lemma; CEFR-J giữ nguyên "news", "glasses"), gợi ý chủ đề của CEFR-J, gộp theo (headword, pos), báo cáo, và từ chối file
không có bộ đọc. Dữ liệu là bảng nhỏ tự soạn theo đúng định dạng cột của CEFR-J.
"""

import pytest
from openpyxl import Workbook

from data_pipeline.lib import morph, step01
from data_pipeline.lib.normalize import normalize_headword, normalize_pos, to_american
from data_pipeline.lib.sources import reader_for

ROWS = [
    ("headword", "pos", "CEFR"),
    ("Colour/Color", "noun", "A1"),
    ("  apple ", "noun", "A1"),
    ("apples", "noun", "A2"),
    ("run", "verb", "A1"),
    ("run", "noun", "B1"),
    ("favourite", "adjective", "A1"),
    ("the", "article", "A1"),
    ("can", "modal verb", "A1"),
    ("Mr/Mr.", "noun", "A1"),
    ("123", "noun", "A1"),
    ("bus", "noun", "A1"),
    ("good morning", "phrase", "A1"),
    ("hour", "noun", "A1"),
    ("whatever", "???", "B1"),
]


def write_csv(path, rows, delimiter=","):
    path.write_text("\n".join(delimiter.join(r) for r in rows) + "\n", encoding="utf-8")
    return path


def test_normalize_headword_and_spelling():
    assert normalize_headword("  Colour/Color ") == "color"
    assert normalize_headword("Colour") == "color"
    assert normalize_headword("Mr/Mr.") == "mr" and normalize_headword("a.m./A.M./am/AM") == "a.m."
    assert normalize_headword("GOOD   Morning!") == "good morning"
    assert normalize_headword("123") is None and normalize_headword("") is None
    assert to_american("favourite neighbour") == "favorite neighbor"
    assert [to_american(w) for w in ("hour", "four", "your", "tour", "flour")] == ["hour", "four", "your", "tour", "flour"]
    assert to_american("theatre") == "theater" and to_american("grey") == "gray"


def test_normalize_pos():
    assert normalize_pos("Noun") == "noun" and normalize_pos("modal verb") == "modal" and normalize_pos("be-verb") == "auxiliary"
    assert normalize_pos("article") == "determiner" and normalize_pos("adj") == "adjective" and normalize_pos("???") is None


@pytest.mark.parametrize("fmt", ["csv", "tsv", "xlsx"])
def test_cefrj_reader_formats(tmp_path, fmt):
    if fmt == "xlsx":
        path = tmp_path / "CEFR-J_Wordlist_Ver1.6.xlsx"
        wb = Workbook()
        ws = wb.active
        ws.append(["CEFR-J Wordlist (mẫu tự soạn)"])  # dòng tiêu đề thật ở dòng 2
        for r in ROWS:
            ws.append(list(r))
        wb.save(path)
    else:
        path = write_csv(tmp_path / f"cefrj_ver1.6.{fmt}", ROWS, "\t" if fmt == "tsv" else ",")
    reader = reader_for(path)
    assert reader is not None and reader.name == "cefrj" and reader.version(path) == "1.6"
    rows = reader.read(path)
    assert len(rows) == len(ROWS) - 1
    assert rows[0].headword == "Colour/Color" and rows[0].cefr == "A1" and rows[0].rank == 1 and rows[0].source == "cefrj"


def test_import_merges_lemmatizes_and_reports(tmp_path, monkeypatch):
    monkeypatch.setattr(reader_for(tmp_path / "cefrj.csv"), "is_lemma_list", False)  # thử lemma như một nguồn chưa rút gọn
    write_csv(tmp_path / "cefrj-1.6.csv", ROWS)
    (tmp_path / "README.md").write_text("ghi chú", encoding="utf-8")  # bỏ qua
    candidates, report = step01.import_sources(tmp_path)
    by_key = {(c["headword"], c["pos"]): c for c in candidates}
    assert ("color", "noun") in by_key and by_key[("color", "noun")]["variants"] == ["Colour/Color"]
    apple = by_key[("apple", "noun")]
    assert apple["cefr"] == {"cefrj": "A1"} and apple["rank"] == {"cefrj": 2}  # "apples" gộp vào, giữ cấp thấp nhất
    assert "apples → apple" in report["lemmatized"] and report["merged_duplicates"] == 1
    assert ("run", "verb") in by_key and ("run", "noun") in by_key  # khác từ loại: hai ứng viên
    assert ("bus", "noun") in by_key  # không cắt nhầm thành "bu"
    assert ("favorite", "adjective") in by_key and ("good morning", "phrase") in by_key
    assert report["dropped"] == {"invalid_headword": 1, "unknown_pos": 1}
    assert report["sources"][0]["version"] == "1.6" and report["sources"][0]["rows"] == len(ROWS) - 1
    assert candidates[0]["cefr_min"] == "A1" and report["candidates"] == len(candidates)


def test_cefrj_is_lemma_list_and_keeps_topic_hints(tmp_path):
    rows = [("headword", "pos", "CEFR", "CoreInventory 1", "CoreInventory 2", "Threshold"),
            ("news", "noun", "A1", "Free time, entertainment", "", ""), ("new", "adjective", "A1", "", "", ""),
            ("glasses", "noun", "A1", "Objects and rooms", "", "House and home, environment"), ("glass", "noun", "A1", "", "", ""),
            ("people", "noun", "A1", "", "", ""), ("a.m./A.M./am/AM", "adverb", "A1", "", "", "")]
    path = tmp_path / "cefrj-vocabulary-profile-1.5.csv"
    path.write_text("\n".join(",".join(f'"{c}"' for c in r) for r in rows) + "\n", encoding="utf-8")
    assert reader_for(path).version(path) == "1.5"
    candidates, report = step01.import_sources(tmp_path)
    by_key = {(c["headword"], c["pos"]): c for c in candidates}
    assert report["lemmatized"] == [] and report["merged_duplicates"] == 0
    assert {("news", "noun"), ("glasses", "noun"), ("glass", "noun"), ("people", "noun"), ("a.m.", "adverb")} <= set(by_key)
    assert by_key[("glasses", "noun")]["topic_hints"] == ["Objects and rooms", "House and home, environment"]
    assert by_key[("people", "noun")]["topic_hints"] == []


def test_unknown_source_file_is_rejected(tmp_path):
    write_csv(tmp_path / "random_list.csv", ROWS)
    with pytest.raises(step01.UnknownSourceError):
        step01.import_sources(tmp_path)


@pytest.mark.parametrize("head,pos,form", [
    ("apple", "noun", "apples"), ("bus", "noun", "buses"), ("baby", "noun", "babies"), ("child", "noun", "children"),
    ("knife", "noun", "knives"), ("watch", "verb", "watches"), ("study", "verb", "studied"), ("stop", "verb", "stopped"),
    ("make", "verb", "making"), ("go", "verb", "went"), ("eat", "verb", "eaten"), ("big", "adjective", "bigger"),
    ("happy", "adjective", "happiest"), ("good", "adjective", "better"), ("lie", "verb", "lying"), ("get up", None, "got up"),
    ("bus stop", "noun", "bus stops"),
])
def test_word_forms(head, pos, form):
    assert form in morph.headword_forms(head, pos)


def test_contains_headword():
    assert morph.contains_headword("My brother studies English every day.", "study", "verb")
    assert morph.contains_headword("We get up at six o'clock.", "get up")
    assert morph.contains_headword("I like cats.", "cat", "noun") and morph.contains_headword("I like cats.", "cat")
    assert not morph.contains_headword("I eat rice.", "apple", "noun")
    assert not morph.contains_headword("The category is long.", "cat", "noun")  # không khớp một phần từ
