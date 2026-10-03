/*
 * Dữ liệu mẫu cho bản đồ lộ trình khi chưa có API và chưa nạp kho từ.
 * Cấu trúc bám theo DB: cấp (levels) → chặng (topics) → bài (units, 15–20 mục từ).
 * Trạng thái mở/khóa, điểm cao nhất và số từ thuộc đều do server tính; ở đây chỉ là số giả.
 * TODO: thay bằng services/academyApi (GET /academy/levels, GET /academy/levels/:code/map?branch=...).
 *
 * Chủ đề "Hộ chiếu vòng quanh thế giới": mỗi cấp là một vùng đất (`region_theme` của bảng levels), mỗi chặng (topics)
 * kết thúc ở một địa danh (`landmark_key`, `landmark_name`, `landmark_image`), Trận Boss cuối cấp đặt ở một địa danh biểu tượng.
 * Ngày đến địa danh (`visited_at`, ISO) là ngày hoàn thành chặng do server lưu; client chỉ định dạng dd.mm.
 * Frontend không gán địa danh theo số chặng: chỉ đọc `landmark_key` rồi tra landmarkRegistry.
 * Tên chủ đề, tên bài, câu "Bạn có biết?" là nội dung nháp tự viết, tương đương `status = draft`.
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
import { LEVELS, POSITION, REGIONS, journeyProgress } from '../../data/roadmap'

// Vùng đất, các cấp và vị trí học dùng chung với Sảnh: data/roadmap.js
export { LEVELS, REGIONS }

export const BRANCHES = [
  { key: 'core', label: 'Nền tảng' },
  { key: 'ielts', label: 'IELTS' },
  { key: 'toeic', label: 'TOEIC' },
]

// Chín chặng B1 · Vương quốc Anh, từ dưới lên. `landmark_key` tra trong components/academy/landmarks/landmarkRegistry.js.
const B1_STAGES = [
  { title: 'Giao tiếp hằng ngày', icon: Chats, landmark_key: 'tower_bridge', landmark_name: 'Tower Bridge', stamp: 'TOWER BRIDGE', lessons: ['Chào hỏi', 'Làm quen', 'Hẹn gặp', 'Chuyện phiếm'] },
  { title: 'Mua sắm', icon: ShoppingBag, landmark_key: 'london_eye', landmark_name: 'London Eye', stamp: 'LONDON EYE', lessons: ['Ở chợ', 'Siêu thị', 'Quần áo', 'Trả giá'] },
  { title: 'Công việc', icon: Briefcase, landmark_key: 'big_ben', landmark_name: 'Big Ben', stamp: 'BIG BEN', lessons: ['Tìm việc', 'Hồ sơ xin việc', 'Phỏng vấn xin việc', 'Ngày đầu đi làm', 'Họp hành'] },
  { title: 'Sức khỏe', icon: Heartbeat, landmark_key: 'buckingham', landmark_name: 'Cung điện Buckingham', stamp: 'BUCKING\nHAM', lessons: ['Triệu chứng', 'Đi khám bệnh', 'Lối sống lành mạnh', 'Tập luyện'] },
  { title: 'Giáo dục', icon: GraduationCap, landmark_key: 'oxford', landmark_name: 'Đại học Oxford', stamp: 'OXFORD', lessons: ['Trường học', 'Du học', 'Thi cử', 'Học trực tuyến'] },
  { title: 'Lịch sử', icon: Bank, landmark_key: 'stonehenge', landmark_name: 'Stonehenge', stamp: 'STONE\nHENGE', lessons: ['Thời tiền sử', 'Vua và nữ hoàng', 'Chiến tranh', 'Di sản'] },
  { title: 'Du lịch', icon: SuitcaseRolling, landmark_key: 'bath', landmark_name: 'Nhà tắm La Mã ở Bath', stamp: 'BATH', lessons: ['Đặt phòng', 'Hỏi đường', 'Phương tiện', 'Ăn uống'] },
  { title: 'Văn hóa', icon: MaskHappy, landmark_key: 'edinburgh', landmark_name: 'Lâu đài Edinburgh', stamp: 'EDIN\nBURGH', lessons: ['Lễ hội', 'Âm nhạc', 'Phim ảnh', 'Phong tục'] },
  { title: 'Thiên nhiên', icon: Mountains, landmark_key: 'highlands', landmark_name: 'Cao nguyên Scotland', stamp: 'HIGH\nLANDS', lessons: ['Núi non', 'Động vật hoang dã', 'Thời tiết', 'Bảo tồn'] },
]

// Các nhánh dùng chung mục từ và địa danh, chỉ khác cách gom bài trong vài chặng
const BRANCH_LESSONS = {
  ielts: {
    3: ['Thị trường lao động', 'Kỹ năng mềm', 'Phỏng vấn xin học bổng', 'Làm việc từ xa', 'Cân bằng cuộc sống'],
    5: ['Giáo dục đại học', 'Du học', 'Nghiên cứu', 'Học trực tuyến'],
  },
  toeic: {
    3: ['Thiết bị văn phòng', 'Email công việc', 'Phỏng vấn xin việc', 'Lịch làm việc', 'Báo cáo'],
    7: ['Đặt vé', 'Khách sạn', 'Hội nghị', 'Đối tác'],
  },
}

// A1 · Việt Nam – Miền Bắc và A2 · Việt Nam – Miền Trung & Nam (khớp seed backend/seeds/seed_landmarks.py).
// Mỗi chặng 4 bài; tên bài là nội dung nháp.
const A1_STAGES = [
  { title: 'Chào hỏi', icon: Handshake, landmark_key: 'a1_ho_guom', landmark_name: 'Hồ Gươm & Tháp Rùa', stamp: 'HỒ GƯƠM', lessons: ['Xin chào', 'Giới thiệu bản thân', 'Cảm ơn và xin lỗi', 'Tạm biệt'] },
  { title: 'Gia đình', icon: UsersThree, landmark_key: 'a1_van_mieu', landmark_name: 'Văn Miếu – Khuê Văn Các', stamp: 'VĂN MIẾU', lessons: ['Bố mẹ', 'Anh chị em', 'Họ hàng', 'Tả người thân'] },
  { title: 'Số đếm và thời gian', icon: Clock, landmark_key: 'a1_chua_mot_cot', landmark_name: 'Chùa Một Cột', stamp: 'MỘT CỘT', lessons: ['Số đếm', 'Giờ giấc', 'Ngày trong tuần', 'Tháng và mùa'] },
  { title: 'Đồ ăn', icon: ForkKnife, landmark_key: 'a1_pho_co', landmark_name: 'Phố cổ Hà Nội & Ô Quan Chưởng', stamp: 'PHỐ CỔ', lessons: ['Món ăn', 'Đồ uống', 'Gọi món', 'Hoa quả'] },
  { title: 'Nhà cửa', icon: House, landmark_key: 'a1_mu_cang_chai', landmark_name: 'Ruộng bậc thang Mù Cang Chải', stamp: 'MÙ CANG\nCHẢI', lessons: ['Phòng ốc', 'Đồ đạc', 'Việc nhà', 'Hàng xóm'] },
  { title: 'Đi lại', icon: Bus, landmark_key: 'a1_cau_long_bien', landmark_name: 'Cầu Long Biên', stamp: 'LONG BIÊN', lessons: ['Phương tiện', 'Hỏi đường', 'Mua vé', 'Giao thông'] },
  { title: 'Mua sắm', icon: ShoppingBag, landmark_key: 'a1_cho_dong_xuan', landmark_name: 'Chợ Đồng Xuân', stamp: 'ĐỒNG XUÂN', lessons: ['Ở chợ', 'Siêu thị', 'Quần áo', 'Trả giá'] },
  { title: 'Thời tiết', icon: CloudSun, landmark_key: 'a1_fansipan', landmark_name: 'Fansipan – Sa Pa', stamp: 'FANSIPAN', lessons: ['Nắng và mưa', 'Bốn mùa', 'Nhiệt độ', 'Dự báo thời tiết'] },
  { title: 'Thiên nhiên', icon: Tree, landmark_key: 'a1_trang_an', landmark_name: 'Tràng An – Ninh Bình', stamp: 'TRÀNG AN', lessons: ['Cây cối', 'Con vật', 'Sông núi', 'Bảo vệ thiên nhiên'] },
  { title: 'Trường học và học tập', icon: GraduationCap, landmark_key: 'a1_ma_pi_leng', landmark_name: 'Đèo Mã Pí Lèng – Hà Giang', stamp: 'MÃ PÍ\nLÈNG', lessons: ['Lớp học', 'Đồ dùng học tập', 'Môn học', 'Bài tập về nhà'] },
]

const A2_STAGES = [
  { title: 'Công việc hằng ngày', icon: Briefcase, landmark_key: 'a2_dai_noi_hue', landmark_name: 'Đại Nội Huế – Ngọ Môn', stamp: 'ĐẠI NỘI', lessons: ['Buổi sáng', 'Việc nhà', 'Đi làm, đi học', 'Buổi tối'] },
  { title: 'Cảm xúc', icon: Smiley, landmark_key: 'a2_chua_thien_mu', landmark_name: 'Chùa Thiên Mụ', stamp: 'THIÊN MỤ', lessons: ['Vui và buồn', 'Lo lắng', 'Bất ngờ', 'Chia sẻ cảm xúc'] },
  { title: 'Lễ hội', icon: Confetti, landmark_key: 'a2_hoi_an', landmark_name: 'Phố cổ Hội An – Chùa Cầu', stamp: 'HỘI AN', lessons: ['Tết', 'Trung thu', 'Sinh nhật', 'Lễ hội địa phương'] },
  { title: 'Thành phố', icon: Buildings, landmark_key: 'a2_cau_rong', landmark_name: 'Cầu Rồng – Đà Nẵng', stamp: 'CẦU RỒNG', lessons: ['Đường phố', 'Công trình', 'Dịch vụ công cộng', 'Sống ở đô thị'] },
  { title: 'Khám phá', icon: Compass, landmark_key: 'a2_phong_nha', landmark_name: 'Phong Nha – Kẻ Bàng', stamp: 'PHONG NHA', lessons: ['Lên kế hoạch', 'Hành trang', 'Phiêu lưu', 'Kể lại chuyến đi'] },
  { title: 'Biển và kỳ nghỉ', icon: Umbrella, landmark_key: 'a2_mui_ne', landmark_name: 'Đồi cát Mũi Né', stamp: 'MŨI NÉ', lessons: ['Bãi biển', 'Trò chơi dưới nước', 'Khách sạn', 'Nghỉ dưỡng'] },
  { title: 'Thời gian rảnh', icon: GameController, landmark_key: 'a2_da_lat', landmark_name: 'Ga Đà Lạt', stamp: 'ĐÀ LẠT', lessons: ['Sở thích', 'Thể thao', 'Âm nhạc', 'Phim ảnh'] },
  { title: 'Tiền và giá cả', icon: Coins, landmark_key: 'a2_ben_thanh', landmark_name: 'Chợ Bến Thành', stamp: 'BẾN THÀNH', lessons: ['Tiền tệ', 'Giá cả', 'Giảm giá', 'Thanh toán'] },
  { title: 'Kiến trúc', icon: Bank, landmark_key: 'a2_nha_tho_duc_ba', landmark_name: 'Nhà thờ Đức Bà Sài Gòn', stamp: 'ĐỨC BÀ', lessons: ['Nhà ở', 'Vật liệu', 'Phong cách', 'Công trình nổi tiếng'] },
  { title: 'Nông sản và thực phẩm', icon: Carrot, landmark_key: 'a2_cho_noi_cai_rang', landmark_name: 'Chợ nổi Cái Răng – Cần Thơ', stamp: 'CÁI RĂNG', lessons: ['Rau củ', 'Trái cây', 'Chợ quê', 'Nấu ăn'] },
]

// Trận Boss cuối cấp: địa danh biểu tượng có "quái vật canh giữ"
const BOSSES = {
  A1: { landmark_key: 'a1_boss_ha_long', landmark_name: 'Vịnh Hạ Long', guardian: 'Rồng Vịnh', stamp: 'HẠ LONG', scene: 'island' },
  A2: { landmark_key: 'a2_boss_cau_vang', landmark_name: 'Cầu Vàng Bà Nà', guardian: 'Bàn Tay Núi', stamp: 'CẦU VÀNG', scene: 'island' },
  B1: { landmark_key: null, landmark_name: 'Hồ Loch Ness', guardian: 'Quái vật hồ', stamp: 'LOCH NESS', scene: 'loch_ness' },
}
const DEFAULT_BOSS = { landmark_key: null, landmark_name: 'Hồ quái vật', guardian: 'Quái vật', stamp: 'HỒ BOSS', scene: 'lake' }

// Ngày hoàn thành chặng (server lưu, ISO). Mẫu: A1 từ 04/05/2026, A2 từ 20/06/2026, B1 từ 02/09/2026.
const START_DATE = { A1: '2026-05-04', A2: '2026-06-20', B1: '2026-09-02' }
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

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
const STAMP_STYLE = [
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

// Số từ mỗi bài nằm trong khoảng 15–20 (giả lập ổn định theo vị trí)
const wordsFor = (s, l) => 15 + ((s * 3 + l * 2) % 6)
const phrasesFor = (s, l) => 3 + ((s + l) % 5)
const scoreFor = (s, l) => 82 + ((s * 7 + l * 5) % 17)

// Trạng thái trạm theo vị trí hiện tại: (chặng, bài) đang học; bài = số bài nghĩa là đang ở trạm kiểm tra
function buildStages(defs, { current, allDone, start }) {
  return defs.map((def, s) => {
    const number = s + 1
    const lessons = def.lessons.map((title, l) => {
      let status = 'locked'
      if (allDone || s < current.stage || (s === current.stage && l < current.lesson)) status = 'done'
      else if (s === current.stage && l === current.lesson) status = 'current'
      return {
        id: `${number}-${l + 1}`,
        number: l + 1,
        title,
        words: wordsFor(s, l),
        phrases: phrasesFor(s, l),
        status,
        best: status === 'done' ? (current.scores?.[`${number}-${l + 1}`] ?? scoreFor(s, l)) : status === 'current' ? 45 : null,
      }
    })
    const stageDone = allDone || s < current.stage
    const atCheckpoint = !allDone && s === current.stage && current.lesson >= lessons.length
    return {
      id: `stage-${number}`,
      number,
      ...def,
      landmark_image: def.landmark_image ?? null,
      lessons,
      checkpoint: { status: stageDone ? 'done' : atCheckpoint ? 'current' : 'locked', best: stageDone ? scoreFor(s, 9) : null },
      // Địa danh: đã chinh phục (qua kiểm tra chặng) · đang hướng tới · chưa tới
      visit: stageDone ? { status: 'visited', visited_at: addDays(start, s * 4 + 3) } : s === current.stage ? { status: 'target' } : { status: 'unexplored' },
      stampStyle: STAMP_STYLE[s % STAMP_STYLE.length],
    }
  })
}

function genericDefs(count) {
  return Array.from({ length: count }, (_, i) => ({ title: `Chặng ${i + 1}`, icon: House, landmark_key: null, landmark_name: `Cột mốc ${i + 1}`, stamp: `MỐC ${i + 1}`, lessons: ['Bài 1', 'Bài 2', 'Bài 3', 'Bài 4'] }))
}

const LEVEL_DEFS = { A1: () => A1_STAGES, A2: () => A2_STAGES }

function b1Defs(branch) {
  const overrides = BRANCH_LESSONS[branch] ?? {}
  return B1_STAGES.map((d, i) => (overrides[i + 1] ? { ...d, lessons: overrides[i + 1] } : d))
}

// Vị trí hiện tại (data/roadmap.js). `progress` tăng khi xem thử hoàn thành bài.
const B1_POSITION = { stage: POSITION.stage, lesson: POSITION.lesson }

/**
 * Bản đồ một cấp. `progress` = số bài đã hoàn thành thêm (chỉ dùng cho bản xem thử "hoàn thành bài":
 * server sẽ trả bản đồ mới sau khi chấm bài, client không tự mở khóa).
 */
