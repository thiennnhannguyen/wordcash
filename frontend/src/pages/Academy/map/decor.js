/*
 * PHẦN TRANG TRÍ của bản đồ Học Viện (không phải dữ liệu học): icon và chữ trên con dấu của từng địa danh (tra theo
 * `landmark_key` mà server trả), Trận Boss (quái vật canh giữ, kiểu cảnh), câu "Bạn có biết?" về địa danh đang tới (nội dung
 * nháp tự viết), kiểu con dấu, tên các nhánh, mẹo học. Trạng thái mở/khóa, điểm, số từ, ngày đến địa danh luôn lấy từ
 * GET /academy/roadmap (pages/Academy/roadmapAdapter.js). Tên chặng ở đây chỉ để khớp tranh, không hiển thị thay tên server.
 */

import {
  Bank,
  Briefcase,
  Buildings,
  Bus,
  Carrot,
  Chats,
  Clock,
  CloudSun,
  Coins,
  Compass,
  Confetti,
  ForkKnife,
  GameController,
  GraduationCap,
  Handshake,
  Heartbeat,
  House,
  MaskHappy,
  Mountains,
  ShoppingBag,
  Smiley,
  SuitcaseRolling,
  Tree,
  Umbrella,
  UsersThree,
} from '@phosphor-icons/react'
export const BRANCHES = [
  { key: 'core', label: 'Nền tảng' },
  { key: 'ielts', label: 'IELTS' },
  { key: 'toeic', label: 'TOEIC' },
]

// Chín chặng B1 · Vương quốc Anh, từ dưới lên. `landmark_key` tra trong components/academy/landmarks/landmarkRegistry.js.
const B1_STAGES = [
  { title: 'Giao tiếp hằng ngày', icon: Chats, landmark_key: 'tower_bridge', landmark_name: 'Tower Bridge', stamp: 'TOWER BRIDGE' },
  { title: 'Mua sắm', icon: ShoppingBag, landmark_key: 'london_eye', landmark_name: 'London Eye', stamp: 'LONDON EYE' },
  { title: 'Công việc', icon: Briefcase, landmark_key: 'big_ben', landmark_name: 'Big Ben', stamp: 'BIG BEN' },
  { title: 'Sức khỏe', icon: Heartbeat, landmark_key: 'buckingham', landmark_name: 'Cung điện Buckingham', stamp: 'BUCKING\nHAM' },
  { title: 'Giáo dục', icon: GraduationCap, landmark_key: 'oxford', landmark_name: 'Đại học Oxford', stamp: 'OXFORD' },
  { title: 'Lịch sử', icon: Bank, landmark_key: 'stonehenge', landmark_name: 'Stonehenge', stamp: 'STONE\nHENGE' },
  { title: 'Du lịch', icon: SuitcaseRolling, landmark_key: 'bath', landmark_name: 'Nhà tắm La Mã ở Bath', stamp: 'BATH' },
  { title: 'Văn hóa', icon: MaskHappy, landmark_key: 'edinburgh', landmark_name: 'Lâu đài Edinburgh', stamp: 'EDIN\nBURGH' },
  { title: 'Thiên nhiên', icon: Mountains, landmark_key: 'highlands', landmark_name: 'Cao nguyên Scotland', stamp: 'HIGH\nLANDS' },
]

