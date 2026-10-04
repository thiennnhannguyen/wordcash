# game-rules.md

Luật game: sát thương, combo, rank, vòng quay, pity, Cửa Ải Hôm Nay, quy tắc mở khóa.

## Vòng quay: phân bổ 100 linh vật

Nguồn dữ liệu: `frontend/src/data/mascots.js` (`DISTRIBUTION`). Kiểm tra tự động: `cd frontend && npm test`.

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
- Vòng quay: server quay độ hiếm theo tỉ lệ công khai (có pity), rồi chọn một linh vật thuộc các vùng người dùng **đã mở**. Trong cùng một độ hiếm, các con có khả năng ra ngang nhau. Độ hiếm đó chưa có con nào trong các vùng đã mở thì hạ xuống độ hiếm thấp hơn (đặt tạm).

## Học Viện: các quyết định đã chốt (04/10/2026)

Chi tiết cài đặt, API, mã lỗi: `docs/academy.md`. Hằng số trong `backend/app/core/config.py`.

1. **Mở khóa tuần tự**: bài trong chặng và chặng trong cấp mở lần lượt; không được chọn thứ tự. Đã mở thì không khóa lại.
2. **Ngưỡng**: qua bài ≥ 80% (`UNIT_PASS_RATE`), qua bài tổng hợp chặng ≥ 80% (`TOPIC_PASS_RATE`), thắng Boss ≥ 85% (`BOSS_PASS_RATE`).
3. **Ngày** tính theo múi giờ của người dùng (`users.timezone`), cho Cửa Ải, streak, giới hạn từ mới và "ngày khác nhau" của luật đã thuộc.
4. **Trận Boss** 50 câu trộn đều mọi chặng. Thua → 2 chặng yếu nhất; được đánh lại khi đã chờ 12 giờ **hoặc** đã luyện xong
   (trả lời hết câu) mọi chặng yếu của lần thua gần nhất. Lần đầu thắng mỗi cấp +1 lượt quay đặc biệt.
5. **Cửa Ải Hôm Nay**: 2–5 từ hệ thống đã học, chỉ câu mức 3 (gõ từ) và mức 4 (điền câu), ưu tiên từ đến hạn ôn và trộn
   2 từ ngẫu nhiên. Dưới 2 từ hệ thống đã học → được miễn hôm đó. Chặn mọi trang trong app cho tới khi xong.
6. **Chỉ Cửa Ải làm mất "đã thuộc"**: sai → từ thành `forgotten`, số từ thuộc −1 (`DAILY_FORGET_PENALTY`), vào ôn gấp.
   Ôn tập, kiểm tra, Boss, Khóa học, Đấu Trường trả lời sai chỉ đặt lại lịch SRS.
7. **Streak**: đúng hết +1; có câu sai hoặc được miễn thì giữ nguyên; bỏ trọn một ngày thì về 0. Mỗi bội số của 7 (7, 14…) +1 lượt quay thường.
8. **Rank** theo số từ hệ thống đã thuộc (0 / 100 / 300 / 600 / 1.000 / 2.000 / 3.500 / 5.000). Rơi dưới mốc → lung lay 3 ngày,
   gỡ lại kịp thì giữ rank, quá hạn thì hạ theo số từ lúc đó. Lần đầu đạt mỗi rank +1 lượt đặc biệt.
9. **Lượt quay** ghi sổ `spin_grants` (duy nhất theo người, lý do, mốc); lượt theo số từ (mỗi 50) chỉ cấp khi vượt mốc cao
   nhất từng đạt (`max_spin_milestone`), nên mất từ rồi thuộc lại không được lượt mới.
10. **Từ tự tạo** không tính rank, lượt quay, Cửa Ải hay Hộ chiếu. **Hộ chiếu** đếm mỗi chặng + Boss của các cấp đang có
    trong DB (hiện 22).
11. **Ngoài phạm vi** giai đoạn này: nhánh IELTS/TOEIC (trả "Sắp ra mắt"), kiểm tra xếp lớp, logic vòng quay, Đấu Trường.
