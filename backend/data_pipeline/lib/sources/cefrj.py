"""
Bộ đọc CEFR-J Wordlist (https://www.cefr-j.org/download.html). Giấy phép: dùng miễn phí cho nghiên cứu và thương mại với
điều kiện trích dẫn đúng; bản quyền Tono Laboratory, Tokyo University of Foreign Studies (docs/data-sources.md).

- Nhận file trong raw/ có tên chứa "cefr-j" / "cefrj" / "cefr_j" (CSV, TSV hoặc XLSX), cần các cột headword, pos, CEFR
  (không phân biệt hoa thường; dòng tiêu đề có thể không ở dòng 1).
- Chỉ lấy headword, từ loại, nhãn CEFR. Nguồn không có tần suất: `rank` = thứ tự dòng (chỉ để giữ thứ tự ổn định), bước 02
  sắp độ dễ theo điểm phổ biến do AI chấm (người duyệt chỉnh được), không dựa vào `rank` này.
- Phiên bản đọc từ tên file (vd. "Ver1.6" → "1.6", "cefrj-vocabulary-profile-1.5.csv" → "1.5").
- Là danh sách lemma (`is_lemma_list`): bước 01 giữ nguyên "news", "glasses", "people"… không rút về "new", "glass", "person".
- Các cột chủ đề của CEFR-J ("CoreInventory 1", "CoreInventory 2", "Threshold") giữ lại thành `extra["topic_hints"]` để bước 02
  gửi kèm khi phân loại chủ đề (chỉ là gợi ý, không quyết định).
"""

import re
from pathlib import Path

from data_pipeline.lib.sources import RawRow, SourceReader, read_table, register

CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}
HINT_COLUMNS = ("coreinventory 1", "coreinventory 2", "threshold")


@register
class CefrJReader(SourceReader):
    name = "cefrj"
    has_frequency_rank = False
    is_lemma_list = True

    def matches(self, path: Path) -> bool:
        return bool(re.search(r"cefr[\s_\-]?j", Path(path).name, re.I)) and Path(path).suffix.lower() in (".csv", ".tsv", ".txt", ".xlsx")

    def version(self, path: Path) -> str | None:
        m = re.search(r"ver(?:sion)?[\s_\-.]*(\d+(?:\.\d+)*)", Path(path).stem, re.I) or re.search(r"(\d+\.\d+)", Path(path).stem)
        return m.group(1) if m else None

    def read(self, path: Path) -> list[RawRow]:
        rows = read_table(path, {"headword", "pos", "cefr"})
        out = []
        for i, row in enumerate(rows, start=1):
            level = (row.get("cefr") or "").strip().upper()
            hints = [h.strip() for c in HINT_COLUMNS if (h := (row.get(c) or "").strip())]
            out.append(RawRow(headword=row.get("headword", ""), pos=row.get("pos"), cefr=level if level in CEFR else None,
                              rank=i, source=self.name, extra={"topic_hints": hints} if hints else {}))
        return out
