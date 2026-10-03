# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hướng dẫn cho AI agent làm việc trong repo **WORDCLASH**. Đọc file này trước mỗi phiên. Đặc tả đầy đủ nằm ở `README.md` và thư mục `docs/`.

## Dự án là gì

WORDCLASH là website học từ vựng tiếng Anh theo kiểu game đối kháng, dành cho người Việt Gen Z. Sản phẩm có hai khu tách biệt:

- **Học Viện:** học theo lộ trình mở khóa từ kho khoảng 10.000 mục từ, trình độ A1–C2. Mục từ gồm từ đơn, collocation, phrasal verb, idiom. Có ba nhánh Nền tảng, IELTS, TOEIC. Việc ôn tập dùng lặp lại ngắt quãng (SRS).
- **Đấu Trường:** đấu 1v1 thời gian thực qua Socket.IO. Hai người nhận cùng câu hỏi; ai đúng trước thì bắn trừ máu đối thủ.

Phần game hóa gồm: rank theo số từ đã thuộc, Cửa Ải Hôm Nay bắt buộc mỗi ngày, vòng quay 100 linh vật và streak.

**Ý tưởng cốt lõi:** trận đấu là buổi ôn tập trá hình. Người chơi thắng nhờ vốn từ thật, và phần thưởng gắn với việc học.

## Hiện trạng

- Khung thư mục đã có. Phần lớn file chỉ chứa docstring hoặc comment mô tả nhiệm vụ kèm TODO; `docs/` cũng mới là TODO, đặc tả thật nằm trong `README.md`.
- **Backend chạy FastAPI.** Đã có code thật: khởi động (`app/main.py`, `app/core/`), **Auth giai đoạn 1** (02/10/2026, đã hoàn thiện sau review; xem `docs/auth.md`): đăng ký, đăng nhập email/username, refresh token xoay vòng trong cookie httpOnly có khoảng ân hạn 30 giây cho nhiều tab, đăng xuất, đăng xuất mọi thiết bị, hồ sơ (avatar chỉ 3 linh vật khởi đầu), onboarding, đổi mật khẩu, giới hạn đăng nhập sai (Redis, dự phòng trong bộ nhớ khi Redis hỏng), IP thật sau proxy, tắt /docs ở production, xác thực Socket.IO. Model `User` (UUID), `RefreshToken`, `Level`, `Topic` kèm migration; seed 22 địa danh A1–A2. Checklist triển khai: `docs/deploy-checklist.md`.
- **Khóa học của tôi** (03/10/2026, nhánh `feat/my-courses`; xem `docs/courses.md`): model `Entry` (từ hệ thống + từ tự tạo), `UserEntryProgress`, `ReviewLog`, `UserCourse`, `UserCourseEntry`, `StudySession`, `AudioJob`, bộ đếm `users.mastered_count` / `custom_mastered_count`; service thuần `srs.py` (SM-2), `mastery.py`, `question_builder.py` (4 mức), `course_import.py` dùng chung cho Học Viện sau này; `progress_service.py`, `course_service.py`, `study_service.py`; API `/courses`, `/bank/search`, `/study-sessions`, `/custom-entries`. Tổng 239 test.
- **Chưa có:** các model còn lại (Unit, UnitEntry, UserUnitProgress, linh vật, trận đấu, Cửa Ải), các service luật còn lại (unlock, rank, gacha, scoring) và test của chúng; kho từ hệ thống chưa có dữ liệu (chưa seed mục từ nào); các router ngoài health/auth/users/courses mới là khung rỗng; sự kiện trận đấu mới trả ack "đang phát triển"; worker TTS cho `audio_jobs`. Frontend chưa có đăng nhập thật: `services/coursesApi.js` gọi được API thật (`VITE_USE_MOCK=false`) nhưng mặc định chạy mock.
- **Frontend** đã có nền tảng giao diện bản sáng và 23 màn hình chạy trên dữ liệu mẫu, chưa nối API. Chi tiết xem mục **Báo cáo công việc** bên dưới.
- Đang ở giai đoạn thiết kế giao diện, sau đó sẽ code **Giai đoạn 1: MVP Học Viện** (tài khoản, lộ trình A1–A2, mở khóa, SRS, Cửa Ải Hôm Nay, rank).
- Khi code một file, hãy thay phần mô tả placeholder bằng code thật nhưng giữ lại docstring hoặc comment đầu file.
- Không làm vượt giai đoạn hiện tại khi chưa được yêu cầu, ví dụ không tự làm Đấu Trường khi đang làm MVP Học Viện.

## Báo cáo công việc (cập nhật 02/10/2026)

Phần bảng dưới là **frontend, giai đoạn thiết kế giao diện**. Backend xem dòng cuối bảng và mục Kiến trúc backend. Mọi màn hình đã được kiểm tra bằng ảnh chụp ở 1440px và 390px, không tràn ngang.

### Đã làm

