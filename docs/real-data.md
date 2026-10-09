# Dữ liệu thật: Từ của ngày, Hồ sơ, Bảng xếp hạng, Số liệu công khai

Nhánh `feat/real-data` (08–09/10/2026). Frontend không còn dữ liệu giả: mọi con số, tên người, thành tích, trạng thái đều lấy từ server. Tính năng chưa có backend (Đấu Trường, kiểm tra xếp lớp, chế độ học "Trong ngữ cảnh", bạn bè, huy hiệu, thống kê Đấu Trường) hiện trạng thái "Sắp ra mắt".

## Quy tắc frontend

- Không hardcode dữ liệu người dùng hay số liệu hệ thống. Dữ liệu mẫu chỉ ở `frontend/tests/fixtures` và `frontend/src/dev` (trang chỉ đăng ký khi dev, dưới `/dev/*`).
- ESLint (`npm run lint`, chạy trong CI) chặn code production import từ `src/dev`, `tests` hay đường dẫn có chữ "mock". `scripts/check-dist.mjs` làm build lỗi nếu bundle còn chuỗi dữ liệu giả cũ ("Kẹo Dẻo", "12.400", "128 người", "mockLobby", "VITE_USE_MOCK").
- Mọi khối lấy dữ liệu từ server có 3 trạng thái: đang tải (`Skeleton`), lỗi (`ErrorState` + Thử lại, không hiện số nào), trống (`EmptyState`: linh vật + gợi ý). Xem `components/ui/DataState.jsx`, `hooks/useServerData.js`.
- Luật game không đặt trong `utils/constants.js`:
  - luật công khai: `store/rulesStore.js` ← `GET /public/stats`;
  - luật vòng quay của người dùng: `store/ratesStore.js` ← `GET /collection/rates`.
- Đồng hồ đếm ngược dùng số giây server trả (`seconds_left`, `shaky_seconds_left`, `retry_in_seconds`).

## API

### `GET /words/daily` (đăng nhập)

Một mục từ hệ thống dạy được (`Entry.teachable()`: approved, chưa retired), lấy ở cấp đã mở **cao nhất** mà có mục từ.

- **Cách chọn từ:** sắp các mục theo id, lấy vị trí `sha256("<ngày địa phương>|<cấp>") mod <số mục>`. Cùng ngày, cùng cấp thì mọi người thấy cùng một từ. Qua ngày mới (theo múi giờ người dùng) thì đổi từ.
- **Trả về:** `{date, level, entry, status}`.
  - `entry` là `null` khi không có mục nào.
  - `status`: `new`, `learning` (gồm cả từ đã quên) hoặc `mastered`.
- Không bị Cửa Ải chặn.

### `GET /me/profile` (đăng nhập)

**Phần công khai:** `display_name`, `username`, `avatar_mascot_id`, `rank`, `mastered_count` (chỉ từ hệ thống), `streak_current` (`effective_streak`), `streak_best`, `current_level`, `mascots_owned`, `showcase`.

**Phần riêng:**

| Trường | Nội dung |
|---|---|
| `rank_progress`, `rank_shaky`, `shaky_seconds_left`, `words_to_recover` | Rank kế tiếp và trạng thái lung lay |
| `custom_mastered_count` | Số từ tự tạo đã thuộc |
| `courses_count` | Số khóa đang học (chưa lưu trữ) |
| `show_on_leaderboard`, `showcase_mascot_ids` | Cài đặt bảng xếp hạng và tủ trưng bày |
| `levels` | Mỗi cấp trong DB: số mục đã thuộc / tổng mục dạy được, đã mở hay chưa |
| `activity` | 84 ngày gần nhất theo múi giờ người dùng: từ mới, câu ôn, tổng câu |
| `daily_check_accuracy` | Tỉ lệ đúng Cửa Ải 30 ngày (`rate` là `null` khi chưa có câu nào) |
| `most_forgotten` | 5 từ hay quên nhất, theo `lapse_count` |
| `rank_first_reached_at` | Ngày đạt **lần đầu** rank hiện tại, lấy từ sổ `spin_grants` lý do `rank_up`; thẻ chứng nhận ghi "Ngày đạt lần đầu" |
| `created_at` | Ngày tham gia |

### `GET /users/{username}/profile` (đăng nhập)

- **Chỉ trả phần công khai** (schema `PublicProfileOut`). Không có email, khóa học, từ hay quên, lịch hoạt động.
- Không tìm thấy username, tài khoản bị khóa hoặc chưa xong onboarding → 404 `USER_NOT_FOUND`.
- **Rank của người khác:** đọc thuần, không ghi DB, qua `rank.effective`. Nếu thời hạn lung lay đã qua thì trả rank tính theo số từ.

### `PATCH /users/me`