// A1 · Việt Nam – Miền Bắc và A2 · Việt Nam – Miền Trung & Nam (khớp seed backend/seeds/seed_landmarks.py).
const A1_STAGES = [
  { title: 'Chào hỏi', icon: Handshake, landmark_key: 'a1_ho_guom', landmark_name: 'Hồ Gươm & Tháp Rùa', stamp: 'HỒ GƯƠM' },
  { title: 'Gia đình', icon: UsersThree, landmark_key: 'a1_van_mieu', landmark_name: 'Văn Miếu – Khuê Văn Các', stamp: 'VĂN MIẾU' },
  { title: 'Số đếm và thời gian', icon: Clock, landmark_key: 'a1_chua_mot_cot', landmark_name: 'Chùa Một Cột', stamp: 'MỘT CỘT' },
  { title: 'Đồ ăn', icon: ForkKnife, landmark_key: 'a1_pho_co', landmark_name: 'Phố cổ Hà Nội & Ô Quan Chưởng', stamp: 'PHỐ CỔ' },
  { title: 'Nhà cửa', icon: House, landmark_key: 'a1_mu_cang_chai', landmark_name: 'Ruộng bậc thang Mù Cang Chải', stamp: 'MÙ CANG\nCHẢI' },
  { title: 'Đi lại', icon: Bus, landmark_key: 'a1_cau_long_bien', landmark_name: 'Cầu Long Biên', stamp: 'LONG BIÊN' },
  { title: 'Mua sắm', icon: ShoppingBag, landmark_key: 'a1_cho_dong_xuan', landmark_name: 'Chợ Đồng Xuân', stamp: 'ĐỒNG XUÂN' },
  { title: 'Thời tiết', icon: CloudSun, landmark_key: 'a1_fansipan', landmark_name: 'Fansipan – Sa Pa', stamp: 'FANSIPAN' },
  { title: 'Thiên nhiên', icon: Tree, landmark_key: 'a1_trang_an', landmark_name: 'Tràng An – Ninh Bình', stamp: 'TRÀNG AN' },
  { title: 'Trường học và học tập', icon: GraduationCap, landmark_key: 'a1_ma_pi_leng', landmark_name: 'Đèo Mã Pí Lèng – Hà Giang', stamp: 'MÃ PÍ\nLÈNG' },
]

const A2_STAGES = [
  { title: 'Công việc hằng ngày', icon: Briefcase, landmark_key: 'a2_dai_noi_hue', landmark_name: 'Đại Nội Huế – Ngọ Môn', stamp: 'ĐẠI NỘI' },
  { title: 'Cảm xúc', icon: Smiley, landmark_key: 'a2_chua_thien_mu', landmark_name: 'Chùa Thiên Mụ', stamp: 'THIÊN MỤ' },
  { title: 'Lễ hội', icon: Confetti, landmark_key: 'a2_hoi_an', landmark_name: 'Phố cổ Hội An – Chùa Cầu', stamp: 'HỘI AN' },
  { title: 'Thành phố', icon: Buildings, landmark_key: 'a2_cau_rong', landmark_name: 'Cầu Rồng – Đà Nẵng', stamp: 'CẦU RỒNG' },
  { title: 'Khám phá', icon: Compass, landmark_key: 'a2_phong_nha', landmark_name: 'Phong Nha – Kẻ Bàng', stamp: 'PHONG NHA' },
  { title: 'Biển và kỳ nghỉ', icon: Umbrella, landmark_key: 'a2_mui_ne', landmark_name: 'Đồi cát Mũi Né', stamp: 'MŨI NÉ' },
  { title: 'Thời gian rảnh', icon: GameController, landmark_key: 'a2_da_lat', landmark_name: 'Ga Đà Lạt', stamp: 'ĐÀ LẠT' },
  { title: 'Tiền và giá cả', icon: Coins, landmark_key: 'a2_ben_thanh', landmark_name: 'Chợ Bến Thành', stamp: 'BẾN THÀNH' },
  { title: 'Kiến trúc', icon: Bank, landmark_key: 'a2_nha_tho_duc_ba', landmark_name: 'Nhà thờ Đức Bà Sài Gòn', stamp: 'ĐỨC BÀ' },
  { title: 'Nông sản và thực phẩm', icon: Carrot, landmark_key: 'a2_cho_noi_cai_rang', landmark_name: 'Chợ nổi Cái Răng – Cần Thơ', stamp: 'CÁI RĂNG' },
]

// Trận Boss cuối cấp: địa danh biểu tượng có "quái vật canh giữ"
export const BOSSES = {
  A1: { landmark_key: 'a1_boss_ha_long', landmark_name: 'Vịnh Hạ Long', guardian: 'Rồng Vịnh', stamp: 'HẠ LONG', scene: 'island' },
  A2: { landmark_key: 'a2_boss_cau_vang', landmark_name: 'Cầu Vàng Bà Nà', guardian: 'Bàn Tay Núi', stamp: 'CẦU VÀNG', scene: 'island' },
  B1: { landmark_key: null, landmark_name: 'Hồ Loch Ness', guardian: 'Quái vật hồ', stamp: 'LOCH NESS', scene: 'loch_ness' },
}
export const DEFAULT_BOSS = { landmark_key: null, landmark_name: 'Hồ quái vật', guardian: 'Quái vật', stamp: 'HỒ BOSS', scene: 'lake' }