| Hạng mục | Đường dẫn | File chính |
|---|---|---|
| Khởi tạo frontend: Vite + React 19 + Tailwind v4, đủ thư viện; proxy `/api`, `/socket.io` sang cổng 8000 (uvicorn; cổng 5000 trên macOS bị AirPlay chiếm) | – | `frontend/package.json`, `vite.config.js`, `index.html` |
| Design system bản sáng (đã thay hẳn bản dark mode ban đầu) | `/design-system` | `styles/tokens.css`, `styles/globals.css`, `pages/DesignSystem/` |
| Landing: hero có mini màn đấu động, số liệu, hai khu chính, cách chơi, thang rank, linh vật, Cửa Ải, CTA | `/` | `pages/Landing/` |
| Sảnh chính: nền họa tiết chấm + chữ cái/ngôi sao/xoắn vẽ tay rất nhạt, 4 sticker trang trí (COMBO x3, +15 DMG, A1 → C2, ngôi sao); chào hỏi có linh vật đang dùng (thở, chớp mắt) và hàng "Tuần này" T2–CN; card Học Viện có địa danh chặng hiện tại ("Đang tới: Big Ben") và chip "Bài 3/5 · Chặng 3/9"; card Đấu Trường có ô VS (mình — VS — ô "?" xoay chờ đối thủ), số người online, chuỗi thắng; Từ của ngày (phát âm, ví dụ tô highlight, Tò He mách mẹo nhớ), Mục tiêu hôm nay (checklist 3 dòng, chỉ hiển thị), Khóa học của tôi (cuộn ngang, lấy qua `services/coursesApi.js`), Hành trình (6 vùng A1 → C2, máy bay ở vùng hiện tại, hộ chiếu); 4 widget phải (bảng bạn bè theo số từ tuần này, dòng của mình tô xanh chanh); các khối hiện lần lượt 60ms, hover nhấc 2px; 3 biến thể bình thường / rank lung lay / người mới, mỗi khối có bản người mới | `/lobby` | `pages/Lobby/`, `data/mockLobby.js`, `data/mascots.js`, `components/layout/StatusBar.jsx` |
| Đăng nhập, Đăng ký (thanh độ mạnh mật khẩu, chọn múi giờ, trạng thái lỗi) | `/login`, `/register` | `pages/Auth/` |
| Onboarding 4 bước: mục tiêu, thời lượng, điểm xuất phát, linh vật | `/onboarding` | `pages/Onboarding/` |
| Cửa Ải Hôm Nay: mở đầu, câu gõ từ và điền câu, tấm phản hồi, 3 biến thể kết quả | `/daily-check` | `pages/DailyCheck/` |
| Bản đồ lộ trình "Hộ chiếu vòng quanh thế giới": tranh bản đồ minh họa cuộn dọc, đi từ dưới lên (B1 · Vương quốc Anh, 9 chặng); đồng cỏ, đồi, cánh đồng kẻ sọc, sông có cầu và thuyền, cừu, nhà gạch, hộp thư và bốt điện thoại đỏ, xe buýt hai tầng, mòng biển, cờ dây, mây tiền cảnh trôi (parallax, có mây mưa); con đường đất có dấu chân và chấm xanh chanh ở đoạn đã đi, nét đứt ở đoạn chưa mở; sương mù dày dần che vùng chưa khám phá và tan ra khi mở trạm mới; trạm tròn (đã xong có cờ nhỏ, hiện tại có nhà du hành đeo ba lô, cầm bản đồ), biển chỉ đường gỗ; 9 địa danh trên bệ đảo kèm băng rôn chặng (đã đến: cờ tím và dấu "ĐÃ ĐẾN"; đang tới: Big Ben có tia sáng, đồng hồ chỉ giờ thật; chưa tới: bóng mờ); Trận Boss ở hồ Loch Ness (quái vật đeo kính râm thò lên mỗi 6 giây, bè gỗ, sân bay có máy bay và biển cửa ra tới B2); tab cấp, card tóm tắt có lá cờ và cột widget (Đến hạn ôn, Mục tiêu, Hộ chiếu có con dấu, Bạn có biết?) nổi như giấy ghim; la bàn và bản đồ thế giới thu nhỏ; mobile có thanh nổi trên cùng và 2 nút tròn (Hộ chiếu, Ôn 8 từ) ; A1 (Việt Nam – Miền Bắc) và A2 (Miền Trung & Nam) có 20 địa danh vẽ SVG riêng (Hồ Gươm, Văn Miếu, Chùa Một Cột… Chợ nổi Cái Răng) và đảo Boss lớn gấp 1,5 lần: Vịnh Hạ Long có Rồng Vịnh nháy mắt mỗi 5 giây, Cầu Vàng có Bàn Tay Núi khẽ động ngón; trang xem trước `/dev/landmarks` (chỉ khi chạy dev) | `/academy` | `pages/Academy/RoadmapMap.jsx`, `pages/Academy/map/`, `components/academy/{RoadmapNode,LevelHeader,Flag}.jsx`, `components/academy/landmarks/` |
| Học bài: chọn 4 chế độ, thẻ học từ (vuốt ngang), luyện tập đủ 4 mức (phím tắt 1–4, gợi ý 1 chữ, combo), chế độ ngữ cảnh có popover nghĩa, màn hoàn thành | `/academy/lesson` | `pages/Academy/Lesson*.jsx`, `components/academy/{WordCard,QuestionView,FeedbackSheet}.jsx` |
| Kiểm tra cuối bài: 20 câu, thanh tiến độ có vạch 80% và bộ đếm "Đúng x/20"; kết quả đạt (trạm tiếp theo vỡ khóa) và chưa đạt (danh sách từ sai, luồng ôn từ sai rồi làm lại) | `/academy/unit-test` | `pages/Academy/UnitTest.jsx`, `useTestRun.js`, `components/academy/{TestActionBar,BigScore,UnlockMap}.jsx` |
| Ôn tập: số từ đến hạn và nút bắt đầu ôn, 4 thẻ thống kê theo trạng thái, lịch ôn 7 ngày tới, khối "Ôn gấp" viền hồng, sổ từ có tìm kiếm và lọc theo cấp/trạng thái | `/academy/review` | `pages/Academy/Review.jsx`, `reviewMock.js` |
| Kiểm tra xếp lớp: giới thiệu (linh vật cầm kính lúp), 40 câu khó dần có nút "Tôi chưa biết từ này" và thanh độ khó A1–C2, kết quả là thang 6 cấp với mũi tên rơi xuống | `/academy/placement` | `pages/Academy/PlacementTest.jsx`, `placementMock.js` |
| Trận Boss cuối cấp: nền tím sẫm, Boss có thanh máu với vạch 85%, tia sáng khi đúng, rung viền hồng khi sai; màn thắng (pháo giấy, huy hiệu cấp mới, lượt quay đặc biệt, chia sẻ) và thua (chặng yếu nhất, chờ 24 giờ) | `/academy/boss` | `pages/Academy/BossBattle.jsx` |
| Sảnh Đấu Trường: nền sân đấu 3 lớp tràn màn hình, linh vật idle trên bệ phát sáng, HUD (người chơi, chuỗi thắng, thắng/thua tuần), nút TÌM TRẬN có ánh sáng quét, Phòng riêng, Luyện với bot (sắp ra mắt), trận gần đây, thành tích, bảng xếp hạng tuần, bạn bè online; hộp thoại Phòng riêng (tạo phòng có mã kiểu game, vào phòng bằng 5 ô ký tự); mobile có 2 tab trượt lên từ đáy | `/arena` | `pages/Arena/{ArenaLobby,ArenaScene,PrivateRoomModal}.jsx`, `arenaMock.js` |
| Ghép trận: nền tím có radar, linh vật ngó trái ngó phải, đồng hồ đếm lên, mẹo luân phiên, nút Hủy | `/arena/matchmaking` | `pages/Arena/Matchmaking.jsx` |
| Phòng chờ phòng riêng: hai ô người chơi, mã phòng ở giữa, nút Sẵn sàng (đổi thành dấu tích xanh chanh) | `/arena/room/:code` | `pages/Arena/RoomLobby.jsx`, `components/game/RoomCode.jsx` |
| Màn VS trước trận (~2,5 giây): chém chéo răng cưa tím/cam (mobile chia trên/dưới), linh vật trượt vào, VS đập xuống kèm tia sét, vệt trắng chuyển cảnh | `/arena/vs` (xem thử) | `pages/Arena/VersusIntro.jsx`, `VersusPreview.jsx`, `hooks/useMediaQuery.js` |
| Màn đấu: sân "Thành Phố Kẹo", 2 linh vật, thanh máu có máu trễ và nhấp nháy dưới 30 HP, đồng hồ combo, khiên số câu + đồng hồ vòng, băng từ vựng, card 3 loại câu (mức 1, 2, 4), đáp án phím 1–4; READY/FIGHT, đạn chữ cái, hit-stop, rung, số sát thương, chí mạng, tự trúng đòn, hòa lượt, lật card lộ nghĩa, K.O., hết giờ so máu, mất kết nối, sticker biểu cảm; mobile dọc kiểu Clash Royale | `/arena/battle` | `pages/Arena/Battle.jsx`, `pages/Arena/battle/`, `battleMock.js`, `components/game/{MascotFighter,ComboMeter,CountdownTimer,WordTicker,BulletEffect}.jsx` |
| Kết quả trận (thắng/thua): phần đầu ăn mừng hoặc mây mưa, bảng tỉ số có thanh so sánh 2 phía và biểu đồ diễn biến máu, phần thưởng hiện lần lượt (không có điểm rank), "Từ bạn đã sai" (mobile vuốt ngang), Tái đấu / Trận mới / Về sảnh, ảnh chia sẻ vẽ bằng canvas có logo | `/arena/result` | `pages/Arena/MatchResult.jsx`, `pages/Arena/result/`, `resultMock.js` |
| Album linh vật: phần đầu 37/100 với thanh tiến độ chia 4 màu độ hiếm, viên Lượt quay (hồng, chấm thông báo) và viên Mảnh (nút Đổi), bảng tỉ lệ quay công khai kèm bộ đếm pity; chip lọc độ hiếm, công tắc "Chỉ hiện đã có", sắp xếp; lưới 6/3 cột (thẻ MỚI, x3, thẻ chưa có kẻ sọc, Huyền Thoại chưa có viền vàng mờ, nghiêng 3D, ánh kim); chi tiết linh vật (thẻ xoay trên bệ, lật mặt sau, tiểu sử, ngày/nguồn nhận, bản trùng → mảnh, Đặt làm avatar, Dùng trong Đấu Trường, 4 trạng thái chuyển động; mobile là tấm trượt toàn màn hình); hộp thoại đổi mảnh có giá theo độ hiếm, xác nhận và lật thẻ nhận được | `/collection` | `pages/Collection/{Album,CollectionHeader,MascotDetail,ExchangeModal,MascotArt}.jsx`, `collectionMock.js`, `components/collection/{MascotCard,MascotBlob,MascotPoses}.jsx`, `components/ui/Switch.jsx` |
| Quay thẻ linh vật: màn chuẩn bị (nền tia sáng, hộp thẻ lơ lửng tím / vàng cho lượt đặc biệt, tab Lượt thường / Lượt đặc biệt, thanh pity chuyển tím phát sáng khi gần đầy, bảng tỉ lệ công khai cả lượt đặc biệt, Mở thẻ / Mở tất cả, tiến độ lượt kế tiếp); chuỗi mở (hộp rung 800ms và nứt sáng, bật tung, thẻ úp bay lên 400ms, ánh sáng gợi ý độ hiếm 600ms / Huyền Thoại tối màn 1.500ms, chạm để lật 500ms, công bố theo độ hiếm, thẻ trùng đóng dấu "ĐÃ CÓ" rồi vỡ thành mảnh bay vào ô đếm); mở tất cả (xếp hàng, lật lần lượt, thẻ hiếm nhất lên giữa); màn kết quả (avatar, xem trong album, mở tiếp, ảnh chia sẻ "Mình vừa mở được…"); hết lượt (hộp xám có khóa, Vào Học Viện, không có nút mua); nút Bỏ qua hiệu ứng | `/collection/spin` | `pages/Collection/GachaSpin.jsx`, `pages/Collection/spin/`, `components/collection/{CardPack,CardBack}.jsx`, `openPack` trong `collectionMock.js` |
| Hồ sơ (của tôi / người khác): ảnh bìa màu rank có họa tiết kim cương, linh vật đại diện khung độ hiếm lấn ra ảnh bìa, tên, @handle, ngày tham gia, rank lớn và số từ đã thuộc, viên streak / streak cao nhất / cấp; thang rank 8 khiên (đã qua có màu, hiện tại phát sáng, sau còn xám) và thanh tới rank kế; biến thể lung lay (khiên nứt viền hồng nhấp nháy, banner đếm ngược, Ôn ngay); kệ trưng bày 3 thẻ (chọn thẻ) và tiến độ bộ sưu tập; tiến độ theo cấp, lịch nhiệt 12 tuần, độ ghi nhớ, từ khó nhất (hai khối cuối chỉ ở hồ sơ mình); thống kê Đấu Trường và 5 trận gần đây; tủ huy hiệu; nút Chỉnh sửa (hộp thoại), Chia sẻ, Tải thẻ chứng nhận (ảnh canvas), cài đặt; người khác có THÁCH ĐẤU, Kết bạn, thành tích đối đầu; mobile có 3 tab trượt, lịch nhiệt 8 tuần | `/profile`, `/profile/:handle` | `pages/Profile/`, `profileMock.js` |
| Màn LÊN RANK (toàn màn hình): tối dần, huy hiệu cũ hiện → rung, nứt, vỡ → huy hiệu mới từ luồng sáng, phóng to rồi nảy, tia sáng xoay → pháo giấy + "LÊN RANK!" → số từ đã thuộc, linh vật nhảy mừng → card "+1 LƯỢT QUAY ĐẶC BIỆT" phát sáng; nút Nhận thẻ chứng nhận / Quay ngay / Về Sảnh, nút Bỏ qua; biến thể Huyền Thoại nền cầu vồng động, pháo hoa, huy hiệu viền cầu vồng | `/rank-up` (xem thử) | `components/layout/RankUpOverlay.jsx`, `pages/RankUp/RankUpPreview.jsx`, `components/ui/RankEmblem.jsx` |
| Thẻ chứng nhận rank (poster canvas, khổ 1080×1350 và 1080×1920): logo, huy hiệu cực lớn, tên rank, "Rank 5/8", họ tên, số từ trên dải highlighter, 3 chỉ số, linh vật khung độ hiếm, mã QR tới hồ sơ, ngày đạt, mã chứng nhận, tagline; 8 bậc trang trí theo rank; màn xem trước (thẻ nghiêng, công tắc Bài đăng/Story, Tải ảnh, Facebook, Instagram, Sao chép link); trang trưng bày 8 phiên bản | `/certificates`, `/profile?cert=1` | `pages/Profile/{certificateArt.js,Certificate.jsx,CertificateGallery.jsx}`, `utils/canvasArt.js` |
| Cảnh chuyển cấp "Bay sang vùng đất mới" (~5 giây, có Bỏ qua): quái vật Loch Ness vẫy khăn, băng "B1 · ĐÃ CHINH PHỤC", con dấu "UNITED KINGDOM" dập xuống kèm rung → nhà du hành kéo vali lên máy bay tím, cất cánh → bản đồ thế giới màu kem, đường bay nét đứt vẽ dần Anh → Mỹ kèm vệt mây → sương tan lộ Tượng Nữ thần Tự do và New York, chữ "CHÀO MỪNG ĐẾN VỚI B2 · MỸ & CANADA" → card tổng kết (2.000 từ, 9/9 địa danh, trang hộ chiếu đủ dấu, +1 lượt quay đặc biệt, Bắt đầu hành trình B2); biến thể người mới: nhà của linh vật, biển "Hành trình 10.000 từ bắt đầu từ đây", mini-map 6 vùng đất, Lên đường | `/travel`, `/travel?variant=start` | `pages/Travel/` |
| Bảng xếp hạng: đồng hồ đếm ngược mùa tuần, tab Học tập / Đấu trường / Tổng và Bạn bè / Toàn quốc, bục top 3 (vàng/bạc/đồng, số khổng lồ, vương miện và tia sáng cho hạng 1), danh sách card từ hạng 4 (thay đổi hạng, avatar linh vật, rank, số liệu, Thách đấu ở tab Đấu trường), vùng thưởng top 10 viền vàng, thẻ phần thưởng tuần, dòng của mình tô xanh chanh kèm câu động viên và dính đáy khi cuộn khuất, "Quanh hạng của bạn" khi ngoài top 50, trạng thái chưa có bạn (linh vật cầm ống nhòm, Mời bạn) | `/leaderboard` | `pages/Leaderboard/`, `leaderboardMock.js`, `hooks/useCountdown.js` |
| Khóa học của tôi: trang danh sách (chỉ số "Từ của tôi đã thuộc", lọc Đang học / Đã lưu trữ, lưới card có vòng tiến độ, từ đến hạn và nút HỌC, card tạo nét đứt, trạng thái trống có Bánh Mì Bé và 3 gợi ý tạo nhanh); hộp thoại Tạo/Sửa (24 icon, 6 màu token, xem trước); trang chi tiết (đầu trang màu theo khóa, thanh 4 trạng thái, 5 nút chế độ học kèm số từ, danh sách từ có tìm/lọc/sắp xếp, loa, sao, menu); panel Thêm từ trượt từ phải (Tìm trong kho, Tự tạo có banner gợi ý từ kho, Nhập nhiều có bảng xem trước tô màu và file CSV mẫu); màn học dùng lại thẻ học, 4 mức câu hỏi, tấm phản hồi, màn kết thúc có "Ôn lại từ sai"; nút "+ Thêm vào khóa học của tôi" ở thẻ học Học Viện, "Từ bạn đã sai", "Từ của ngày". Backend đầy đủ (xem dòng dưới) | `/courses`, `/courses/:id`, `/courses/:id/study?mode=` | `pages/Courses/`, `components/courses/AddToCoursePopover.jsx`, `services/{api,coursesApi,coursesMock}.js`, `data/mockCourses.js`, `utils/courseIcons.js` |
| **Khóa học của tôi** (backend): bảng `entries` (source system/user, owner), tiến độ từng từ, khóa học, mục từ trong khóa (chỉ liên kết), phiên học (đáp án chỉ ở server), hàng đợi phát âm; CRUD + lưu trữ, thêm từ kho / tự tạo (gợi ý dùng từ kho), nhập hàng loạt xem trước rồi lưu trong một transaction, thống kê, tìm trong kho, 5 chế độ học, chấm ở server; giới hạn 50 khóa / 500 từ / 200 dòng / 1.000 từ tự tạo; khóa của người khác trả 404 | `/docs`, `docs/courses.md` | `backend/app/{models/course.py,services/{srs,mastery,question_builder,course_import,course_service,study_service,progress_service}.py,api/v1/routers/{courses,study,bank}.py}` |
| **Backend chuyển Flask → FastAPI**: FastAPI + Uvicorn, SQLAlchemy 2.0 async (asyncpg), Alembic async, pydantic-settings, python-socketio ASGI; `GET /health`; model `levels`, `topics` (cột địa danh); `seeds/seed_landmarks.py` chạy thật | `/docs` (backend) | `backend/app/`, `backend/alembic/` |
| **Auth giai đoạn 1** (backend): đăng ký, đăng nhập bằng email hoặc username, access JWT 15 phút + refresh token 30 ngày trong cookie httpOnly `wc_refresh` (DB chỉ lưu SHA-256, xoay vòng, dùng lại thì hủy cả phiên, ân hạn 30 giây khi nhiều tab cùng refresh, tối đa 10 phiên/người), `/auth/refresh`, `/logout`, `/logout-all`, `/change-password`, `/auth/token` (form cho /docs), `GET/PATCH /users/me` (avatar chỉ linh vật 1–3, khác thì MASCOT_NOT_OWNED), `PATCH /users/me/onboarding`; giới hạn đăng nhập sai 5 lần/15 phút và đăng ký 10 lần/IP/giờ bằng Redis (Redis hỏng thì dùng bộ đếm trong bộ nhớ); IP thật sau proxy (`TRUST_PROXY`, `TRUSTED_PROXY_HOPS`); kiểm tra Origin cho route dùng cookie; /docs tắt ở production (trừ `ENABLE_DOCS`); lỗi thống nhất `{error: {code, message, details}}`; Socket.IO từ chối kết nối khi token sai/hết hạn; 165 test (unit, integration trên PostgreSQL thật, API, Socket.IO) | `/docs`, `docs/auth.md`, `docs/deploy-checklist.md` | `backend/app/{core,api,services/auth_service.py,services/rate_limit.py,game/sio_server.py}`, `backend/tests/` |

