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
