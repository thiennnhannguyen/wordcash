# game-rules.md

Luật game: sát thương, combo, rank, vòng quay, pity, Cửa Ải Hôm Nay, quy tắc mở khóa.

## Vòng quay: phân bổ 100 linh vật

Nguồn dữ liệu chính: `backend/seeds/data/mascots.json` (seed kiểm tra phân bổ theo `MASCOT_DISTRIBUTION`); bản mock `frontend/src/data/mascots.js` phải khớp (`cd frontend && npm test`).

| Vùng | Thường | Hiếm | Sử Thi | Huyền Thoại | Tổng | Cách nhận |
|---|---|---|---|---|---|---|
| A1 | 8 | 5 | 3 | 1 | 17 | Vòng quay |
| A2 | 8 | 5 | 3 | 1 | 17 | Vòng quay |
| B1 | 7 | 5 | 2 | 1 | 15 | Vòng quay |
| B2 | 7 | 4 | 3 | 1 | 15 | Vòng quay |
| C1 | 6 | 4 | 3 | 1 | 14 | Vòng quay |
| C2 | 6 | 5 | 3 | 1 | 15 | Vòng quay |
| Đặc biệt | 3 | 2 | 1 | 1 | 7 | Thành tích |
| **Tổng** | **45** | **30** | **18** | **7** | **100** | |