### Kiến trúc frontend cần biết

- `routes.jsx`: landing, auth, onboarding, daily-check đứng riêng; các trang trong app nằm dưới layout `PageShell` (thanh bên desktop, tab dưới đáy mobile với nút Đấu Trường nổi ở giữa). `/academy/lesson` là màn toàn màn hình, đứng ngoài `PageShell`. `/arena` và `/academy` (bản đồ) cũng đứng ngoài `PageShell` để nền tràn màn hình, nhưng tự gắn `NavBar`. Địa danh: `components/academy/landmarks/` gồm `LandmarkIsland` (bệ đảo, trạng thái done/current/locked, cỡ normal/boss), `StageLandmark` (ưu tiên `landmark_image` PNG → tranh SVG trong `landmarkRegistry.js` theo `landmark_key` → cột mốc km dự phòng), tranh A1 trong `a1/`, A2 trong `a2/`, B1 trong `b1/UkLandmarks.jsx`, phần dùng chung (khung có bóng đổ cứng, cây, thuyền, người đội nón lá…) trong `shared/parts.jsx`; thêm địa danh mới = vẽ một file 240×240 và đăng ký khóa. Bản đồ lộ trình tính bố cục trong `pages/Academy/map/layout.js` (đường cong qua các trạm, rải vật trang trí theo hạt giống cố định nên bản đồ không đổi khi mở trạm mới).
- Token Tailwind khai báo bằng `@theme static` để giữ cả biến chỉ được ghép tên động trong JS (vd. `--color-level-*`). Bảng màu mặc định của Tailwind đã bị xóa.
- Utility riêng trong `globals.css`: `border-thick` (viền 2.5px), `pressable` (lún 4px khi nhấn), `font-num`, `bg-legend`. Animation trong `animations.css` đều tắt khi người dùng bật giảm chuyển động; Framer Motion dùng `MotionConfig reducedMotion="user"`.
- Component dùng chung: `ui/` (Button, IconButton, Card, Input, Select, Checkbox, Switch, Modal (có `mobileSheet`: tấm trượt toàn màn hình trên mobile), Toast/Toaster, ProgressBar, ProgressRing, RankBadge, LevelTag, Sticker, IconBadge, Reveal), `game/` (HealthBar, AnswerOptions), `collection/` (MascotBlob có `traits` tai/ăng-ten/mầm lá/vương miện…, MascotCard khung độ hiếm có `interactive`/`isNew`/`count`, MascotPoses, CardBack mặt sau thẻ, CardPack hộp thẻ), `RankEmblem` (khiên rank: done/current/locked/shaky) trong `ui/`, `layout/RankUpOverlay`, `academy/` (RoadmapNode, LevelHeader, WordCard, QuestionView, FeedbackSheet dùng chung cho Cửa Ải và Học bài).
- Tiện ích: `utils/cx.js`, `format.js` (`formatNumber`, `formatDelta` dùng dấu trừ thật), `password.js`, `timezones.js`, `speech.js` (phát âm tạm bằng Web Speech API), `constants.js` (rank, độ hiếm `RARITIES`/`RARITY_ORDER`, luật vòng quay và mảnh `GACHA`, ngưỡng 80/85 chỉ để hiển thị); `formatMascotNumber` → "#037". `utils/canvasArt.js`: công cụ vẽ ảnh chia sẻ (token màu, khối viền mực, chữ viền, thẻ linh vật dựng từ MascotBlob, mã QR qua thư viện `qrcode`).

### Dữ liệu mẫu và hợp đồng khi nối API

