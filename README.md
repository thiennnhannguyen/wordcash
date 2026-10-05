# WORDCLASH

Website học từ vựng kiểu game đối kháng. Bộ khung dự án này mới chỉ có cấu trúc thư mục và file; mỗi file chứa ghi chú mô tả nhiệm vụ và danh sách TODO, chưa có code.

## Hai khu chính

- **Học Viện**: học theo lộ trình A1–C2 từ kho khoảng 10.000 mục từ, ôn lặp lại ngắt quãng, Cửa Ải Hôm Nay.
- **Đấu Trường**: ghép trận đối kháng thời gian thực, ai đúng và nhanh hơn thì bắn trừ máu đối thủ.
- **Khóa học của tôi**: người học tự tạo bộ từ riêng (từ trong kho hoặc tự tạo) và học bằng thẻ học, 4 mức câu hỏi, SRS (xem `docs/courses.md`).

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | React (Vite), Tailwind, Framer Motion, Zustand, Socket.IO client, Howler, Lottie |
| Backend | FastAPI, Uvicorn, SQLAlchemy 2.0 async (asyncpg), Alembic, python-socketio (ASGI), PyJWT |
| Dữ liệu | PostgreSQL (lâu dài), Redis (hàng chờ ghép trận, trạng thái trận) |
| Kho từ | Python, pandas, TTS (thư mục backend/data_pipeline) |

## Cách tổ chức backend

- `api/v1/routers/` chỉ nhận yêu cầu (kiểm tra bằng schema Pydantic trong `schemas/`) và trả kết quả.
- `services/` chứa toàn bộ logic nghiệp vụ (SRS, mở khóa, rank, vòng quay...).
- `game/` chứa phần Đấu Trường chạy qua WebSocket; server luôn là trọng tài.
- `models/` định nghĩa bảng dữ liệu.

## Cấu trúc thư mục

```
wordclash/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── routers/
│   │   │   │   │   ├── academy.py
│   │   │   │   │   ├── arena.py
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── daily_check.py
│   │   │   │   │   ├── health.py
│   │   │   │   │   ├── leaderboard.py
│   │   │   │   │   ├── mascots.py
│   │   │   │   │   ├── placement.py
│   │   │   │   │   ├── profile.py
│   │   │   │   │   ├── review.py
│   │   │   │   │   └── users.py
│   │   │   │   └── __init__.py
│   │   │   ├── cookies.py
│   │   │   ├── deps.py
│   │   │   └── responses.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── errors.py
│   │   │   ├── redis.py
│   │   │   └── security.py
│   │   ├── game/
│   │   │   ├── __init__.py
│   │   │   ├── bot.py
│   │   │   ├── events.py
│   │   │   ├── match_room.py
│   │   │   ├── matchmaking.py
│   │   │   ├── question_picker.py
│   │   │   ├── scoring.py
│   │   │   ├── sio_server.py
│   │   │   └── timing.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── daily_check.py
│   │   │   ├── mascot.py
│   │   │   ├── match.py
│   │   │   ├── progress.py
│   │   │   ├── refresh_token.py
│   │   │   ├── user.py
│   │   │   └── vocabulary.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── common.py
│   │   │   └── user.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── certificate.py
│   │   │   ├── daily_check.py
│   │   │   ├── gacha.py
│   │   │   ├── mastery.py
│   │   │   ├── placement.py
│   │   │   ├── question_builder.py
│   │   │   ├── rank.py
│   │   │   ├── rate_limit.py
│   │   │   ├── srs.py
│   │   │   ├── streak.py
│   │   │   ├── system.py
│   │   │   └── unlock.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── responses.py
│   │   │   └── time.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── data_pipeline/
│   │   ├── processed/
│   │   ├── raw/
│   │   ├── reviewed/
│   │   ├── 01_import_wordlist.py
│   │   ├── 02_tag_levels_topics.py
│   │   ├── 03_enrich_entries.py
│   │   ├── 04_generate_audio.py
│   │   ├── 05_review_export.py
│   │   ├── 06_build_units.py
│   │   ├── 07_load_to_db.py
│   │   └── README.md
│   ├── seeds/
│   │   ├── seed_landmarks.py
│   │   ├── seed_mascots.py
│   │   └── seed_sample_units.py
│   ├── tests/
│   │   ├── api/
│   │   │   ├── test_auth_api.py
│   │   │   └── test_socket.py
│   │   ├── integration/
│   │   │   ├── test_auth_service.py
│   │   │   └── test_rate_limit.py
│   │   ├── unit/
│   │   │   ├── test_errors.py
│   │   │   ├── test_gacha.py
│   │   │   ├── test_mastery.py
│   │   │   ├── test_rank.py
│   │   │   ├── test_schemas.py
│   │   │   ├── test_scoring.py
│   │   │   ├── test_security.py
│   │   │   ├── test_srs.py
│   │   │   └── test_unlock.py
│   │   └── conftest.py
│   ├── alembic.ini
│   ├── pytest.ini
│   └── requirements.txt
├── docker/
│   └── postgres/
│       └── init.sql
├── docs/
│   ├── api.md
│   ├── auth.md
│   ├── bao-cao-y-tuong.md
│   ├── database.md
│   ├── game-rules.md
│   └── socket-events.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── logo/
│   │   │   ├── lottie/
│   │   │   ├── mascots/
│   │   │   └── sounds/
│   │   ├── components/
│   │   │   ├── academy/
│   │   │   │   ├── LevelHeader.jsx
│   │   │   │   ├── QuestionView.jsx
│   │   │   │   ├── RoadmapNode.jsx
│   │   │   │   └── WordCard.jsx
│   │   │   ├── collection/
│   │   │   │   ├── MascotCard.jsx
│   │   │   │   └── SpinWheel.jsx
│   │   │   ├── game/
│   │   │   │   ├── AnswerOptions.jsx
│   │   │   │   ├── BulletEffect.jsx
│   │   │   │   ├── ComboMeter.jsx
│   │   │   │   ├── CountdownTimer.jsx
│   │   │   │   ├── HealthBar.jsx
│   │   │   │   ├── MascotFighter.jsx
│   │   │   │   └── WordTicker.jsx
│   │   │   ├── layout/
│   │   │   │   ├── NavBar.jsx
│   │   │   │   └── PageShell.jsx
│   │   │   └── ui/
│   │   │       ├── Button.jsx
│   │   │       ├── Card.jsx
│   │   │       ├── Icon.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── ProgressBar.jsx
│   │   │       └── RankBadge.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useDailyCheck.js
│   │   │   ├── useSocket.js
│   │   │   └── useSound.js
│   │   ├── pages/
│   │   │   ├── Academy/
│   │   │   │   ├── BossBattle.jsx
│   │   │   │   ├── Lesson.jsx
│   │   │   │   ├── PlacementTest.jsx
│   │   │   │   ├── Review.jsx
│   │   │   │   ├── RoadmapMap.jsx
│   │   │   │   └── UnitTest.jsx
│   │   │   ├── Arena/
│   │   │   │   ├── ArenaLobby.jsx
│   │   │   │   ├── Battle.jsx
│   │   │   │   ├── Matchmaking.jsx
│   │   │   │   └── MatchResult.jsx
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Collection/
│   │   │   │   ├── Album.jsx
│   │   │   │   └── GachaSpin.jsx
│   │   │   ├── DailyCheck/
│   │   │   │   └── DailyCheck.jsx
│   │   │   ├── Leaderboard/
│   │   │   │   └── Leaderboard.jsx
│   │   │   ├── Lobby/
│   │   │   │   └── Lobby.jsx
│   │   │   └── Profile/
│   │   │       ├── Certificate.jsx
│   │   │       └── Profile.jsx
│   │   ├── services/
│   │   │   ├── academyApi.js
│   │   │   ├── api.js
│   │   │   ├── profileApi.js
│   │   │   └── socket.js
│   │   ├── store/
│   │   │   ├── academyStore.js
│   │   │   ├── authStore.js
│   │   │   └── battleStore.js
│   │   ├── styles/
│   │   │   ├── animations.css
│   │   │   ├── globals.css
│   │   │   └── tokens.css
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   └── format.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── routes.jsx
│   └── README.md
├── .env.example
├── .gitignore
└── docker-compose.yml
```

