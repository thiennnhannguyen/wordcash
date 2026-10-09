# Khóa học của tôi

Người dùng tự tạo bộ từ vựng riêng (từ vựng ngành IT, từ trong phim, từ trong bài đọc trên lớp…), thêm từ theo ba cách
(tìm trong kho, tự tạo, nhập nhiều) rồi học bằng đúng phương pháp của WORDCLASH: thẻ học, 4 mức câu hỏi, lặp lại ngắt quãng.
Sau này bộ từ riêng dùng được ở Phòng riêng của Đấu Trường.

Code: `backend/app/models/course.py`, `services/course_service.py`, `services/study_service.py`, `services/course_import.py`,
`api/v1/routers/{courses,study,bank}.py`; frontend `pages/Courses/`, `services/coursesApi.js`.

## 5 quyết định (bắt buộc)

1. **Từ có sẵn trong kho chỉ được liên kết**, không sao chép. Tiến độ dùng chung với Học Viện (cùng một dòng
   `user_entry_progress`), được tính vào rank và lượt quay như bình thường.
2. **Từ tự tạo là mục từ riêng** (`entries.source = user`, `owner_user_id` = người tạo, `status = approved` nhưng chỉ chủ
   sở hữu nhìn thấy). Được học, ôn, có trong danh sách ôn chung, nhưng **không tính rank, không cho lượt quay, không xuất
   hiện ở Cửa Ải Hôm Nay**. Đếm riêng ở `users.custom_mastered_count`; `users.mastered_count` chỉ đếm từ hệ thống.
3. **Bộ từ riêng chỉ dùng ở Phòng riêng** của Đấu Trường, không dùng cho trận xếp hạng (mới chuẩn bị dữ liệu và API,
   chưa có logic trận).
4. **Giới hạn MVP** (trong `core/config.py`): tối đa 50 khóa **đang học** (`COURSE_MAX_ACTIVE`, không tính khóa đã lưu trữ)
   và 100 khóa **đã lưu trữ** (`COURSE_MAX_ARCHIVED`); bỏ lưu trữ khi đã có 50 khóa đang học trả `COURSE_LIMIT_REACHED`
   (`details.scope`: active | archived),
   500 từ/khóa (`COURSE_MAX_WORDS`), 200 dòng/lần nhập (`IMPORT_MAX_ROWS`), 1.000 từ tự tạo/người (`CUSTOM_ENTRY_MAX_PER_USER`).
5. **Khóa học luôn riêng tư.** Cột `visibility` (`private` | `shared`) để sẵn, chưa làm chia sẻ.

## Quy tắc dữ liệu

- Mọi truy vấn `entries` phía người học lọc bằng `Entry.visible_to(user_id)`:
  `(source = system AND status = approved) OR owner_user_id = user hiện tại`.
- Một người không có hai từ tự tạo trùng chữ (không phân biệt hoa thường): unique index `(owner_user_id, lower(headword))`
  chỉ áp cho `source = user`.
- Người dùng chỉ thấy khóa học của chính mình. Khóa học, phiên học, từ tự tạo của người khác trả **404** (không phải 403)
  để không lộ việc chúng tồn tại. Sửa nội dung một từ hệ thống trả `ENTRY_NOT_OWNED` (403).
- Bỏ từ khỏi khóa học không xóa mục từ gốc và tiến độ. Xóa hẳn khóa học (cần `?confirm=true`) cũng vậy: từ tự tạo vẫn
  còn trong danh sách ôn chung. Muốn xóa hẳn một từ tự tạo: `DELETE /custom-entries/{id}`.
- Từ tự tạo mới (hoặc đổi chữ) được xếp vào hàng đợi `audio_jobs` (`pending`). Chưa gọi TTS thật; khi `audio_url` trống,
  frontend đọc bằng Web Speech API ở thẻ học và danh sách từ.