- Khóa học của tôi KHÔNG dùng mock riêng trong component: mọi lời gọi đi qua `services/coursesApi.js`. `VITE_USE_MOCK` (mặc định bật, đặt `false` để gọi backend) chọn giữa API thật và `services/coursesMock.js` (đóng vai server: giữ đáp án phiên học, chấm, phân loại nhập hàng loạt) với dữ liệu `data/mockCourses.js`. Hai chế độ trả cùng JSON snake_case và cùng dạng lỗi `{code, message, details, status}` (`toApiError` trong `services/api.js`).
- Mỗi màn có một file mock riêng: `data/mockLobby.js` (Sảnh; mọi số liệu và chữ nội dung của Sảnh nằm ở đây, trừ khóa học), `data/mascots.js` (30 Từ Linh đầu tiên), `roadmapMock.js`, `dailyCheckMock.js`, `lessonMock.js`, `testMock.js` (kiểm tra cuối bài và Trận Boss dùng chung), `reviewMock.js`, `placementMock.js`, `arenaMock.js`, `battleMock.js`, `resultMock.js`, `collectionMock.js`.
- `roadmapMock.js`: `GET /academy/levels/:code/map?branch=` trả `region_theme` của cấp, các chặng (chủ đề, `landmark_key`, `landmark_name`, `landmark_image`, trạng thái ghé thăm, `visited_at` dạng ISO là ngày hoàn thành chặng, kiểu con dấu), Trận Boss (`landmark_key`, `landmark_name`, quái vật canh giữ), bài, trạm kiểm tra, Trận Boss, số địa danh đã đến trong cấp và cả hành trình, câu "Bạn có biết?" cho địa danh đang tới. Sau khi chấm bài, server trả bản đồ mới; client chỉ diễn hoạt cảnh đi bộ và sương tan.
- `travelMock.js`: `fetchLevelComplete` đóng vai phản hồi sau khi thắng Boss (cấp vừa chinh phục, số từ, số địa danh, trang hộ chiếu, cấp mới, phần thưởng); `fetchJourneyStart` trả 6 vùng đất và tổng 10.000 từ. Mở cấp và phần thưởng do server quyết định.
- `leaderboardMock.js`: `GET /api/leaderboard?board=&scope=` trả thời điểm kết thúc mùa, danh sách (hạng, thay đổi so với hôm qua, linh vật, rank, số liệu), dòng của mình; toàn quốc chỉ trả top 50 và vài người quanh hạng của mình. Câu động viên tính từ người ngay trên.
- `fetchCertificate` trong `profileMock.js`: server lưu bản ghi lúc đạt rank (mã chứng nhận, ngày đạt, số từ lúc đạt, streak, cấp, số linh vật, linh vật đại diện); thẻ chứng nhận vẽ từ bản ghi này. Màn lên rank sẽ nhận sự kiện từ server (rank mới, số từ, phần thưởng); hiện chỉ có trang xem thử, chưa gắn vào luồng học.
- `profileMock.js`: `GET /api/profile/me` trả đủ thống kê gồm phần riêng tư (độ ghi nhớ, từ khó nhất, lung lay kèm `deadline`, số từ cần gỡ); `GET /api/profile/:handle` chỉ trả phần công khai kèm quan hệ bạn bè và thành tích đối đầu. Số từ thuộc, rank, lung lay, tỉ lệ thắng, tiến độ huy hiệu đều do server tính.
- `collectionMock.js`: server trả 100 linh vật và phần sở hữu (số bản, ngày nhận, nguồn nhận, thẻ mới), lượt quay, mảnh, bộ đếm pity, linh vật đang làm avatar và đang dùng ở Đấu Trường. Đổi mảnh, đặt avatar, chọn linh vật đều do server kiểm tra rồi trả trạng thái mới; client không tự trừ mảnh. Số thứ tự theo độ hiếm: #001–#045 Thường, #046–#075 Hiếm, #076–#093 Sử Thi, #094–#100 Huyền Thoại (khớp các linh vật đã có ở Sảnh, Landing). 100 tên và tiểu sử là nội dung nháp tự viết.
- `openPack(type, count)` trong `collectionMock.js` đóng vai `POST /api/gacha/open`: server trừ lượt, quay độ hiếm theo tỉ lệ (có pity), chọn linh vật, đổi bản trùng thành mảnh rồi trả `results` (id, độ hiếm, trùng hay không, số mảnh). Độ hiếm dùng để gợi ý ánh sáng trước khi lật có sẵn trong kết quả; client chỉ diễn hoạt cảnh, không tự quay. Lượt tách `spins.normal` / `spins.special`.
- `resultMock.js`: server gửi toàn bộ số liệu sau trận. Số liệu mẫu dựng lại từ nhật ký từng câu cho khớp luật sát thương, vì một vài con số trong đề thiết kế (62 HP, thiếu 12 HP, 118 sát thương) không thể xảy ra với các mức sát thương 10 / 15 / 22 / tự trúng 5. "Câu đúng" tính cả câu đúng nhưng chậm hơn đối thủ.
- `arenaMock.js`: mã phòng do server sinh. Các cấp chọn khi tạo phòng chỉ là mong muốn của chủ phòng; server vẫn lọc câu hỏi theo các cấp mà cả hai người đã mở. Sẽ nối với sự kiện socket `create_room` / `join_room`. `joinQueue` (giả lập `join_queue` → `match_found`, trả hàm hủy tương ứng `leave_queue`) và `watchRoom` (bạn vào phòng, bạn sẵn sàng) là chỗ thay bằng socket thật.
- **`battleMock.js` đóng vai server trận đấu**: `round_start` không kèm đáp án; server đo thời gian, chấm, tính sát thương, máu, combo, chí mạng, K.O. Trả lời sai chỉ nhận `self_result` (sai + tự mất máu), **không** lộ đáp án đúng khi đối thủ còn đang trả lời; đáp án đúng, nghĩa, phiên âm chỉ có trong `round_result`. Câu trả lời tới sau khi lượt đã chốt nhận `late` (chậm hơn bao nhiêu giây). Luật số nằm ở `ARENA` trong `constants.js` (client chỉ dùng để vẽ). Sticker chỉ gửi được giữa hai câu.
- `placementMock.js`: server chọn câu kế tiếp theo độ khó hiện tại; client chỉ nhận câu (không kèm đáp án) và vị trí thanh độ khó, **không** hiện đúng/sai từng câu. "Tôi chưa biết từ này" gửi câu trả lời rỗng và bị tính là sai. Kết quả gồm cấp ước tính, cấp được mở và các cấp bỏ qua. Từ ở những cấp bỏ qua không được tính là đã thuộc.
- `reviewMock.js`: server trả số từ đến hạn, số từ theo trạng thái, lịch 7 ngày, danh sách ôn gấp và `dueInDays` của từng từ. Bản mock lọc danh sách ở client; API thật nên lọc và phân trang ở server. Khi có API chỉ thay nguồn dữ liệu, giữ nguyên cấu trúc.
- **`dailyCheckMock.js` đóng vai server**: câu hỏi gửi xuống không kèm đáp án; đúng/sai, đáp án, phiên âm, ví dụ, mức trừ từ thuộc, streak mới và lượt quay chỉ trả về sau khi nộp. API thật phải giữ đúng hợp đồng này. `lessonMock.js` theo cùng nguyên tắc: câu luyện tập không kèm đáp án; gợi ý chữ cái (`requestHint`) và âm thanh câu nghe (`playQuestionAudio`, API thật trả `audio_url`) đều lấy từ server.
- `testMock.js`: mỗi lần nộp chỉ trả đúng/sai, số câu đúng và máu Boss (bài kiểm tra **không** hiện đáp án đúng giữa chừng); điểm, việc mở bài/cấp, danh sách từ sai kèm đáp án, phần thưởng và thời gian chờ thử lại chỉ trả về khi kết thúc. Sát thương lên Boss do server tính (hiện là 100% chia số câu).
- 18 mục từ trong `lessonMock.js` là nội dung nháp tự viết để dựng giao diện, tương đương `status = draft`; sẽ thay bằng kho từ đã duyệt.
- Form Đăng nhập/Đăng ký chỉ kiểm tra ở client rồi chuyển trang. Email `nhan@wordclash.vn` giả lập lỗi "đã được dùng".

### Tham số xem nhanh (dev)

