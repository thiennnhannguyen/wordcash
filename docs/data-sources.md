# Nguồn dữ liệu kho từ

Mọi file nguồn đặt trong `backend/data_pipeline/raw/` (thư mục không đưa lên Git) hoặc `backend/data_pipeline/vendor/`
(đưa lên Git kèm giấy phép). Chỉ dùng nguồn có trong bảng này. Thêm nguồn mới: ghi đủ một dòng ở đây TRƯỚC khi viết bộ đọc
(`data_pipeline/lib/sources/`). Thiếu thông tin giấy phép thì không dùng.

Không dùng Oxford 3000/5000 hay English Vocabulary Profile làm nguồn sao chép. Định nghĩa, nghĩa tiếng Việt, câu ví dụ do AI
soạn nháp theo `docs/content-style-guide.md` rồi người duyệt (không chép từ điển có bản quyền).

| Nguồn | Phiên bản | Link | Giấy phép | Cách dùng | Ghi công |
|---|---|---|---|---|---|
| CEFR-J Wordlist | Ghi đúng theo file đặt trong `raw/` (bước 01 in ra tên file và phiên bản đọc được; điền lại ô này khi nạp file lần đầu) | https://www.cefr-j.org/download.html | Dùng miễn phí cho nghiên cứu và thương mại với điều kiện trích dẫn đúng. Bản quyền: Tono Laboratory, Tokyo University of Foreign Studies | Chỉ lấy headword, từ loại, nhãn CEFR để chọn từ A1 (bộ đọc `cefrj`). Không lấy nội dung khác | "Danh sách từ dựa trên CEFR-J Wordlist (Tono Laboratory, Tokyo University of Foreign Studies)." |
| CMU Pronouncing Dictionary (cmudict) | Kho `cmusphinx/cmudict`, commit `74790861f652b15e4ac49015a90074ad62a27690` (24/10/2025) | https://github.com/cmusphinx/cmudict | Kiểu BSD 2 điều khoản, © 1993–2015 Carnegie Mellon University (file `vendor/cmudict/LICENSE`, giữ nguyên khi phân phối lại) | Phiên âm IPA en-US: ARPAbet → IPA bằng `data_pipeline/lib/ipa.py` (có test). Từ không có trong cmudict: AI đề xuất, gắn cờ `ipa_unverified` | "Phiên âm dựa trên CMU Pronouncing Dictionary (Carnegie Mellon University)." |

## Dòng ghi công hiển thị trong app

Chân trang (Landing, trang Giới thiệu nguồn dữ liệu): "Danh sách từ dựa trên CEFR-J Wordlist (Tono Laboratory, Tokyo
University of Foreign Studies). Phiên âm dựa trên CMU Pronouncing Dictionary (Carnegie Mellon University)."

## Nguồn để dành (chưa dùng)

- NGSL / NAWL / TSL / BSL (CC BY-SA 4.0): tạm không dùng ở giai đoạn A1 để tránh điều khoản ShareAlike. Bộ đọc nguồn thiết
  kế kiểu cắm thêm nên thêm sau không phải sửa quy trình.