## Thứ tự gợi ý khi bắt đầu code

1. `docker-compose.yml`, `.env`, `backend/app/core/config.py`, `backend/app/main.py`
2. `models/` và `docs/database.md`
3. Đăng nhập (`api/v1/routers/auth.py`) và trang Login/Register
4. Một bài học A1 mẫu (`seeds/seed_sample_units.py`) và trang `Academy/Lesson.jsx`
5. `services/srs.py`, `mastery.py`, `unlock.py` kèm test
6. Cửa Ải Hôm Nay và rank
7. Vòng quay, album linh vật
8. Đấu Trường: phòng riêng bằng mã trước, ghép trận sau

# WORDCLASH

> **Học từ như đánh trận.**
> Website học từ vựng tiếng Anh theo kiểu game đối kháng dành cho người Việt Gen Z.

Tác giả: Nguyễn Thiện Nhân · Phiên bản ý tưởng: 1.1 · Cập nhật: 30/09/2026
Tên dự án là tên tạm, có thể thay đổi.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc sản phẩm](#2-cấu-trúc-sản-phẩm)
3. [Phương pháp học](#3-phương-pháp-học)
4. [Kho từ vựng và lộ trình học](#4-kho-từ-vựng-và-lộ-trình-học)
5. [Cửa Ải Hôm Nay](#5-cửa-ải-hôm-nay)
6. [Rank](#6-rank)
7. [Linh vật và vòng quay](#7-linh-vật-và-vòng-quay)
8. [Đấu Trường (PvP)](#8-đấu-trường-pvp)
9. [Giao diện và nhận diện](#9-giao-diện-và-nhận-diện)
10. [Công nghệ](#10-công-nghệ)
11. [Cấu trúc thư mục](#11-cấu-trúc-thư-mục)
12. [Cơ sở dữ liệu](#12-cơ-sở-dữ-liệu)
13. [Quy trình xây kho từ](#13-quy-trình-xây-kho-từ)
14. [Lộ trình phát triển](#14-lộ-trình-phát-triển)
15. [Rủi ro](#15-rủi-ro)
16. [Chỉ số thành công](#16-chỉ-số-thành-công)
17. [Câu hỏi còn bỏ ngỏ](#17-câu-hỏi-còn-bỏ-ngỏ)
18. [Hiện trạng dự án](#18-hiện-trạng-dự-án)

---

## 1. Tổng quan

### Vấn đề
- **Nhàm chán:** học bằng danh sách hoặc flashcard đơn điệu, thiếu động lực quay lại.
- **Học trước quên sau:** không có lịch ôn khoa học.
- **Thiếu thước đo:** không biết mình thật sự đã thuộc bao nhiêu từ.

### Giải pháp
Kết hợp phương pháp ghi nhớ khoa học với game đối kháng online. Người dùng học từ theo lộ trình, hệ thống nhắc ôn đúng lúc, rồi dùng vốn từ đó để "bắn hạ" đối thủ trong trận đấu thời gian thực. Số từ đã thuộc quyết định rank; mỗi mốc học tập được thưởng lượt quay thẻ linh vật.

**Ý tưởng cốt lõi:** mỗi trận đấu là một buổi ôn tập trá hình. Thắng nhờ vốn từ thật; mọi phần thưởng gắn với việc học chứ không gắn với thời gian chơi.

### Điểm khác biệt
- Kho khoảng 10.000 mục từ (từ đơn, cụm từ, thành ngữ) chia theo 6 cấp A1–C2, học theo lộ trình mở khóa, phục vụ IELTS, TOEIC.
- Đối kháng thời gian thực: cùng câu hỏi, ai đúng và nhanh hơn thì bắn trừ máu đối phương.
- Rank tính theo số từ thật sự đã thuộc.
- Bài kiểm tra bắt buộc mỗi ngày; quên từ bị trừ điểm, có thể tụt rank.
- 100 linh vật do tác giả tự thiết kế.

### Người dùng mục tiêu
| Nhóm | Nhu cầu |
|---|---|
| Học sinh, sinh viên 16–24 tuổi | Học vui, chơi cùng bạn bè, thích cạnh tranh |
| Người ôn IELTS/TOEIC | Bộ từ theo kỳ thi, theo dõi tiến độ |
| Người đi làm | Phiên học ngắn 5–10 phút mỗi ngày |

---

## 2. Cấu trúc sản phẩm

| Khu | Mục đích | Tính năng |
|---|---|---|
| **Học Viện** | Học và ôn theo lộ trình | Lộ trình A1–C2, học theo từ/cụm/họ từ/ngữ cảnh, ôn SRS, Cửa Ải Hôm Nay, kiểm tra xếp lớp |
| **Đấu Trường** | Thi đấu đối kháng | Ghép trận theo rank, phòng riêng bằng mã, bảng xếp hạng |
| **Bộ Sưu Tập và Hồ Sơ** | Thể hiện thành tích | Rank, thẻ chứng nhận, album linh vật, vòng quay, streak |
| **Khóa học của tôi** | Bộ từ vựng tự tạo (từ ngành IT, từ trong phim, từ trên lớp…) | Thêm từ từ kho (chỉ liên kết, tiến độ chung với Học Viện) hoặc tự tạo; nhập hàng loạt; 5 chế độ học (học mới, ôn đến hạn, ôn nhanh, từ khó, kiểm tra); dùng ở Phòng riêng của Đấu Trường. Từ tự tạo không tính rank, lượt quay, Cửa Ải. Chi tiết: `docs/courses.md` |

**Nguyên tắc liên kết:** Học Viện tạo ra vốn từ, Đấu Trường sử dụng vốn từ. Câu hỏi trong trận chỉ lấy từ các cấp độ mà **cả hai người chơi đều đã mở khóa**.

**Luồng mở web mỗi ngày:** Đăng nhập → Cửa Ải Hôm Nay (bắt buộc, lần đầu trong ngày) → Sảnh chính → Học Viện / Đấu Trường / Bộ Sưu Tập / Hồ Sơ.

---

## 3. Phương pháp học

| Nguyên tắc | Áp dụng |
|---|---|
| Lặp lại ngắt quãng (SRS) | Mỗi từ có lịch ôn riêng: 1 → 3 → 7 → 16 → 35 ngày. Bắt đầu với SM-2, sau nâng lên FSRS |
| Chủ động nhớ lại | Mọi hoạt động đều là câu hỏi; trận đấu là bài kiểm tra |
| Mã hóa kép | Mỗi từ có ảnh, phát âm, câu ví dụ |
| Độ khó tăng dần | 4 mức câu hỏi |
| Giới hạn học mới | Tối đa 10–20 từ mới mỗi ngày |

### 4 mức câu hỏi
1. **Nhận diện:** nhìn từ, chọn nghĩa (4 đáp án).
2. **Nghe:** nghe phát âm, chọn từ.
3. **Nhớ lại:** nhìn nghĩa, gõ từ tiếng Anh.
4. **Ngữ cảnh:** điền từ vào chỗ trống trong câu.

### Định nghĩa "đã thuộc"
Một mục từ **đã thuộc** khi người học trả lời đúng ở **mức 3 trở lên**, vào **ít nhất 3 ngày khác nhau**.

### Trạng thái mục từ
`new` (chưa học) → `learning` (đang học) → `mastered` (đã thuộc) → `forgotten` (đã quên, quay lại `learning` khi ôn)

---

## 4. Kho từ vựng và lộ trình học

### Phân bố theo cấp (CEFR)
| Cấp | Mô tả | Số mục | Tham khảo kỳ thi |
|---|---|---|---|
| A1 | Mới bắt đầu | 800 | Giao tiếp cơ bản |
| A2 | Sơ cấp | 1.200 | TOEIC khoảng 250–450 |
| B1 | Trung cấp | 2.000 | IELTS 4.0–5.0 · TOEIC khoảng 550–780 |
| B2 | Trung cao cấp | 2.500 | IELTS 5.5–6.5 · TOEIC khoảng 785–940 |
| C1 | Cao cấp | 2.000 | IELTS 7.0–8.0 · TOEIC 945+ |
| C2 | Thành thạo | 1.500 | IELTS 8.5–9.0 |
| **Tổng** | | **10.000** | |

Mức điểm thi chỉ mang tính tham khảo.

### Loại mục từ
| Loại | Mã | Ví dụ | Tỉ lệ |
|---|---|---|---|
| Từ đơn | `word` | environment, reliable | 65% |
| Cụm cố định | `collocation` | make a decision | 20% |
| Cụm động từ | `phrasal_verb` | look forward to | 10% |
| Thành ngữ | `idiom` | a piece of cake | 5% |

### Chế độ học trong mỗi bài
- **Theo từ:** phát âm, nghĩa, hình, ví dụ.
- **Theo cụm:** học từ trong cụm đi kèm tự nhiên.
- **Theo họ từ:** decide – decision – decisive – decisively.
- **Trong ngữ cảnh:** đọc đoạn văn ngắn chứa các mục từ rồi trả lời câu hỏi.

### Cấu trúc lộ trình (hiển thị như bản đồ các trạm)
```
Cấp độ (A1 → C2)
 └── Chặng chủ đề (vd. B1: Công việc, Sức khỏe, Môi trường…)
      └── Bài học (15–20 mục từ, vd. "Phỏng vấn xin việc")
           └── Mục từ
```
- Cuối mỗi chặng: bài kiểm tra tổng hợp.
- Cuối mỗi cấp: **Trận Boss**.
- **Ba nhánh:** Nền tảng (chính), IELTS, TOEIC. Các nhánh dùng chung từ cốt lõi; một từ đã thuộc ở nhánh này được tính luôn ở nhánh kia.

### Quy tắc mở khóa
| Muốn mở | Điều kiện |
|---|---|
| Bài tiếp theo | Hoàn thành bài hiện tại và đạt ≥ 80% bài kiểm tra cuối bài |
| Chặng tiếp theo | Hoàn thành mọi bài của chặng và đạt bài kiểm tra tổng hợp |
| Cấp tiếp theo | Vượt Trận Boss (khoảng 50 câu trộn, đạt ≥ 85%) |

- **Kiểm tra xếp lớp:** bài thích ứng khoảng 40 câu, mở thẳng tới cấp phù hợp. Từ ở các cấp được bỏ qua **chưa tính là đã thuộc** cho tới khi được kiểm tra.
- **Không khóa lại:** phần đã mở giữ nguyên; từ bị quên chỉ quay về danh sách ôn.

### Dữ liệu một mục từ
| Trường | Ví dụ |
|---|---|
| headword, entry_type | environment · word |
| pos (từ loại) | noun |
| ipa, audio_url | /ɪnˈvaɪrənmənt/ · file phát âm |
| meaning_vi | môi trường |
| definition_en | tự viết, ngắn, phù hợp cấp độ |
| example | We must protect the environment for future generations. |
| collocations | protect the environment, working environment |
| word_family | environmental, environmentally |
| synonyms / antonyms | surroundings |
| cefr, topic, exam_tags | B1 · Môi trường · IELTS, TOEIC |
| image_url | ảnh hoặc icon |
| status | `draft` hoặc `approved` (chỉ `approved` hiện cho người học) |

---

## 5. Cửa Ải Hôm Nay

Lần đầu mở web trong ngày, người dùng **bắt buộc** làm bài kiểm tra trước khi vào Sảnh.

- **Số câu:** 2–5 từ lấy trong các từ đã học. Ưu tiên từ sắp đến hạn ôn, trộn thêm một phần ngẫu nhiên.
- **Trả lời sai:** từ chuyển sang `forgotten`, số từ thuộc bị trừ (mặc định −1, còn cân nhắc), từ vào danh sách ôn gấp.
- **Vùng đệm tụt rank:** khi số từ rơi dưới mốc rank hiện tại, người dùng có **3 ngày** để gỡ lại trước khi bị tụt rank thật; trong thời gian này huy hiệu hiện trạng thái "lung lay".
- **Trả lời đúng hết:** streak +1. Đạt streak 7 ngày được tặng 1 lượt quay.
- "Ngày" tính theo **múi giờ của người dùng**.

---

## 6. Rank

| Rank | Số từ đã thuộc | Màu |
|---|---|---|
| Tân Binh | 0 – 99 | Xám |
| Đồng | 100 – 299 | Nâu cam |
| Bạc | 300 – 599 | Bạc |
| Vàng | 600 – 999 | Vàng |
| Bạch Kim | 1.000 – 1.999 | Xanh ngọc |
| Kim Cương | 2.000 – 3.499 | Xanh dương |
| Cao Thủ | 3.500 – 4.999 | Tím |
| Huyền Thoại | 5.000+ | Gradient cầu vồng |

Mỗi lần lên rank, người dùng nhận **thẻ chứng nhận** (tải về hoặc chia sẻ được), ghi tên, rank, số từ đã thuộc và linh vật nổi bật nhất.

---

## 7. Linh vật và vòng quay

- **Lượt quay:** mỗi 50 từ thuộc được 1 lượt. Mốc lên rank được lượt quay đặc biệt có tỉ lệ ra thẻ hiếm cao hơn. Streak 7 ngày được 1 lượt.
- **100 linh vật** do tác giả tự thiết kế:

| Độ hiếm | Số lượng | Tỉ lệ ra |
|---|---|---|
| Thường | 45 | 60% |
| Hiếm | 30 | 28% |
| Sử Thi | 18 | 10% |
| Huyền Thoại | 7 | 2% |

- **Pity:** sau 20 lượt liên tiếp không ra thẻ Sử Thi, lượt tiếp theo chắc chắn ra Sử Thi.
- **Thẻ trùng:** đổi thành mảnh; đủ mảnh thì tự chọn một linh vật.
- **Album:** 100 ô; ô chưa sở hữu hiện bóng đen.
- **Công bằng:** linh vật chỉ dùng làm nhân vật trong trận và avatar, **không tăng sức mạnh**.
- Khi ra mắt có thể chỉ có 20–30 linh vật, bổ sung dần theo mùa.

---

## 8. Đấu Trường (PvP)

### Luồng một trận
1. Bấm **Tìm trận** (ghép với người cùng rank) hoặc **tạo/vào phòng riêng bằng mã**.
2. Câu hỏi lấy từ các cấp mà cả hai đều đã mở khóa; phòng riêng có thể chọn cấp cụ thể.
3. Màn hình: từ vựng chạy phía trên, hai linh vật đứng hai bên, mỗi bên **100 HP**.
4. Cả hai nhận cùng câu hỏi; ai đúng trước thì bắn trúng đối phương.
5. Trận kết thúc khi một bên hết máu hoặc sau **20 câu** (khi đó so máu còn lại).
6. Sau trận có màn **"Từ bạn đã sai"** để ôn lại ngay.

### Luật sát thương
| Tình huống | Hiệu ứng |
|---|---|
| Đúng | 10 sát thương |
| Đúng trong < 2 giây | +5 sát thương |
| Đúng 3 câu liên tiếp | Phát bắn tiếp theo x1.5 ("chí mạng") |
| Sai | Tự mất 5 HP |
| Cả hai sai hoặc hết giờ | Không ai mất máu, từ được đánh dấu để ôn |

### Nguyên tắc "server là trọng tài"
- Mọi phép tính đúng/sai, sát thương, thời gian đều thực hiện trên server.
- **Không gửi đáp án đúng xuống client** trước khi lượt kết thúc.
- Thời gian tính ở server: đáp án đúng nào đến server trước thì thắng lượt. Giai đoạn sau bổ sung đo ping để bù trễ.
- Trạng thái trận đang đấu lưu trong Redis; chỉ ghi vào PostgreSQL khi trận kết thúc.

### Sự kiện Socket.IO
| Sự kiện | Chiều | Nội dung |
|---|---|---|
| `join_queue` / `leave_queue` | Client → Server | Vào/rời hàng chờ |
| `create_room` / `join_room` | Client → Server | Phòng riêng bằng mã |
| `match_found` | Server → cả 2 | Thông tin đối thủ, mã phòng |
| `round_start` | Server → cả 2 | Từ, 4 đáp án, mã câu, thời hạn |
| `submit_answer` | Client → Server | Mã câu, đáp án đã chọn |
| `round_result` | Server → cả 2 | Người thắng lượt, sát thương, máu còn lại |
| `match_end` | Server → cả 2 | Kết quả, danh sách từ đã sai |

Giai đoạn sau: thêm đối thủ máy (bot) khi không ghép được người.

---

## 9. Giao diện và nhận diện

### Phong cách
Như một trò chơi điện tử đơn giản, hiện đại. Dark mode, điểm nhấn neon, neo-brutalism nhẹ: bo góc 16–24px, viền 2px, bóng đổ cứng lệch 4px. Nút bấm lún xuống khi nhấn. Rung màn hình khi trúng đạn, pháo giấy khi lên rank. Không dùng ảnh stock.

### Bảng màu
| Vai trò | HEX |
|---|---|
| Nền | `#0E0B1F` |
| Bề mặt | `#1A1633` |
| Bề mặt nổi | `#241E45` |
| Viền | `#3A3270` |
| Màu chính (tím điện) | `#7C5CFF` |
| Màu nhấn (xanh chanh neon – đúng/thưởng) | `#C6FF3D` |
| Sát thương/sai | `#FF3D71` |
| Vàng thưởng | `#FFC83D` |
| Chữ chính | `#F5F3FF` |
| Chữ phụ | `#A59FD1` |

### Font và icon
- **Chakra Petch:** tiêu đề, số liệu, nút (in hoa, đậm).
- **Be Vietnam Pro:** nội dung.
- **Icon:** chỉ dùng một bộ Phosphor Icons kiểu `fill`, đơn sắc. Không dùng emoji thay icon.

### Ngôn ngữ và kích thước
- Chữ trên giao diện bằng tiếng Việt; từ vựng đang học bằng tiếng Anh.
- Thiết kế cho desktop 1440px và mobile 390px.
- Điều hướng: thanh bên trái trên desktop; tab dưới đáy trên mobile gồm Sảnh, Học Viện, Đấu Trường, Bộ Sưu Tập, Hồ Sơ.

### Ba hướng logo (chưa chốt)
- **A:** chữ "W" tạo từ hai thanh kiếm bắt chéo, phong cách esports.
- **B:** bong bóng thoại hình khiên chứa tia sét ("ngôn ngữ là vũ khí").
- **C:** chữ WORDCLASH đậm, nghiêng, có vệt tốc độ và nhát chém ở giữa, như màn hình tựa đề game đối kháng.

### Danh sách màn hình
| Nhóm | Màn hình |
|---|---|
| Vào game | Đăng nhập, Đăng ký, Cửa Ải Hôm Nay, Sảnh chính |
| Học Viện | Bản đồ lộ trình, Bài học, Kiểm tra cuối bài/chặng, Trận Boss, Ôn tập, Kiểm tra xếp lớp |
| Đấu Trường | Sảnh đấu, Chờ ghép trận, Màn đấu, Kết quả trận |
| Bộ Sưu Tập và Hồ Sơ | Album, Vòng quay, Hồ sơ, Thẻ chứng nhận, Bảng xếp hạng |

---

## 10. Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Zustand, Axios |
| Hiệu ứng | Framer Motion, Canvas/PixiJS, Lottie (lottie-react), canvas-confetti |
| Âm thanh | Howler.js |
| Icon | @phosphor-icons/react |
| Thời gian thực | Socket.IO client + python-socketio `AsyncServer` (ASGI, `AsyncRedisManager`) |
| Backend | FastAPI, Uvicorn, Pydantic v2, pydantic-settings, SQLAlchemy 2.0 async + asyncpg, Alembic, PyJWT (OAuth2PasswordBearer), pwdlib (Argon2) |
| Dữ liệu | PostgreSQL (lâu dài), Redis (hàng chờ, trạng thái trận, message queue cho SocketIO) |
| Kho từ | Python, pandas, TTS |
| Kiểm thử | pytest, pytest-asyncio, httpx.AsyncClient (ASGITransport) |
| Triển khai | `uvicorn app.main:asgi_app --host 0.0.0.0 --port $PORT`; ban đầu 1 worker, nhiều worker thì bật sticky session; Railway / Render / VPS + Nginx (cần hỗ trợ WebSocket) |

---

## 11. Cấu trúc thư mục

```
wordclash/
├── README.md · CLAUDE.md · .env.example · .gitignore · docker-compose.yml
├── docs/                    # đặc tả: database, api, socket-events, game-rules
├── backend/
│   ├── requirements.txt · alembic.ini · pytest.ini
│   ├── alembic/             # migration async (versions/)
│   ├── app/
│   │   ├── main.py          # FastAPI + CORS + lifespan (DB, Redis) + Socket.IO → asgi_app
│   │   ├── core/            # config (Settings), database (Base, AsyncSession), redis, security (JWT, băm, refresh token), errors
│   │   ├── api/             # deps.py (get_db, get_current_user…), cookies.py, responses.py; v1/routers/ mỏng:
│   │   │                    # health, auth, users, academy, review, daily_check, placement, profile, mascots, leaderboard, arena
│   │   ├── schemas/         # Pydantic v2: dữ liệu vào/ra, ApiResponse[T]
│   │   ├── models/          # SQLAlchemy 2.0: user, refresh_token, vocabulary, progress, mascot, match, daily_check
│   │   ├── services/        # logic: srs, mastery, unlock, rank, gacha, daily_check,
│   │   │                    # placement, question_builder, streak, certificate, auth_service, rate_limit
│   │   ├── game/            # Đấu Trường: sio_server (sio, xác thực JWT), events, matchmaking, match_room,
│   │   │                    # scoring, question_picker, timing, bot
│   │   └── utils/           # responses, time
│   ├── data_pipeline/       # 01_import → 07_load_to_db; raw/ processed/ reviewed/
│   ├── seeds/               # địa danh A1–A2, linh vật, bài mẫu A1
│   └── tests/               # unit/ (hàm thuần), integration/ (service + PostgreSQL), api/ (HTTP, Socket.IO)
└── frontend/
    └── src/
        ├── pages/           # Auth, DailyCheck, Lobby, Academy, Arena, Collection,
        │                    # Profile, Leaderboard
        ├── components/      # ui, layout, academy, game, collection
        ├── hooks/ · services/ · store/ · utils/
        ├── styles/          # tokens.css, globals.css, animations.css
        └── assets/          # logo, mascots, lottie, sounds, images
```

---

## 12. Cơ sở dữ liệu

| Nhóm | Bảng | Nội dung |
|---|---|---|
| Người dùng | `users` | Tài khoản, mật khẩu băm, avatar linh vật, streak, lượt quay, múi giờ |
| Kho từ | `levels`, `topics`, `units` | Cấp, chặng, bài và thứ tự |
| | `entries` | Mục từ (xem mục 4) |
| | `unit_entries` | Mục từ thuộc bài nào, nhánh nào (Nền tảng/IELTS/TOEIC) |
| Tiến độ | `user_unit_progress` | Bài đã mở/đang học/hoàn thành, điểm |
| | `user_entry_progress` | Trạng thái, lịch ôn SRS, số ngày đúng ở mức 3+ |
| | `daily_checks` | Lịch sử Cửa Ải |
| Game hóa | `mascots`, `user_mascots`, `spins` | Linh vật, sở hữu và mảnh, lịch sử quay và bộ đếm pity |
| Đấu | `matches`, `match_rounds` | Trận, từng câu, ai đúng, thời gian trả lời |

---

## 13. Quy trình xây kho từ

`raw` → gắn cấp độ, chủ đề, nhãn kỳ thi → tạo nội dung (AI tạo bản nháp) → tạo audio TTS → kiểm duyệt thủ công → chia thành bài → nạp vào DB.

- **Nguồn danh sách:** ưu tiên danh sách có giấy phép mở (NGSL, NAWL, TSL, BSL), kiểm tra điều khoản trước khi dùng. Oxford 3000/5000 và English Vocabulary Profile chỉ dùng để tham khảo cách phân cấp, **không sao chép**.
- **Định nghĩa và ví dụ:** tự viết hoặc AI tạo bản nháp rồi duyệt.
- **Phát âm:** TTS có giấy phép thương mại.
- **Phát hành dần:** A1–A2 (khoảng 2.000 mục) trước.

---

## 14. Lộ trình phát triển

| Giai đoạn | Nội dung |
|---|---|
| 0. Chuẩn bị | Tên, logo, bảng màu, thiết kế giao diện, thiết kế DB, quy trình kho từ, 10 linh vật đầu |
| 1. MVP Học Viện | Tài khoản, lộ trình A1–A2, mở khóa, SRS, Cửa Ải Hôm Nay, rank |
| 2. Game hóa | Vòng quay, album, thẻ chứng nhận, streak |
| 3. Đấu Trường | Phòng riêng bằng mã trước, sau đó ghép trận theo rank |
| 4. Mở rộng kho | B1–C2, nhánh IELTS/TOEIC, kiểm tra xếp lớp, đủ 10.000 mục |
| 5. Hoàn thiện | Bảng xếp hạng, âm thanh, chia sẻ mạng xã hội, tối ưu mobile |

---

## 15. Rủi ro

| Rủi ro | Hướng xử lý |
|---|---|
| Trừ từ, tụt rank gây ức chế | Vùng đệm 3 ngày, chỉ kiểm tra 2–5 từ, hiện rõ cách gỡ lại |
| Gian lận PvP | Server làm trọng tài, không gửi đáp án trước, tính giờ ở server |
| Ít người chơi | Ưu tiên phòng riêng với bạn bè; thêm bot |
| Vẽ 100 linh vật tốn công | Ra mắt với 20–30, bổ sung dần |
| Độ trễ mạng | Chấp nhận ở giai đoạn đầu; sau đó đo ping và bù trừ |
| Bản quyền dữ liệu | Nguồn mở, tự viết nội dung |
| Xây kho 10.000 mục tốn công | Tự động hóa, AI tạo nháp, duyệt thủ công, phát hành theo cấp |
| Lộ trình khóa chặt làm người giỏi thấy chán | Kiểm tra xếp lớp |

---

## 16. Chỉ số thành công

- Tỉ lệ quay lại sau 1 ngày và sau 7 ngày.
- Số từ đã thuộc trung bình mỗi người sau 30 ngày.
- Tỉ lệ đúng ở Cửa Ải Hôm Nay.
- Số trận PvP mỗi người mỗi tuần.
- Độ dài streak trung bình.

---

## 17. Câu hỏi còn bỏ ngỏ

- Tên chính thức và logo (A/B/C).
- Mức trừ khi quên từ: −1 hay nhiều hơn.
- Nguồn danh sách từ cụ thể cho từng cấp và từng nhánh.
- Trong cùng một cấp, người học được tự chọn thứ tự chặng hay phải theo thứ tự cố định.
- Ngưỡng 80% (qua bài) và 85% (Trận Boss) có hợp lý không.
- Có mô hình kiếm tiền không (nếu có, không được làm mất công bằng PvP).

---

## 18. Hiện trạng dự án

- [x] Báo cáo ý tưởng v1.1 (file Word)
- [x] Khung thư mục dự án (mỗi file mới có ghi chú mô tả và TODO, **chưa có code**)
- [x] Thiết kế giao diện (frontend chạy trên dữ liệu mẫu, chưa nối API; chi tiết trong CLAUDE.md)
- [x] Backend chuyển sang FastAPI (SQLAlchemy async, Alembic, python-socketio)
- [x] Auth giai đoạn 1: đăng ký, đăng nhập email/username, refresh token xoay vòng trong cookie httpOnly, đăng xuất, đổi mật khẩu, hồ sơ, onboarding, chống dò mật khẩu, xác thực Socket.IO (xem `docs/auth.md`)
- [x] Hoàn thiện auth sau review: PostgreSQL Docker ở cổng 5433, khoảng ân hạn refresh cho nhiều tab, IP thật sau proxy, tắt /docs ở production, bộ đếm dự phòng khi Redis hỏng, checklist triển khai (`docs/deploy-checklist.md`)
- [ ] Nối frontend với API auth
- [ ] Phần còn lại của giai đoạn 1: kho từ, lộ trình A1–A2, SRS, mở khóa, Cửa Ải Hôm Nay, rank

### Thứ tự gợi ý khi bắt đầu code
1. `docker-compose.yml`, `.env`, `app/core/config.py`, `app/main.py`
2. `models/` và `docs/database.md`
3. Đăng nhập (`api/v1/routers/auth.py`, trang Login/Register)
4. Bài học A1 mẫu (`seeds/seed_sample_units.py`, `Academy/Lesson.jsx`)
5. `services/srs.py`, `mastery.py`, `unlock.py` kèm test
6. Cửa Ải Hôm Nay và rank
7. Vòng quay và album
8. Đấu Trường: phòng riêng bằng mã trước, ghép trận sau

### Chạy dự án
```bash
docker compose up -d                       # PostgreSQL ở localhost:5433 (kèm wordclash_test) + Redis 6379
cp .env.example .env                       # lần đầu (file .env ở gốc repo)
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head                       # tạo bảng
python -m seeds.seed_landmarks             # địa danh A1, A2
python -m seeds.seed_dev_entries           # 60 mục từ A1 MẪU cho dev (đánh dấu DEV_SAMPLE, không chạy ở production)
python -m seeds.seed_dev_roadmap           # lộ trình MẪU A1–A2: 20 chặng × 2 bài × 15 mục (~600 mục DEV_SAMPLE, gồm 60 mục trên); tự nạp địa danh
python -m seeds.seed_mascots               # danh mục 100 linh vật (seeds/data/mascots.json + hồ sơ docs/mascots-lore.md); chạy lại an toàn, dùng cả production
python -m seeds.purge_dev_entries          # xóa mọi mục DEV_SAMPLE + tiến độ liên quan (--dry-run chỉ đếm; production cần --yes)
uvicorn app.main:asgi_app --reload         # API + Socket.IO ở cổng 8000, tài liệu API tại /docs
pytest -q                                  # test: cần PostgreSQL wordclash_test (TEST_DATABASE_URL)
cd ../frontend && npm install && npm run dev   # gọi API thật qua proxy /api, /socket.io sang cổng 8000
VITE_USE_MOCK=true npm run dev                 # chạy bằng dữ liệu giả khi không có backend (build production cấm mock)
```

### Linh vật: danh mục và hồ sơ

- Nguồn chính của 100 linh vật là `backend/seeds/data/mascots.json` (id, mã, tên, độ hiếm, vùng, `status`, `obtain`,
  `is_starter`, hình khối, màu, phụ kiện). Sửa danh mục ở đây rồi chạy `python -m seeds.seed_mascots`; seed dừng nếu phân bổ
  vùng × độ hiếm sai (bảng ở `docs/game-rules.md`), id trùng hoặc ô `coming_soon` có tên. Seed không bao giờ đổi id.
- Hồ sơ linh vật điền trong `docs/mascots-lore.md`, mỗi linh vật một mục:

  ```markdown
  ## #031 · Tên Linh Vật
  - birthday_text: 01/01
  - hometown: Hội An
  - personality: Vui vẻ, tò mò
  - likes: Đèn lồng
  - dislikes: Mưa dầm
  - favorite_word: lantern
  - catchphrase: Sáng lên nào!
  - bio: Một đoạn tiểu sử ngắn.
  ```

  Chỉ dùng 8 khóa trên; khóa nào bỏ trống thì giao diện ẩn. Tên ở tiêu đề phải trùng tên trong `mascots.json` (ô
  `coming_soon` cần có tên trong JSON trước khi viết hồ sơ). Viết xong chạy lại `python -m seeds.seed_mascots`.
- Frontend `src/data/mascots.js` chỉ là bản mock; `npm test` báo lỗi nếu mock lệch với JSON.

### Kiểm thử đầu-cuối (Playwright)

Chạy với backend và PostgreSQL thật, trên database riêng `wordclash_e2e` (tự tạo và làm sạch mỗi lần chạy):

```bash
docker compose up -d                 # PostgreSQL 5433 + Redis 6379
cd backend && source .venv/bin/activate && pip install -r requirements.txt   # backend/.venv phải có sẵn
cd ../frontend && npm install
npm run e2e                          # tự bật backend (cổng 8100) và Vite (cổng 5180), chạy frontend/e2e/*.spec.js
E2E_SHOTS=/tmp/wc-shots npm run e2e  # chụp ảnh các bước vào thư mục chỉ định
npx playwright test e2e/auth.spec.js -g "hai tab"   # chạy một kịch bản
npm run screenshots                  # KHÔNG phải test: chụp ảnh Học Viện với dữ liệu thật vào frontend/screenshots/
E2E_SHOTS=/tmp/wc-shots npm run screenshots -- -g "Boss"   # đổi thư mục ảnh, chỉ chụp một kịch bản
```

- Trình duyệt: Google Chrome cài trên máy (`channel: "chrome"`), không cần tải trình duyệt của Playwright.
- `e2e/start-backend.sh`: `ENV=e2e` (cho phép header `X-Debug-Now` giả lập ngày và route `/api/v1/dev/*`), `DATABASE_URL` trỏ
  `wordclash_e2e` (đổi bằng `E2E_DATABASE_URL`), `alembic downgrade base` → `upgrade head`, nạp `seeds.seed_dev_roadmap`, Redis db 15,
  `JWT_SECRET_KEY` cố định để test ký được access token hết hạn.
- Kịch bản: đăng ký → onboarding → Sảnh; tải lại vẫn đăng nhập; đăng xuất bị chặn; khóa học (thêm từ kho, tự tạo, nhập 5 dòng có 1 lỗi,
  học mới đến hết, thống kê đổi); hai tab cùng hết hạn token không bị đăng xuất; người B không xem được khóa học của A;
  6 kịch bản Học Viện trong `e2e/academy.spec.js` (học bài và mở bài, Cửa Ải và streak, Cửa Ải sai, con dấu chặng, Trận Boss, bỏ một ngày).
- Kết quả lỗi (ảnh, trace) nằm ở `frontend/test-results/` (đã bỏ qua trong git).
- Script chụp ảnh nằm ở `frontend/scripts/screenshots/` (`*.shots.js`, cấu hình riêng `scripts/screenshots/playwright.config.js`): dùng
  lại backend và Vite của e2e, dựng tiến độ nhiều ngày bằng API + `X-Debug-Now` rồi chụp Cửa Ải (mốc 7 ngày, sai hết + rank lung lay),
  Sảnh, bản đồ A1, Trận Boss. Không nằm trong `npm run e2e` và không chạy trên CI.

Triển khai: `uvicorn app.main:asgi_app --host 0.0.0.0 --port $PORT`. Ban đầu chạy 1 worker; khi chạy nhiều worker phải bật sticky session và `SIO_USE_REDIS=true` (Socket.IO). Production: `ENV=production`, `JWT_SECRET_KEY` dài ít nhất 32 ký tự, cookie tự bật `Secure`; chạy sau reverse proxy thì đặt `TRUST_PROXY=true`.

Trước khi deploy: đi theo `docs/deploy-checklist.md`. Sau lần deploy đầu, không viết lại migration cũ, chỉ thêm migration mới.

Volume PostgreSQL tạo từ trước khi có `docker/postgres/init.sql` thì tạo database test một lần: `docker exec wordclash_postgres createdb -U wordclash wordclash_test`. Tài liệu auth: `docs/auth.md`; API: `/docs`.