- `/lobby?variant=shaky|new` (có thanh chuyển biến thể khi chạy dev)
- `/courses?demo=empty` (trạng thái chưa có khóa học), `/courses/c-it?add=1` (mở sẵn panel Thêm từ), `/courses/c-it/study?mode=learn|review|quick|hard|test`
- `/register?demo=error`
- `/daily-check?preview=perfect|milestone|mistake`, `/daily-check?streak=13` (chạm mốc 14 ngày)
- `/academy?level=A1&branch=ielts`, `?level=B2` (cấp khóa), `?demo=walk` (xem thử hoàn thành bài: nhà du hành đi sang trạm mới, sương tan; có nút bấm lại), `?fog=after` (trạng thái sau khi mở Bài 4), `?passport=1` (tấm Hộ chiếu trên mobile), `/dev/landmarks` (lưới địa danh A1, A2 ở 3 trạng thái; `?state=done`, `?px=140` cỡ mobile, `?only=a2_`)
- `/academy/lesson?step=mode|cards|practice|context|done`, `&i=4` (thẻ thứ 5), `&q=2` (câu luyện tập mức 3), `&mode=phrase|family`
- `/academy/unit-test?preview=pass|fail`, `/academy/unit-test?q=16` (vào câu 17, đã đúng 14)
- `/arena/battle` (chơi thử cả trận với đối thủ giả), `/arena/battle?scene=intro|hit|crit|hurt|wrong|draw|reveal|ko|timeup|listen|fill|opp-offline|offline|stickers` (dựng sẵn và giữ nguyên từng trạng thái)
- `/arena/result?outcome=win|lose`, `&rematch=1` (đối thủ đã bấm tái đấu), `&share=1` (mở ảnh chia sẻ)
- `/travel?hold=a|b|c|d|e` (dừng ở một khung của cảnh bay B1 → B2), `/travel?variant=start` (màn bắt đầu hành trình cho người mới)
- `/leaderboard?board=learn|arena|total&scope=friends|national`, `&friends=empty` (chưa có bạn)
- `/rank-up?to=bach_kim|huyen_thoai|…`, `&hold=a|b|c|d|e|f` (dừng ở một khung), `/certificates` (8 phiên bản thẻ, bấm để xem trước), `/profile?cert=1&format=story`
- `/profile?variant=shaky` (rank lung lay), `/profile/minhthu` (hồ sơ người khác), `?tab=learn|arena|badges` (tab mobile), `?cert=1` (thẻ chứng nhận), `?edit=1` (chỉnh sửa)
- `/collection/spin?result=legendary` (ép độ hiếm; `common-dupe` là thẻ trùng; nhiều thẻ cách nhau dấu phẩy), `?type=special`, `?pity=18` (thanh pity gần đầy), `?state=empty` (hết lượt), `?auto=1|all` (tự mở), `?hold=charge|burst|hint|await|reveal|flipping|featured` (dừng ở một khung hình)
- `/collection?mascot=37` (mở chi tiết), `?exchange=1&pick=8&confirm=1` (đổi mảnh: chọn sẵn, mở xác nhận), `?odds=1` (bảng tỉ lệ), `?rarity=legendary&owned=1` (trạng thái trống), `?sort=rarity|recent`
- `/arena/matchmaking?t=7&stay=1` (đồng hồ từ 7 giây, không bao giờ tìm thấy)
- `/arena/room/WX7K2?state=waiting|joined|ready`, `?joined=1`
- `/arena/vs` (chạy lặp), `/arena/vs?frame=a|b|c|d` (dừng ở từng khung hình chính)
- `/arena?room=create|created|join` (mở hộp thoại Phòng riêng), `/arena?sheet=recent|board` (tab trượt trên mobile)
- `/academy/placement?step=intro|test|result`, `&q=12` (vào câu 13)
- `/academy/boss?preview=win|lose`, `/academy/boss?q=22` (vào câu 23), `&level=B1`

### Chờ người dùng duyệt (đã tự chọn tạm)

- Màu rank, dải màu cấp độ A1→C2; màu nhận diện Sảnh (tím), Bộ Sưu Tập (vàng), Hồ Sơ (xanh chanh), Bảng xếp hạng (hồng).
- Logo tạm: chữ WORDCLASH nghiêng, chữ W tím.
- Câu chữ tự viết: tiêu đề các phần landing, mô tả onboarding, mẹo học, tên linh vật khởi đầu (Mochi, Giọt Sương, Lửa Nhỏ).
- Mức trừ khi quên từ tạm là 1; lượt quay streak tặng ở mọi bội số của 7 ngày.
- Ngưỡng thanh máu đổi màu (50% / 25%); ngưỡng qua bài kiểm tra chặng chưa có con số.
- Kiểm tra và Trận Boss: điểm mẫu đổi thành 70% (14/20) thay vì 72%, và 92% / 78% (trên 50 câu) thay vì 91% / 79%, vì các con số gốc không chia hết cho 20 hoặc 50 câu. Ngoài ra còn tạm đặt: chờ 24 giờ mới được đánh lại Boss, thắng Boss được +1 lượt quay đặc biệt, bỏ dở bài không được lưu. Các điểm này cần chốt thành luật.
- Số liệu giả: "12.400+ người đang luyện từ mỗi ngày" trên landing phải thay bằng số thật hoặc bỏ trước khi ra mắt.

### Còn thiếu / việc tiếp theo