- **`showcase_mascot_ids`:** tối đa 3 linh vật khác nhau và phải đang sở hữu. Không sở hữu → `MASCOT_NOT_OWNED`. Gửi `null` → về mặc định: 3 con hiếm nhất (độ hiếm giảm dần, cùng độ hiếm thì số thứ tự tăng dần).
- **`show_on_leaderboard`:** kiểu boolean.
- Migration `c5d2e8f1a3b7`: thêm 2 cột trên vào `users` và chỉ mục `user_entry_progress (status, mastered_at)`. Chỉ nâng thêm, không sửa migration cũ.

### `GET /leaderboard?board=weekly|alltime&limit=50` (đăng nhập)

- **Điểm của bảng `weekly`:** số mục từ **hệ thống** đang `status = mastered` mà lần **đầu tiên** đạt "đã thuộc" (`first_mastered_at`) nằm trong tuần ISO hiện tại.
  - Tuần tính theo giờ `LEADERBOARD_TIMEZONE` (Asia/Ho_Chi_Minh), từ thứ Hai 00:00, không gồm thứ Hai tuần sau 00:00.
  - Quên rồi thuộc lại **không** được cộng điểm tuần lần nữa: `first_mastered_at` ghi một lần, không đổi; `mastered_at` là lần thuộc gần nhất.
  - Migration `d8e3f9a2b4c6` thêm cột `user_entry_progress.first_mastered_at`, điền dữ liệu cũ từ `mastered_at` (mốc gần nhất biết được), đổi chỉ mục sang `(status, first_mastered_at)`.
- **Điểm của bảng `alltime`:** `users.mastered_count`. Từ tự tạo không tính ở cả hai bảng.
- **Ai có mặt trong danh sách:** tài khoản đang hoạt động, đã xong onboarding, bật `show_on_leaderboard`, và có điểm > 0.
- **Cách xếp hạng:** bằng điểm thì cùng hạng (1, 1, 3). Trong cùng điểm, sắp theo username.
- **`my_entry`:** `{rank, score, hidden}`, với `rank` = 1 + số người hiện trên bảng có điểm cao hơn.
  - Vẫn tính đúng khi người dùng ngoài top hoặc đã tắt `show_on_leaderboard`.
  - Điểm 0 → `rank: null`.
- **`seconds_left`:** số giây tới hết tuần (chỉ có ở bảng `weekly`).
- **Cache:** danh sách top lưu `LEADERBOARD_CACHE_SECONDS` (60) giây trong Redis; Redis lỗi thì dùng bộ nhớ dự phòng (`services/cache.py`). `my_entry` luôn được tính lại.

### `GET /public/stats` (không cần đăng nhập)

Cache `PUBLIC_STATS_CACHE_SECONDS` (600) giây. Không chứa thông tin cá nhân.

- **`learners`:** số tài khoản đang hoạt động, đã xong onboarding. Ít hơn `PUBLIC_LEARNERS_MIN` (100) thì trả `null`, và Landing thay bằng câu không có số.
- **`mastered_total`:** tổng `mastered_count` của mọi người.
- **`entries_total`, `entries_by_level`:** số mục dạy được, tổng và theo từng cấp có trong DB.
- **Linh vật:**
  - `mascots_released`, `mascots_total`, `mascots_by_rarity`: số linh vật đã ra mắt / tổng ô, tổng và theo độ hiếm.
  - `featured_mascots`: tối đa 5 linh vật đã ra mắt nhận qua vòng quay, mỗi độ hiếm ít nhất một con.
- **`rules`:** mốc rank, số ngày vùng đệm, số từ mỗi lượt quay, mốc streak cho lượt quay, pity, tỉ lệ hai loại lượt, mảnh khi trùng, giá đổi mảnh, số lượt tối đa của "Mở tất cả", ngưỡng qua bài / chặng / Boss, số câu Boss, số từ Cửa Ải, hạn mức từ mới mỗi ngày, cỡ bài thật trong DB (`unit_size`, `null` khi chưa có bài).

## Tài khoản mẫu (dev / e2e)

`python -m seeds.seed_dev_accounts`. Chỉ chạy khi ENV là development hoặc e2e; chạy lại thì xóa rồi tạo lại để số liệu theo ngày hôm nay. Mật khẩu chung `Wordclash2026`.

| Tài khoản | Trạng thái |
|---|---|
| `dev_normal` | Xong 5 chặng A1, 150 từ đã thuộc (30 từ trong tuần), Đồng, streak 5, 6 linh vật, 2 lượt quay, Cửa Ải hôm nay đã vượt |
| `dev_shaky` | Xong 10 chặng A1 (tới Trận Boss), 290 từ đã thuộc nhưng rank Bạc → lung lay, còn 2 ngày |
| `dev_new` | Vừa xong onboarding, chưa học gì |

Backend e2e tự chạy seed này. `npm run screenshots` chụp các màn chính bằng 3 tài khoản này.