// Câu "Bạn có biết?" cho địa danh đang tới (nội dung nháp, cần duyệt)
export const LANDMARK_FACTS = {
  tower_bridge: { text: 'Tower Bridge hay bị nhầm là London Bridge. Thật ra hai cây cầu nằm ngay cạnh nhau trên sông Thames!', words: ['bridge', 'river', 'confuse'] },
  london_eye: { text: 'Một vòng quay trên London Eye mất khoảng 30 phút, đủ để ngắm trọn London từ trên cao.', words: ['wheel', 'view', 'capsule'] },
  big_ben: { text: 'Big Ben thật ra là tên quả chuông, không phải tên tháp! Tháp đồng hồ tên là Elizabeth Tower.', words: ['bell', 'tower', 'clock'] },
  buckingham: { text: 'Khi cờ Hoàng gia bay trên nóc cung điện Buckingham, nghĩa là Nhà vua đang ở bên trong.', words: ['palace', 'guard', 'flag'] },
  oxford: { text: 'Đại học Oxford đã có người giảng dạy từ khoảng năm 1096, hơn 900 năm trước.', words: ['university', 'lecture', 'degree'] },
  stonehenge: { text: 'Những phần đầu tiên của Stonehenge có từ khoảng 5.000 năm trước. Tới giờ vẫn chưa ai chắc nó dùng để làm gì.', words: ['stone', 'ancient', 'mystery'] },
  bath: { text: 'Người La Mã xây nhà tắm ở Bath gần 2.000 năm trước, ngay trên một suối nước nóng tự nhiên.', words: ['bath', 'spring', 'steam'] },
  edinburgh: { text: 'Lâu đài Edinburgh được xây trên đỉnh một ngọn núi lửa đã tắt từ lâu.', words: ['castle', 'volcano', 'rock'] },
  highlands: { text: 'Scotland có hơn 280 ngọn núi cao trên 3.000 feet, người ta gọi chúng là "Munro".', words: ['mountain', 'valley', 'peak'] },
  loch_ness: { text: 'Hồ Loch Ness chứa nhiều nước ngọt hơn mọi hồ ở Anh và xứ Wales cộng lại.', words: ['lake', 'monster', 'legend'] },
}

// Con dấu hộ chiếu: màu mực và hình dáng khác nhau cho từng địa danh
export const STAMP_STYLE = [
  { ink: 'primary', shape: 'round', tilt: -10 },
  { ink: 'danger-deep', shape: 'square', tilt: 7 },
  { ink: 'accent-deep', shape: 'round', tilt: -4 },
  { ink: 'flag-blue', shape: 'square', tilt: 9 },
  { ink: 'primary', shape: 'round', tilt: 6 },
  { ink: 'danger-deep', shape: 'square', tilt: -8 },
  { ink: 'accent-deep', shape: 'round', tilt: 11 },
  { ink: 'flag-blue', shape: 'square', tilt: -6 },
  { ink: 'primary', shape: 'round', tilt: 4 },
  { ink: 'danger-deep', shape: 'square', tilt: -12 },
]

/** Phần trang trí của chặng theo `landmark_key` (icon, chữ trên con dấu) để bản đồ dữ liệu thật dùng chung tranh vẽ. */
export const STAGE_ART = Object.fromEntries([...A1_STAGES, ...A2_STAGES, ...B1_STAGES].map((d) => [d.landmark_key, { icon: d.icon, stamp: d.stamp }]))

// Mẹo học chung ở cột phải bản đồ (nội dung cố định, không phải số liệu)
export const STUDY_TIP = 'Đọc to từ mới ba lần rồi tự đặt một câu có từ đó. Não nhớ lâu hơn khi bạn dùng từ, không chỉ nhìn.'