- Màn đấu (luật chưa quy định, đã tạm chọn): lượt chốt ngay khi có người đúng đầu tiên; người chậm hơn bị khóa đáp án. Combo tăng khi bắn trúng, về 0 khi sai hoặc hết giờ không trả lời, không đổi khi bị khóa vì chậm hơn. Dùng chí mạng xong thì combo về 0. Sát thương chí mạng làm tròn xuống ((10+5)×1,5 = 22). Từ bị đưa vào danh sách ôn khi người chơi không thắng lượt. Mỗi câu 10 giây.
- Kết quả trận: huy hiệu "Tốc độ bàn thờ" và cách tính (5 câu dưới 1 giây), việc tái đấu cần cả hai cùng bấm, thua thì hiện "Chuỗi thắng dừng ở …" và "Thua tuần này +1" là đặt tạm.
- Ghép trận / VS: tên sân "Thành Phố Kẹo", thời gian chờ dự kiến ~15s, nội dung các mẹo, việc hiện thông số chính xác/tốc độ ở màn VS và luồng "cả hai bấm Sẵn sàng thì vào trận" là đặt tạm theo đề bài; sau vệt trắng chuyển cảnh, trang đích `/arena/battle` hiện là trang tạm.
- Sảnh Đấu Trường: bảng xếp hạng tuần tạm xếp theo số trận thắng trong tuần; mã phòng tạm dùng 5 ký tự chữ in hoa và số; thách đấu bạn bè, cài đặt và luyện với bot hiện chỉ báo thông báo. Các điểm này cần chốt.
- Tên tiếng Việt của các cấp (`LEVEL_NAMES` trong `constants.js`: A1 Mới bắt đầu, A2 Sơ cấp, B1 Trung cấp, B2 Trung cao cấp, C1 Cao cấp, C2 Thành thạo) và cách thay đổi độ khó trong bài xếp lớp (bắt đầu ở A2, bước nhảy nhỏ dần, lấy trung bình 10 câu cuối) là tự đặt tạm.
- Bộ Sưu Tập (đặt tạm): đề ghi "MẢNH 34/60" và "Đủ 60 mảnh" nhưng giá đổi lại khác nhau theo độ hiếm (20/40/60/150), nên viên Mảnh hiện số mảnh kèm mốc giá kế tiếp chưa đủ (34/40 = thẻ Hiếm) và hộp thoại ghi "Chọn 1 linh vật chưa có". Số mảnh mỗi bản trùng theo đề màn Quay thẻ là Thường 2 · Hiếm 4 · Sử Thi 8 · Huyền Thoại 20 (`GACHA.shardsPerDuplicate`); vì vậy chi tiết Bánh Bao Sấm giờ hiện "2 bản trùng → +4 mảnh" thay vì "+6" như đề Album. Thẻ chưa có vẫn hiện độ hiếm; trong hộp đổi mảnh chỉ thấy hình bóng. Bấm thẻ chưa có chỉ báo thông báo. Mở chi tiết thì bỏ nhãn "MỚI". Tỉ lệ lượt đặc biệt tạm đặt Thường 30 · Hiếm 45 · Sử Thi 20 · Huyền Thoại 5 (`GACHA.specialRates`), cần chốt.
- Quay thẻ (đặt tạm): pity tính chung cho cả lượt thường và lượt đặc biệt, ra Sử Thi hoặc Huyền Thoại đều đặt lại về 0; thanh pity chuyển tím khi đạt 80% (16/20). "Mở tất cả" mở hết số lượt của tab đang chọn. Viên Lượt quay ở Album hiện tổng hai loại lượt (3). Khi mở nhiều thẻ, nút avatar/chia sẻ áp dụng cho thẻ đang ở giữa (bấm thẻ nhỏ để đổi). Khi bật giảm chuyển động thì bỏ qua hoạt cảnh, hiện thẳng kết quả.
- Hồ sơ (đặt tạm): huy hiệu thành tích, tên và điều kiện (ví dụ "Nghìn từ", "Sát thủ từ vựng: K.O. 50 lần", "Cửa Ải hoàn hảo 30 lần") là tự đặt; "Phá đảo A1" tạm tính là thuộc hết từ A1. Số từ mỗi cấp (500/800/1.500/2.200/2.500/2.500) là số mẫu. Độ ghi nhớ tính trên 30 ngày gần nhất. Hồ sơ người khác ẩn độ ghi nhớ và từ khó nhất. Ảnh bìa chỉ đổi màu theo rank, cùng họa tiết kim cương. Thách đấu tạm mở phòng riêng; cài đặt chỉ báo "sắp ra mắt". Tên người dùng 3–24 ký tự chữ thường, số, dấu chấm, gạch dưới.
- Lên rank / Thẻ chứng nhận (đặt tạm): liên kết hồ sơ dùng `wordclash.vn/@<handle>` nên thẻ ghi `wordclash.vn/@nhan.wordclash` (đề ghi `@nhan`); "Streak 31 ngày" trên thẻ mẫu không khớp ngày tham gia 09/2026 (tối đa 30 ngày); mã chứng nhận dạng `#WC-năm-số thứ tự 5 chữ số`; Instagram không có liên kết chia sẻ trên web nên dùng bảng chia sẻ của máy hoặc tải ảnh kèm hướng dẫn; Tân Binh không có màn lên rank (là rank khởi đầu). Đã thêm thư viện `qrcode`.
- Bảng xếp hạng (đặt tạm): vùng thưởng và phần thưởng tuần chỉ áp dụng bảng toàn quốc; số lượng thưởng (hạng 1: huy hiệu + khung vàng + 3 lượt quay; hạng 2–3: huy hiệu + khung bạc + 2 lượt; hạng 4–10: huy hiệu + 1 lượt) là tự đặt; câu động viên tính "thêm (điểm người trên − điểm mình + 1)"; mùa tuần kết thúc theo thời điểm server trả; thách đấu tạm mở phòng riêng; link mời tạm `wordclash.vn/moi/<handle>`.
- Bản đồ hành trình (đặt tạm): vùng đất A1 Việt Nam – Miền Bắc (`vn-north`), A2 Miền Trung & Nam (`vn-central-south`), B1 Anh, B2 Mỹ, C1 Úc, C2 Thế giới; số chặng A1 10 · A2 10 · B1 9 · B2–C2 tạm 11 (tổng 62, nên "22/62"); tên các bài trong chặng A1, A2 là nội dung nháp; địa danh A1, A2 theo danh sách người dùng đưa (khớp `backend/seeds/seed_landmarks.py`); Trận Boss A1, A2 là đảo lớn đứng sau trạm Boss, khi Boss còn khóa đảo vẫn hiện đầy màu để thấy đích đến; địa danh mới khi khóa xám mờ phủ mây, tranh B1 khi khóa vẫn chỉ hiện bóng; 9 chủ đề chặng B1 và danh sách bài trong chặng là tự đặt, các nhánh dùng chung địa danh, chỉ khác bài ở vài chặng; cấp chưa có tranh riêng dùng cột mốc chung và hồ Boss chung; câu "Bạn có biết?" là nội dung nháp; nhà du hành dùng linh vật đại diện #077; sương bắt đầu giữa trạm hiện tại và trạm kế tiếp, Big Ben (địa danh đang tới) nổi trên sương.
- Sảnh (đặt tạm): "Khóa học của tôi" và "Hành trình" nằm ở hàng dưới trải hết 12 cột (7 + 5) thay vì trong cột trái như đề, vì đặt trong cột trái làm cột trái dài hơn cột phải ~800px; widget bạn bè giãn hết phần còn lại để hai cột kết thúc ngang nhau và có thêm câu "Học thêm N từ để vượt …" cùng nút Xem bảng xếp hạng. "Hộ chiếu 14/54 địa danh" theo đề, chưa khớp bản đồ lộ trình (A1, A2 đã xong là 22 địa danh; tổng 62 chặng + 6 Boss). Dữ liệu 30 linh vật trong `data/mascots.js` (Bông Tím #001 Thường…) chưa khớp 100 linh vật của Bộ Sưu Tập (đánh số theo độ hiếm); Sảnh dùng bản mới, các màn khác giữ bản cũ. Linh vật vẽ tạm bằng MascotBlob (chưa có ShapeMascot). Biến thể người mới cũng dùng Bông Tím. Nút "Đã biết" chỉ báo toast. Biến thể người mới luôn hiện card Khóa học trống. Icon 6 vùng đất ở dải Hành trình vẽ riêng cỡ nhỏ (`pages/Lobby/RegionIcon.jsx`).
- Cảnh bay (đặt tạm): B2 đổi tên vùng thành "Mỹ & Canada" (cờ vẫn là cờ Mỹ); nút "Khám phá" ở màn thắng Boss đổi thành "Bay tới …" dẫn vào `/travel`; onboarding chọn "Bắt đầu từ A1" giờ đi qua màn "Hành trình bắt đầu từ đây" rồi vào bản đồ A1 thay vì về Sảnh; hoạt cảnh mới vẽ cho chặng B1 → B2 (hồ Loch Ness, New York), các cấp khác chưa có cảnh riêng; nút Bắt đầu hành trình dẫn tới `/academy?level=B2` (dữ liệu mẫu vẫn khóa B2).
- Khóa học của tôi (đặt tạm, chi tiết ở cuối `docs/courses.md`): bảng xem trước có thêm trạng thái `match_own` (khớp từ mình đã tự tạo, đề chỉ có 4 trạng thái); giới hạn 50 khóa tính cả khóa đã lưu trữ; trả lời sai trong khóa học không làm mất `mastered` (chỉ Cửa Ải chuyển `forgotten`); `quick`/`test` cũng cập nhật SRS; giới hạn 20 từ mới/ngày (`DAILY_NEW_WORDS_LIMIT`) áp cho chế độ học mới và tính chung với Học Viện; câu nghe (mức 2) chỉ có khi mục từ có `audio_url`, không thì đổi sang mức 1; khóa nhỏ thì phiên ôn nhanh/kiểm tra có ít hơn 20 câu (mỗi cặp từ–mức chỉ hỏi một lần); "Từ của tôi đã thuộc" = số từ khác nhau đã thuộc trong các khóa đang học (gồm cả từ kho); tạo từ trùng chữ với kho thì gợi ý dùng bản kho, gửi `force` vẫn tạo từ riêng; 24 icon và 6 màu khóa học; xóa hẳn khóa giữ nguyên tiến độ và từ tự tạo; 54 mục từ mẫu ở `data/mockCourses.js` là nội dung nháp.
- Chưa có trang: phiên ôn tập (`/academy/review/session` đang là trang tạm), kiểm tra chặng (nút trên bản đồ tạm mở giao diện kiểm tra cuối bài), quên mật khẩu. Các nút dẫn tới đó đang rơi vào trang "Không tìm thấy trang" hoặc trang tạm `ComingSoon`.
- Chưa chặn vào Sảnh khi chưa làm Cửa Ải (cần server biết ngày theo múi giờ người dùng; TODO trong `App.jsx`).
- Chưa có đăng nhập Google, trang Điều khoản/Chính sách.
- Backend: phần lớn model, route, service và test của Giai đoạn 1 vẫn chưa viết (đã có auth, `levels`/`topics`, seed địa danh). Khi nối frontend với auth: làm theo mục "Hướng dẫn tích hợp frontend" trong `docs/auth.md` (form Đăng ký cần thêm ô username và gửi `display_name`; Đăng nhập gửi `identifier`). Tên cấp A1/A2 trong seed lấy theo `LEVEL_NAMES` (đặt tạm). Seed có 22 địa danh: 10 chặng mỗi cấp trong `topics` + Boss lưu ở `levels.boss_landmark_*`; tên quái vật canh giữ (Rồng Vịnh, Bàn Tay Núi) chưa có cột trong DB. PostgreSQL của Docker mở ở cổng **5433** trên máy (tránh PostgreSQL cài sẵn ở 5432).
- Repo đã khởi tạo git (02/10/2026), nhánh `main` chứa hiện trạng ban đầu, auth làm trên nhánh `feat/auth-phase1`; chưa có remote.

## Công nghệ

- **Backend:** Python 3.12+, FastAPI, Uvicorn, Pydantic v2, pydantic-settings, SQLAlchemy 2.0 async + asyncpg, Alembic, PyJWT (OAuth2PasswordBearer), pwdlib[argon2] (không dùng passlib), python-socketio `AsyncServer` (ASGI) + `AsyncRedisManager`, redis.asyncio; PostgreSQL; Redis; pytest, pytest-asyncio, httpx.
- **Frontend:** React (Vite, JSX, không dùng TypeScript), React Router, Tailwind, Zustand, Axios, socket.io-client, Framer Motion, Lottie, Howler, canvas-confetti, @phosphor-icons/react.
- **Kho từ:** các script Python và pandas trong `backend/data_pipeline/`, chạy theo thứ tự `01_` → `07_`.

## Kiến trúc và quy ước

### Backend
- Điểm vào: `app/main.py` tạo `FastAPI`, gắn `CORSMiddleware` (origin = `FRONTEND_URL`), exception handler, router `/api/v1`, rồi bọc Socket.IO: `asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)`. Chạy bằng `uvicorn app.main:asgi_app`. `lifespan` kiểm tra kết nối DB, mở/đóng Redis và giải phóng engine.
- `core/config.py`: `Settings` (pydantic-settings) đọc `.env` ở **gốc repo**; có `ENV` (development/testing/production), `DATABASE_URL` (URL `postgres://`/`postgresql://` tự đổi sang `postgresql+asyncpg://`), `TEST_DATABASE_URL`, `REDIS_URL`, token (`ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`), cookie (`COOKIE_*`), giới hạn (`LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_SECONDS`, `REGISTER_MAX_PER_HOUR`, `MAX_SESSIONS_PER_USER`), `TRUST_PROXY`, `SIO_USE_REDIS`, `FRONTEND_URL` và **mọi hằng số luật game** (`DAILY_FORGET_PENALTY`, `UNIT_PASS_RATE`, `BOSS_PASS_RATE`, `RANK_GRACE_DAYS`, `SPIN_EVERY_N_WORDS`, `PITY_EPIC`, `MATCH_HP`, `MATCH_QUESTIONS`, `DMG_*`, `FAST_MS`, `COMBO_MULT`, `WRONG_SELF_DMG`). Không rải các con số này trong code. `ENV=testing` thì dùng `TEST_DATABASE_URL`. `ENV=production` mà `JWT_SECRET_KEY` ngắn hơn 32 ký tự thì app không khởi động.
- `core/database.py`: `Base` (DeclarativeBase, có quy ước tên ràng buộc), async engine (`hide_parameters`, timeout kết nối 5 giây) + `async_sessionmaker`; `get_db()` cấp một `AsyncSession` mỗi request. `core/redis.py`: `get_redis()` trả `None` khi Redis không chạy (app vẫn khởi động được). `core/security.py`: băm mật khẩu, JWT, refresh token. `core/errors.py`: `AppError`, bảng mã lỗi, exception handler.
- `api/deps.py`: `DbSession`, `RedisClient`, `CurrentUser` (= `Depends(get_current_user)`, Bearer qua OAuth2PasswordBearer `tokenUrl=/api/v1/auth/token`), `get_current_active_admin`, `require_verified_email` (chưa gắn), `ClientIp`, `UserAgent`, `check_origin`. `api/v1/routers/` chỉ nhận request bằng schema Pydantic (`schemas/`), gọi service, trả `response_model` (schema trực tiếp, không bọc khung), khai báo `status_code`, `summary` tiếng Việt và `responses=error_responses(...)` (`api/responses.py`) để /docs liệt kê mã lỗi. **Không đặt logic nghiệp vụ trong router.** Router mới phải thêm vào `api/v1/__init__.py`.
- **Định dạng phản hồi:** thành công trả **thẳng dữ liệu** (schema của route, không bọc `{success, message, data}`; khung cũ đã bỏ cùng `utils/responses.py`). **Lỗi luôn dùng `AppError(code, …)`** (`core/errors.py`), không trả `HTTPException` hay JSON tự chế; handler chung đổi thành `{"error": {"code", "message", "details"}}` với `message` tiếng Việt. 422 của Pydantic thành `VALIDATION_ERROR`, `details` = `[{field, message}]`; 401/403/404/405/500 cùng định dạng. Mã mới thêm vào bảng `ERRORS`.
- `services/`: hàm tính luật thuần (srs, mastery, question_builder, course_import, unlock, rank, gacha, `game/scoring.py`) viết **đồng bộ, không phụ thuộc DB** để dễ test; hàm đọc/ghi DB viết `async` và nhận `session` làm tham số. Mọi câu trả lời của người học ghi qua `progress_service.record_answer` (SRS, trạng thái thuộc, nhật ký, bộ đếm).
- **Mọi truy vấn `entries` phía người học phải lọc bằng `Entry.visible_to(user_id)`** (từ hệ thống đã duyệt, hoặc từ tự tạo của chính người đó). Gợi ý từ kho, đáp án nhiễu bổ sung và Cửa Ải Hôm Nay chỉ dùng `Entry.system_approved()`.
- `models/`: SQLAlchemy 2.0 (`Mapped[]`, `mapped_column`), kế thừa `core.database.Base`. Mọi model mới phải import trong `app/models/__init__.py` để Alembic thấy. Model có cột do DB sinh (`server_default`, `onupdate`) đặt `__mapper_args__ = {"eager_defaults": True}` để tránh lazy load trong async. Enum lưu dạng VARCHAR + CHECK (`native_enum=False`) để migration lùi/tiến không vướng kiểu ENUM của PostgreSQL.
- Thay đổi schema phải có migration Alembic (`backend/alembic/versions/`, `env.py` dạng async, URL lấy từ settings). **Sau khi deploy lần đầu, KHÔNG viết lại migration cũ, chỉ thêm migration mới.** (Trước lần deploy đầu đã viết lại một lần khi đổi id người dùng sang UUID.)
- `game/`: `sio_server.py` tạo `sio = AsyncServer(async_mode="asgi")` (thêm `AsyncRedisManager` khi `SIO_USE_REDIS`) và xác thực access token trong `connect` (`auth.token`; sai/hết hạn thì từ chối với mã TOKEN_INVALID/TOKEN_EXPIRED), lưu `{user_id, role}` vào session socket, vào room `user:{id}`; `events.py` đăng ký các sự kiện trận đấu. Trạng thái trận lưu trong Redis; chỉ ghi PostgreSQL khi trận kết thúc. Đo thời gian bằng `game/timing.py` (`time.monotonic()`).
- Không dùng thư viện đồng bộ chặn luồng (requests, psycopg2, redis đồng bộ) trong hàm async. Việc nặng CPU (băm mật khẩu) chạy qua `asyncio.to_thread`.
- Triển khai: `uvicorn app.main:asgi_app --host 0.0.0.0 --port $PORT`; ban đầu 1 worker, nhiều worker thì bật sticky session.
- Mọi thay đổi trong `services/` và `game/scoring.py` phải kèm test pytest. Test chia `tests/unit/` (hàm thuần), `tests/integration/` (service trên PostgreSQL test thật, mỗi test rollback), `tests/api/` (httpx + ASGITransport, `get_db`/`get_redis` được thay bằng session test và fakeredis; Socket.IO qua uvicorn chạy thật).

### Auth (quy tắc bắt buộc, chi tiết ở `docs/auth.md`)
- Access token (JWT 15 phút) chỉ giữ trong bộ nhớ phía client (Zustand). **Không lưu token ở localStorage/sessionStorage.**
- Refresh token **chỉ nằm trong cookie httpOnly** `wc_refresh` (path `/api/v1/auth`); DB chỉ lưu SHA-256. Mỗi lần refresh là xoay vòng; token cũ bị dùng lại thì hủy cả phiên, trừ khoảng ân hạn `REFRESH_REUSE_GRACE_SECONDS` cho token vừa xoay vòng (nhiều tab). Frontend dùng `navigator.locks` để chỉ một tab refresh tại một thời điểm.
- Mọi route cần đăng nhập dùng `Depends(get_current_user)` (`CurrentUser`); route quản trị dùng `get_current_active_admin`.
- Mọi lỗi dùng `AppError` với mã trong bảng `ERRORS`, không trả `HTTPException` hay JSON tự chế.
- Route đọc cookie phải có `dependencies=[Depends(check_origin)]`: chỉ chấp nhận `FRONTEND_URL`; origin của chính API chỉ được chấp nhận khi `ENV` khác production. Ở production `/docs`, `/redoc`, `/openapi.json` tắt trừ khi `ENABLE_DOCS=true`.
- IP người dùng luôn lấy qua `ClientIp` (`get_client_ip`); sau reverse proxy đặt `TRUST_PROXY=true` và `TRUSTED_PROXY_HOPS`. Trước khi deploy đi theo `docs/deploy-checklist.md`.
- Giới hạn tần suất đi qua `services/rate_limit.py`; Redis hỏng thì tự chuyển sang bộ đếm trong bộ nhớ, không chặn đăng nhập.
- Không log mật khẩu, token, mã băm hay body của request auth. Không lưu refresh token dạng gốc.
- ID người dùng là UUID. Email, username lưu chữ thường.

### Frontend
- Component chia theo khu: `components/{ui,layout,academy,game,collection}`; trang nằm trong `pages/`.
- Gọi API qua `services/` (base `/api/v1`). State dùng chung đặt trong `store/` (Zustand). Kết nối socket qua `hooks/useSocket.js`.
- Màu, font, bo góc lấy từ `styles/tokens.css`. **Không hard-code mã màu trong component.**

### Đặt tên và ngôn ngữ
- Tên biến, hàm, file, bảng, API viết bằng tiếng Anh, dạng `snake_case` cho Python và `camelCase` cho JS; component dùng `PascalCase`.
- Chữ hiển thị trên giao diện bằng **tiếng Việt**; từ vựng đang học bằng tiếng Anh.
- Comment và docstring viết bằng tiếng Việt.

## Luật nghiệp vụ bắt buộc (không tự ý đổi)

### Học tập
- Câu hỏi có 4 mức: (1) chọn nghĩa, (2) nghe chọn từ, (3) gõ từ từ nghĩa, (4) điền vào câu.
- **Đã thuộc (`mastered`)**: đúng ở mức ≥ 3, vào ≥ 3 ngày khác nhau.
- Trạng thái mục từ: `new` → `learning` → `mastered` → `forgotten` (quay về `learning` khi ôn).
- SRS: bắt đầu với SM-2, khoảng ôn tham khảo 1 → 3 → 7 → 16 → 35 ngày.
- Giới hạn 10–20 từ mới mỗi ngày.
- Mỗi bài học gồm 15–20 mục từ.

### Mở khóa
- Qua bài: đạt ≥ 80%.
- Qua chặng: hoàn thành mọi bài và đạt bài tổng hợp.
- Qua cấp: vượt Trận Boss (khoảng 50 câu, đạt ≥ 85%).
- Kiểm tra xếp lớp mở thẳng tới cấp phù hợp, nhưng từ ở các cấp bỏ qua **không** tự tính là `mastered`.
- Phần đã mở thì không bao giờ khóa lại.

### Khóa học của tôi (chi tiết ở `docs/courses.md`)
- Từ có sẵn trong kho chỉ được **liên kết** vào khóa học, không sao chép; tiến độ dùng chung với Học Viện và tính rank, lượt quay như bình thường.
- **Từ tự tạo** (`entries.source = user`) chỉ chủ sở hữu nhìn thấy; được học, ôn, có trong danh sách ôn chung, nhưng **không tính rank, không cho lượt quay, không xuất hiện ở Cửa Ải Hôm Nay**. Chỉ cộng vào `custom_mastered_count`; `mastered_count` chỉ đếm từ hệ thống.
- Bộ từ riêng chỉ dùng ở Phòng riêng của Đấu Trường, không dùng cho trận xếp hạng.
- Khóa học luôn riêng tư (cột `visibility` để sẵn). Khóa học, phiên học, từ tự tạo của người khác trả 404.

### Kho từ
- Chỉ các mục có `status = approved` mới được hiện cho người học.
- Ba nhánh dùng chung mục từ: tiến độ gắn với mục từ, không gắn với nhánh.

### Cửa Ải Hôm Nay
- Bắt buộc ở lần mở web đầu tiên trong ngày, **tính theo múi giờ của người dùng**.
- Hỏi 2–5 từ đã học, ưu tiên từ đến hạn ôn và trộn thêm ngẫu nhiên.
- Trả lời sai: từ chuyển sang `forgotten`, số từ thuộc −1 (giá trị này lấy từ config), từ vào danh sách ôn gấp.
- Đúng hết: streak +1. Streak 7 ngày được +1 lượt quay.

### Rank (theo số từ đã thuộc)
Tân Binh 0–99 · Đồng 100–299 · Bạc 300–599 · Vàng 600–999 · Bạch Kim 1.000–1.999 · Kim Cương 2.000–3.499 · Cao Thủ 3.500–4.999 · Huyền Thoại 5.000+.
Khi rơi dưới mốc, người dùng có **vùng đệm 3 ngày** trước khi bị tụt rank thật.

### Vòng quay
- Mỗi 50 từ thuộc được +1 lượt; lên rank được 1 lượt **đặc biệt** (tỉ lệ ra thẻ hiếm cao hơn); streak 7 ngày được +1 lượt.
- Tỉ lệ: Thường 60% (45 con) · Hiếm 28% (30 con) · Sử Thi 10% (18 con) · Huyền Thoại 2% (7 con).
- Pity: 20 lượt liên tiếp không ra Sử Thi thì lượt kế tiếp chắc chắn ra Sử Thi.
- Thẻ trùng đổi thành mảnh; đủ mảnh được tự chọn một linh vật **chưa có**. Giá đổi (theo đề thiết kế Album): Thường 20 · Hiếm 40 · Sử Thi 60 · Huyền Thoại 150 mảnh.
- **Linh vật chỉ để trang trí, không bao giờ ảnh hưởng tới gameplay** (chỉ làm avatar và nhân vật trong trận). Không bao giờ hiện chỉ số kiểu "tấn công", "phòng thủ".
- **Không bán lượt quay bằng tiền.** Tỉ lệ quay luôn được công khai trên giao diện.

### Đấu Trường
- Mỗi bên 100 HP; tối đa 20 câu, sau đó so máu còn lại.
- Người đúng trước gây 10 sát thương. Đúng trong < 2 giây: +5. Đúng 3 câu liên tiếp: phát tiếp theo x1.5. Sai: tự mất 5 HP. Cả hai sai hoặc hết giờ: không ai mất máu.
- Câu hỏi chỉ lấy từ các cấp mà **cả hai** người chơi đều đã mở khóa.
- Sự kiện socket: `join_queue`, `leave_queue`, `create_room`, `join_room`, `match_found`, `round_start`, `submit_answer`, `round_result`, `match_end`.
- Các hằng số trong mục này đặt trong config hoặc constants, **không** rải trong code.

## Bảo mật và công bằng (quan trọng)

- **Server là trọng tài.** Client không bao giờ tự tính đúng/sai, sát thương, tỉ lệ quay hay số từ thuộc.
- **Không gửi đáp án đúng xuống client** trước khi lượt hoặc bài kiểm tra kết thúc.
- Thời gian trả lời đo ở server.
- Kết quả quay thẻ sinh ở server.
- Mật khẩu phải được băm; API cần đăng nhập phải dùng JWT.

## Giao diện

Chuẩn hiện tại là **bản sáng** (đã thay hẳn bản dark mode cũ). Xem trực quan ở trang `/design-system`.

- Phong cách: tươi sáng, năng lượng cao, neo-brutalism sáng (tinh thần Gumroad, Duolingo, game casual). Nền kem, khối màu kẹo; viền mực 2.5px (utility `border-thick`), bo góc 20–28px, bóng cứng màu `#1B1535` lệch 4px xuống dưới-phải, không làm mờ. Nhấn nút: dịch 4px và mất bóng (utility `pressable`).
- Có vài "sticker" nghiêng 3–6 độ để trang trí (component `Sticker`). Mỗi màn chỉ một hành động chính nổi bật.
- Màu: nền `#FFF8EC`, bề mặt `#FFFFFF`, bề mặt phụ `#F3EEFF`, viền/chữ chính `#1B1535`, chữ phụ `#5B5480`, tím điện `#6C4DFF` (thương hiệu, nút chính), xanh chanh `#B8F53A` (đúng, thưởng, tiến độ), hồng `#FF4D8D` (sai, sát thương), vàng `#FFD43B` (streak, thưởng), xanh trời `#3DC7FF` (thông tin, Học Viện), cam `#FF8A3D` (Đấu Trường). Chữ màu trên nền sáng dùng bản `-deep` trong tokens để đủ tương phản.
- Font: **Be Vietnam Pro** 800–900 cho tiêu đề lớn (`font-heading`); **Chakra Petch** in hoa cho số, nhãn game, nút (`font-display`); Be Vietnam Pro 400–500 cho nội dung. Cả hai phải hiển thị đúng dấu tiếng Việt. Không dùng chữ nhỏ hơn 13px (trừ nhãn tab mobile 11px).
- Icon: chỉ dùng Phosphor kiểu `fill`, tô màu phẳng, thường đặt trong ô tròn/vuông có viền mực (`IconBadge`). Không dùng emoji thay icon.
- Linh vật: tác giả sẽ tự vẽ; tạm dùng `MascotBlob` (khối tròn có mắt, nhiều màu). Không vẽ nhân vật có bản quyền.
- Tránh: glassmorphism/backdrop-blur, gradient tím-xanh kiểu "AI template", ảnh stock, chữ li ti, quá nhiều hiệu ứng cùng lúc.
- **Đấu Trường** phải cho cảm giác đang chơi game đối kháng thật (tinh thần Clash Royale, Brawl Stars), không giống trang làm trắc nghiệm, nhưng vẫn giữ viền đen dày, bóng cứng, màu kẹo neon và font Chakra Petch cho mọi số và nhãn game.
  - Khu này được phép phong phú hơn các khu khác. Nền sân đấu có 3 lớp: bầu trời/phông xa, sân đấu, tiền cảnh. Có thể dùng hạt hiệu ứng, vệt tốc độ, số sát thương bay lên, rung màn hình, "hit-stop" (đứng hình ngắn khi trúng đòn) và chữ lớn giữa màn ("READY", "FIGHT!", "K.O.!"). Tất cả phải tắt được khi người dùng bật giảm chuyển động.
  - Phe người chơi màu tím `primary`, luôn ở bên TRÁI trên desktop và ở DƯỚI trên mobile. Phe đối thủ màu cam `orange`, luôn ở bên PHẢI trên desktop và ở TRÊN trên mobile.
  - Sát thương dùng hồng `danger`, chí mạng (phát x1.5 sau 3 câu đúng liên tiếp) dùng vàng `gold` kèm chữ "CHÍ MẠNG", đúng dùng xanh chanh `accent`.
  - Giao diện phải thể hiện đúng luật ở mục Đấu Trường bên dưới. Linh vật không có chỉ số sức mạnh.
- **Bộ Sưu Tập & Hồ Sơ** phải cho cảm giác mở gói thẻ bài sưu tầm và khoe thành tích trong game: vui, lấp lánh, đáng tự hào, vẫn giữ neo-brutalism sáng.
  - Khung thẻ theo độ hiếm, dùng thống nhất ở mọi nơi (Bộ Sưu Tập, vòng quay, Hồ Sơ, avatar…):
    - Thường: viền đen, nền kem, dải nhãn xám.
    - Hiếm: nền xanh trời `#3DC7FF`, 1 ngôi sao.
    - Sử Thi: nền tím điện `#6C4DFF`, 2 ngôi sao, quầng sáng nhẹ quanh thẻ.
    - Huyền Thoại: nền vàng `#FFD43B` có họa tiết tia sáng, 3 ngôi sao, viền kép, hạt lấp lánh chuyển động, hiệu ứng ánh kim (holographic, lóe cầu vồng theo góc nghiêng) khi rê chuột. Hiệu ứng tắt khi giảm chuyển động.
    - Mọi thẻ tỉ lệ 3:4, bo góc 20px; trên thẻ có số thứ tự dạng `#037`, tên linh vật và nhãn độ hiếm.
  - Linh vật tạm dùng `MascotBlob`, mỗi con một màu và dáng khác nhau (100 con).
- Responsive cho desktop 1440px và mobile 390px; mọi thứ bấm được cao tối thiểu 44px. Desktop có thanh bên trái; mobile có tab dưới đáy gồm Sảnh, Học Viện, Đấu Trường, Bộ Sưu Tập, Hồ Sơ.

## Dữ liệu và bản quyền

- Không sao chép nguyên văn định nghĩa hay ví dụ từ các từ điển có bản quyền (Oxford, Cambridge…). Oxford 3000/5000 và English Vocabulary Profile chỉ dùng để tham khảo cách phân cấp.
- Ưu tiên danh sách có giấy phép mở (NGSL, NAWL, TSL, BSL).
- Nội dung do AI tạo phải để ở trạng thái `draft` cho tới khi được duyệt.

## Khi chưa rõ

Các điểm sau **chưa được chốt**. Hãy hỏi trước thay vì tự quyết:

- tên chính thức và logo;
- mức trừ khi quên từ;
- có cho chọn thứ tự chặng trong cùng một cấp hay không;
- ngưỡng 80% và 85%;
- mô hình kiếm tiền (đã chốt một điểm: không bán lượt quay bằng tiền);
- nguồn danh sách từ cụ thể.

## Lệnh thường dùng

```bash
docker compose up -d                          # PostgreSQL ở localhost:5433 (+ database wordclash_test) và Redis
cp .env.example .env                          # lần đầu (file .env đặt ở gốc repo)
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head                          # áp dụng migration
alembic revision --autogenerate -m "..."      # sinh migration sau khi sửa model
python -m seeds.seed_landmarks                # nạp địa danh A1, A2 (chạy lại được)
uvicorn app.main:asgi_app --reload            # API + Socket.IO, cổng 8000; tài liệu API tại /docs
pytest -q                                     # chạy trong backend/; cần PostgreSQL test (TEST_DATABASE_URL, mặc định wordclash_test)
pytest tests/unit -q                          # chỉ test đơn vị (không cần DB)
pytest tests/api/test_auth_api.py::test_refresh_rotation_and_reuse_detection -v   # chạy một test
cd frontend && npm install && npm run dev     # dev server ở cổng 5173 (FRONTEND_URL), proxy sang 8000
cd frontend && VITE_USE_MOCK=false npm run dev  # Khóa học của tôi gọi backend thật thay vì mock (cần access token)
cd frontend && npm run build                  # kiểm tra build production
```

Kho từ: chạy lần lượt các script `backend/data_pipeline/01_*.py` → `07_*.py`. Dữ liệu mẫu nằm trong `backend/seeds/`.

Luôn trả lời lại cho tôi bằng tiếng Việt nhé