- Mỗi vùng A1–C2 có đúng 1 Huyền Thoại: "con của Boss" vùng đó.
- `obtain`: `gacha` cho mọi linh vật theo vùng, `achievement` cho 7 linh vật Đặc biệt. Vòng quay và đổi mảnh **không bao giờ** trả linh vật `achievement`.
- Ô `coming_soon` (#031–#100, chưa có tên) không bao giờ ra từ vòng quay hay đổi mảnh.
- Vòng quay: server quay độ hiếm theo tỉ lệ công khai (có pity), rồi chọn một linh vật thuộc các vùng người dùng **đã mở**. Trong cùng một độ hiếm, các con có khả năng ra ngang nhau. Độ hiếm đó chưa có con nào trong các vùng đã mở thì hạ dần xuống độ hiếm thấp hơn, tới Thường vẫn trống thì thử lần lượt lên trên (đã chốt, quyết định 5 bên dưới).

## Học Viện: các quyết định đã chốt (04/10/2026)

Chi tiết cài đặt, API, mã lỗi: `docs/academy.md`. Hằng số trong `backend/app/core/config.py`.

1. **Mở khóa tuần tự**: bài trong chặng và chặng trong cấp mở lần lượt; không được chọn thứ tự. Đã mở thì không khóa lại.
2. **Ngưỡng**: qua bài ≥ 80% (`UNIT_PASS_RATE`), qua bài tổng hợp chặng ≥ 80% (`TOPIC_PASS_RATE`), thắng Boss ≥ 85% (`BOSS_PASS_RATE`).
3. **Ngày** tính theo múi giờ của người dùng (`users.timezone`), cho Cửa Ải, streak, giới hạn từ mới và "ngày khác nhau" của luật đã thuộc.
4. **Trận Boss** 50 câu trộn đều mọi chặng. Thua → 2 chặng yếu nhất; được đánh lại khi đã chờ 12 giờ **hoặc** đã luyện xong
   (trả lời hết câu) mọi chặng yếu của lần thua gần nhất. Lần đầu thắng mỗi cấp +1 lượt quay đặc biệt.
5. **Cửa Ải Hôm Nay**: 2–5 từ hệ thống đã học, chỉ câu mức 3 (gõ từ) và mức 4 (điền câu), ưu tiên từ đến hạn ôn và trộn
   2 từ ngẫu nhiên. Dưới 2 từ hệ thống đã học → được miễn hôm đó. Chặn mọi trang trong app cho tới khi xong. Server chặn
   (`DAILY_CHECK_REQUIRED`) mọi route bắt đầu phiên học, Đấu Trường, và quay thẻ / đổi mảnh (`POST /collection/spins`,
   `/collection/exchange`); các route chỉ đọc vẫn mở.
6. **Chỉ Cửa Ải làm mất "đã thuộc"**: sai → từ thành `forgotten`, số từ thuộc −1 (`DAILY_FORGET_PENALTY`), vào ôn gấp.
   Ôn tập, kiểm tra, Boss, Khóa học, Đấu Trường trả lời sai chỉ đặt lại lịch SRS.
7. **Streak**: đúng hết +1; có câu sai hoặc được miễn thì giữ nguyên; bỏ trọn một ngày thì về 0. Mỗi bội số của 7 (7, 14…) +1 lượt quay thường.
   Streak hiển thị ở mọi nơi là **streak hiệu lực** (`effective_streak`): ngày cuối còn sống trước hôm qua thì là 0.
8. **Rank** theo số từ hệ thống đã thuộc (0 / 100 / 300 / 600 / 1.000 / 2.000 / 3.500 / 5.000). Rơi dưới mốc → lung lay 3 ngày,
   gỡ lại kịp thì giữ rank, quá hạn thì hạ theo số từ lúc đó. Lần đầu đạt mỗi rank +1 lượt đặc biệt.
9. **Lượt quay** ghi sổ `spin_grants` (duy nhất theo người, lý do, mốc); lượt theo số từ (mỗi 50) chỉ cấp khi vượt mốc cao
   nhất từng đạt (`max_spin_milestone`), nên mất từ rồi thuộc lại không được lượt mới.
10. **Từ tự tạo** không tính rank, lượt quay, Cửa Ải hay Hộ chiếu. **Hộ chiếu** đếm mỗi chặng + Boss của các cấp đang có
    trong DB (hiện 22).
11. **Từ mới mỗi ngày** (chốt 05/10/2026, bỏ hạn mức 10/10/2026): **không giới hạn** số từ mới trong ngày (Học Viện và Khóa học).
    Mục tiêu ngày theo thời lượng (10/12/15/20 từ) chỉ để hiển thị, động viên; học vượt 3 lần mục tiêu ngày (`NEW_WORDS_NUDGE_FACTOR`, `/me/stats` → `today.new_words_nudge_at`) thì frontend hiện một toast nhắc ôn duy nhất trong ngày: "Bạn học nhiều quá trời! Nhớ ôn lại vào những ngày tới để không quên nhé." (không chặn, không chuyển trang).
    "Đã thuộc" vẫn cần đúng ở mức ≥ 3 vào ≥ 3 ngày khác nhau, nên học dồn một ngày không thành thuộc.
12. **Luyện chặng yếu** là bài luyện: đáp án chỉ trả về theo từng câu sau khi nộp câu đó, không gửi kèm khi tạo phiên.
13. **Ngoài phạm vi** giai đoạn này: nhánh IELTS/TOEIC (trả "Sắp ra mắt"), kiểm tra xếp lớp, Đấu Trường. (Vòng quay đã làm ở phần Bộ Sưu Tập bên dưới.)

## Bộ Sưu Tập & vòng quay: các quyết định đã chốt (05/10/2026)

Chi tiết cài đặt, luồng quay, API, mã lỗi: `docs/collection.md`. Hằng số trong `backend/app/core/config.py`.

1. **Danh mục** 100 linh vật theo bảng phân bổ ở đầu file; mỗi con có `status` (released | coming_soon) và `obtain`.
   Ba linh vật khởi đầu #001–#003 lưu `obtain = gacha` + cờ `is_starter` (cách gọn nhất): vẫn nằm trong vòng quay.
2. **Tỉ lệ lượt thường**: Thường 60% · Hiếm 28% · Sử Thi 10% · Huyền Thoại 2% (`GACHA_RATES_NORMAL`).
3. **Tỉ lệ lượt đặc biệt**: Thường 0% · Hiếm 70% · Sử Thi 24% · Huyền Thoại 6% (`GACHA_RATES_SPECIAL`).
4. **Pool**: chỉ linh vật `released`, nhận qua gacha, thuộc vùng đã mở (cấp có tiến độ unlocked hoặc completed); cùng độ hiếm thì
   ngang xác suất; `achievement` và `coming_soon` không bao giờ quay ra.
5. **Hạ bậc**: độ hiếm rơi trúng mà pool không có con nào → hạ dần xuống; tới Thường vẫn trống thì thử lần lượt lên trên.
   Ghi `rarity_fallback` trong lịch sử.
6. **Pity**: `pity_counter` tính trên mọi lượt (thường và đặc biệt); ra Sử Thi hoặc Huyền Thoại thì về 0; đạt 20 (`PITY_EPIC`)
   thì lượt kế chắc chắn Sử Thi, nếu tỉ lệ gốc đã ra Huyền Thoại thì giữ Huyền Thoại.
7. **Thẻ trùng** đổi thành mảnh: Thường +2 · Hiếm +4 · Sử Thi +8 · Huyền Thoại +20; vẫn tăng số bản sở hữu (`copies`).
8. **Đổi mảnh**: Thường 20 · Hiếm 40 · Sử Thi 60 · Huyền Thoại 150; chỉ linh vật chưa sở hữu, released, nhận qua gacha, vùng đã mở.
9. **Lượt quay không hết hạn**. "Mở tất cả" tối đa 10 lượt mỗi lần, cùng một loại lượt.
10. **Linh vật khởi đầu** chọn ở onboarding được sở hữu ngay (source = starter); người dùng cũ được bù bằng migration dữ liệu.
11. **Avatar và linh vật Đấu Trường** chỉ được chọn linh vật đang sở hữu (`MASCOT_NOT_OWNED`); `arena_mascot_id = null` thì dùng avatar.
12. **Linh vật chỉ để trang trí**: không có chỉ số sức mạnh, không ảnh hưởng luật game.
13. **Không bán lượt quay** (hay mảnh) bằng tiền. Tỉ lệ luôn công khai qua `GET /collection/rates` và trên giao diện.