## API (`/api/v1`, mọi route cần đăng nhập)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/courses?archived=false` | Danh sách khóa học kèm `mastered_count`, `due_count`; `mastered_total` (số từ khác nhau đã thuộc trong các khóa đang học), `custom_mastered_count`, `limits` |
| POST | `/courses` | Tạo khóa học `{title, description?, icon, color}` |
| GET / PATCH / DELETE | `/courses/{id}` | Chi tiết (kèm `stats`) / sửa / xóa hẳn (`?confirm=true`) |
| POST | `/courses/{id}/archive`, `/courses/{id}/restore` | Lưu trữ / bỏ lưu trữ |
| GET | `/courses/{id}/stats` | Số từ theo trạng thái, đến hạn ôn, độ chính xác 7 ngày, số từ mới còn lại hôm nay, số từ của 5 chế độ |
| GET | `/courses/{id}/entries?q=&filter=&sort=&page=&page_size=` | `filter`: all, new, learning, mastered, forgotten, starred, due · `sort`: added, alpha, due |
| POST | `/courses/{id}/entries/from-bank` | `{entry_id, personal_note?}`: liên kết từ kho (hoặc từ tự tạo của mình) |
| POST | `/courses/{id}/entries/custom` | `{headword, meaning_vi, pos?, ipa?, example?, note?, image_url?, force?}` |
| POST | `/courses/{id}/entries/reorder` | `{entry_ids: [...]}` |
| PATCH / DELETE | `/courses/{id}/entries/{entry_id}` | Sửa ghi chú, sao (mọi từ) và nội dung (chỉ từ tự tạo) / bỏ khỏi khóa |
| POST | `/courses/{id}/import/preview` | `{text, format: lines \| csv}` → bảng xem trước, chưa lưu |
| POST | `/courses/{id}/import/commit` | `{text, format, skip_lines?}` → lưu trong một transaction |
| GET | `/bank/search?q=&course_id=` | Tối đa 10 từ hệ thống đã duyệt bắt đầu bằng `q` (khớp nguyên từ xếp trước), có CEFR, `in_course` |
| DELETE | `/custom-entries/{id}` | Xóa hẳn từ tự tạo (gỡ khỏi mọi khóa, xóa tiến độ) |
| POST | `/courses/{id}/study-sessions` | `{mode, limit?, entry_ids?}` → thẻ học (learn) + câu hỏi KHÔNG kèm đáp án |
| POST | `/study-sessions/{sid}/answers` | `{answers: [{question_id, answer}]}` → chấm ở server, cập nhật SRS và trạng thái thuộc |

Mã lỗi: `COURSE_NOT_FOUND`, `COURSE_LIMIT_REACHED`, `WORD_LIMIT_REACHED` (`details.scope`: course | custom),
`DUPLICATE_IN_COURSE`, `ENTRY_NOT_FOUND`, `ENTRY_NOT_OWNED`, `SYSTEM_ENTRY_EXISTS` (`details.suggestions`: các từ trong kho),
`CUSTOM_ENTRY_EXISTS` (`details.entry`), `IMPORT_INVALID`, `CONFIRM_REQUIRED`, `NOTHING_TO_STUDY` (`details.reason`: empty |
daily_limit), `STUDY_SESSION_NOT_FOUND`, `STUDY_SESSION_EXPIRED`, `STUDY_SESSION_FINISHED`.

## Chế độ học

| Chế độ | Chọn từ | Câu hỏi |
|---|---|---|
| `learn` Học mới | Từ `new`, tối đa `limit` (mặc định 10) và số từ mới còn lại trong ngày (hạn mức cứng `NEW_WORDS_DAILY_CAP` = 40, tính theo múi giờ người học, chung với Học Viện; mục tiêu ngày không chặn) | Thẻ học, rồi mỗi từ 1 câu mức 1 và 1 câu mức 3/4 |
| `review` Ôn đến hạn | Từ có `due_at` ≤ bây giờ, hạn sớm nhất trước | Mỗi từ 1 câu: từ mới đúng < 2 lần dùng mức 1–2, còn lại mức 3–4 |
| `quick` Ôn nhanh | Cả khóa, trộn ngẫu nhiên | 20 câu, mức ngẫu nhiên; vẫn cập nhật SRS |
| `hard` Từ khó | Từ gắn sao, rồi từ sai nhiều nhất (sai − đúng) | Mức 3–4 |
| `test` Kiểm tra | Cả khóa | 20 câu, có điểm; không mở khóa gì; đáp án chỉ trả khi nộp hết |

- Mỗi cặp (từ, mức) chỉ hỏi một lần trong phiên `quick`/`test`; khóa nhỏ thì phiên có ít hơn 20 câu.
- Mức 2 (nghe) chỉ có khi mục từ có `audio_url` (đọc bằng Web Speech API thì client phải biết chữ, tức là lộ đáp án);
  mức 4 chỉ có khi mục có câu riêng `cloze_en` (chỉ đúng một đáp án hợp) và đúng 3 đáp án nhiễu soạn sẵn `cloze_distractors` đã duyệt — từ tự tạo không có nên luôn lùi về mức 3. Thiếu điều kiện thì lùi về mức 1 / mức 3.