export function getLevelMap(code, branch = 'core', { progress = 0 } = {}) {
  const level = LEVELS.find((l) => l.code === code) ?? LEVELS[2]
  const index = LEVELS.indexOf(level)
  const next = LEVELS[index + 1] ?? null
  const region = REGIONS[level.region_theme]
  const nextLevel = next ? { code: next.code, region: REGIONS[next.region_theme], status: next.status } : null

  if (level.status === 'locked') return { level, region, nextLevel, locked: true }

  const done = level.status === 'done'
  const defs = level.code === 'B1' ? b1Defs(branch) : (LEVEL_DEFS[level.code]?.() ?? genericDefs(level.stages))
  const current = { ...B1_POSITION, lesson: B1_POSITION.lesson + progress, scores: progress ? { '3-3': 88 } : undefined }
  const start = START_DATE[level.code] ?? '2026-01-01'
  const stages = buildStages(defs, done ? { current: {}, allDone: true, start } : { current, start })
  const bossDef = BOSSES[level.code] ?? DEFAULT_BOSS
  const visited = stages.filter((s) => s.visit.status === 'visited').length
  const journey = journeyProgress({ level: level.code, stage: visited })

  return {
    level,
    region,
    nextLevel,
    summary: {
      mastered: done ? Math.round(level.words * 0.92) : 642 + progress * 16,
      total: level.words,
      stageCurrent: done ? stages.length : B1_POSITION.stage + 1,
      stageTotal: stages.length,
    },
    stages,
    boss: {
      ...bossDef,
      landmark_image: null,
      status: done ? 'done' : 'locked',
      questions: 50,
      best: done ? 91 : null,
      visited_at: done ? addDays(start, stages.length * 4 + 6) : null,
      stampStyle: STAMP_STYLE[stages.length % STAMP_STYLE.length],
    },
    passport: {
      visited,
      total: stages.length,
      journeyVisited: journey.visited,
      journeyTotal: journey.total,
    },
    // Câu "Bạn có biết?" về địa danh đang tới; cấp chưa có tranh riêng thì dùng mẹo học
    fact: LANDMARK_FACTS[stages.find((s) => s.visit.status === 'target')?.landmark_key] ?? (level.code === 'B1' ? LANDMARK_FACTS.loch_ness : null),
  }
}

export const SIDEBAR_MOCK = {
  dueReviews: 8,
  dailyGoal: { learned: 10, target: 15 },
  tip: 'Đọc to từ mới ba lần rồi tự đặt một câu có từ đó. Não nhớ lâu hơn khi bạn dùng từ, không chỉ nhìn.',
}