- Đáp án nhiễu ưu tiên nghĩa/từ của các mục khác trong cùng khóa (cùng loại từ nếu đủ); khóa dưới 4 từ lấy thêm từ kho hệ thống.
- `entry_ids` giới hạn phiên vào các từ chỉ định (nút "Ôn lại từ sai").
- Phiên hết hạn sau `STUDY_SESSION_TTL_HOURS` (24 giờ). Gửi lại một câu đã chấm thì nhận lại kết quả cũ, không ghi tiến độ lần hai.

## SRS và "đã thuộc" (dùng chung cho Học Viện)

- `services/srs.py`: SM-2; 5 lần nhớ đầu theo khoảng ôn 1 → 3 → 7 → 16 → 35 ngày, sau đó nhân hệ số dễ. Đúng khi chưa tới
  hạn (ôn sớm) không đẩy lịch. Sai: ôn lại sau 1 ngày, giảm hệ số dễ.
- `services/mastery.py`: đúng ở mức ≥ 3 vào ≥ 3 ngày khác nhau (theo múi giờ người học) → `mastered`.
- **Luật ghi nhớ thống nhất (đã chốt):** chỉ Cửa Ải Hôm Nay được làm mất `mastered`. Ở mọi nơi khác (khóa học, Học Viện,
  Đấu Trường) trả lời sai thì lịch SRS đặt lại (khoảng ôn ngắn nhất, ease giảm theo SM-2, `lapse_count` +1) nhưng giữ `mastered`.

## Nhập hàng loạt

Định dạng `lines`, mỗi dòng một từ:

```
deploy - triển khai
bug: lỗi phần mềm
refactor<TAB>tái cấu trúc mã
well-known - nổi tiếng
# dòng bắt đầu bằng # bị bỏ qua
```

Dấu ngăn cách theo thứ tự ưu tiên: tab, gạch ngang có khoảng trắng hai bên, dấu hai chấm, gạch ngang đầu tiên.

Định dạng `csv`: dòng đầu là header, bắt buộc `word` và `meaning`, tùy chọn `example`, `note`. File mẫu:
`frontend/public/mau-nhap-tu.csv` (nút "Tải file CSV mẫu" trong panel Thêm từ).

```csv
word,meaning,example,note
deploy,triển khai,We deploy every Friday.,IT
pull request,yêu cầu gộp mã,Please review my pull request.,git
plot twist,cú lừa của cốt truyện,The ending had a huge plot twist.,phim
```

Bảng xem trước, mỗi dòng một trạng thái:

| Trạng thái | Nghĩa | Màu |
|---|---|---|
| `new_custom` | Sẽ tạo từ riêng mới | xanh chanh |
| `match_system` | Khớp kho hệ thống, sẽ liên kết (nghĩa gõ vào bị bỏ, dùng nghĩa trong kho; ghi chú vẫn giữ) | tím |
| `match_own` | Khớp một từ bạn đã tự tạo trước đó, sẽ liên kết | tím |

`match_own` là trạng thái thứ 5 (đã duyệt): dòng trùng chữ với một từ người dùng đã tự tạo trước đó thì liên kết lại từ đó
thay vì tạo bản trùng (mỗi người không có hai từ tự tạo cùng chữ).
| `duplicate_in_course` | Đã có trong khóa hoặc lặp lại dòng trước | vàng |
| `invalid` | Lỗi, kèm lý do (thiếu từ/nghĩa, quá dài, vượt giới hạn) | hồng |

Bấm lưu thì server phân loại lại toàn bộ (không tin bảng xem trước từ client) và lưu mọi dòng hợp lệ trong một transaction.

## Điểm đã tự quyết định (chờ duyệt)

- `quick` và `test` cũng cập nhật SRS/mastery; giới hạn 20 từ mới/ngày áp cho chế độ `learn`.
- "Từ của tôi đã thuộc" ở trang `/courses` = số từ khác nhau đã thuộc trong các khóa đang học (gồm cả từ kho).
- Tạo từ tự tạo trùng chữ với kho: trả gợi ý dùng bản trong kho; gửi `force: true` vẫn tạo được từ riêng (vd. "bug" nghĩa IT).
