/*
 * Dữ liệu mẫu cho Sảnh khi chưa có API. Có 3 biến thể: "default", "shaky" (rank lung lay), "new" (người mới).
 * Mọi số liệu, chữ nội dung của Sảnh nằm ở đây (component không tự đặt số), để sau này thay bằng API dễ dàng.
 *
 * ĐÃ LẤY TỪ API: tên người chào và linh vật đang dùng (user từ authStore: display_name, avatar_mascot_id),
 * truyền vào getLobbyMock(variant, user); "Khóa học của tôi" gọi services/coursesApi.js.
 * CÒN MOCK (TODO, chưa có API): streak, số từ đã thuộc, rank, lượt quay, Cửa Ải, tuần này, Học Viện, Đấu Trường,
 * Từ của ngày, mục tiêu, hành trình, rank kế tiếp, lượt quay kế tiếp, bạn bè.
 *
 * TODO: thay bằng dữ liệu từ services/profileApi và academyApi khi backend sẵn sàng. Gợi ý nguồn:
 * - user, stats, week, goals: GET /users/me + thống kê hôm nay/tuần này (server tính theo múi giờ người dùng)
 * - academy, journey: bản đồ lộ trình (roadmapMock.js); arena: thống kê Đấu Trường + số người online (socket)
 * - wordOfDay: server chọn theo cấp người học. Khóa học của tôi KHÔNG nằm ở đây: Sảnh gọi services/coursesApi.js
 * Linh vật tham chiếu theo id trong data/mascots.js.
 */

import { getMascot } from './mascots'
import { LEVELS, NEW_USER_POSITION, POSITION, journeyProgress, journeyRegions } from './roadmap'

const stagesOf = (code) => LEVELS.find((l) => l.code === code).stages

// Hôm nay là Thứ Sáu (ô thứ 5); thứ tự ô: T2 → CN
const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const TODAY = 4

function week({ studiedBefore, studiedToday }) {
  return WEEK_LABELS.map((label, i) => ({
    label,
    state: i < TODAY ? (studiedBefore ? 'done' : 'empty') : i === TODAY ? 'today' : 'future',
    studied: i < TODAY ? studiedBefore : i === TODAY ? studiedToday : false,
  }))
}

// Hành trình và hộ chiếu tính từ nguồn lộ trình dùng chung (data/roadmap.js), không viết cứng
function journey(position) {
  return { regions: journeyRegions(position), passport: journeyProgress(position) }
}

const BASE = {
  user: { name: 'Nhân' },
  stats: { streak: 12, masteredWords: 1248, rank: 'bach_kim', rankShaky: false, spins: 2 },
  dailyCheck: { correct: 4, total: 4, streakGained: true },
  week: week({ studiedBefore: true, studiedToday: true }),
  academy: {
    isNew: false,
    level: 'B1',
    topic: 'Công việc',
    lessonNumber: 3,
    lessonTitle: 'Phỏng vấn xin việc',
    lessonsInStage: 5,
    stage: POSITION.stage + 1,
    stagesTotal: stagesOf(POSITION.level),
    learned: 12,
    total: 18,
    dueReviews: 8,
    landmark: { key: 'big_ben', name: 'Big Ben', label: 'Đang tới' },
  },
  arena: { weekWins: 7, weekLosses: 3, winStreak: 4, online: 128 },
  wordOfDay: {
    word: 'resilient',
    ipa: '/rɪˈzɪl.i.ənt/',
    pos: 'tính từ',
    level: 'B1',
    meaning: 'kiên cường, nhanh chóng gượng dậy sau khó khăn',
    example: 'After losing three matches in a row, Minh stayed resilient and won the fourth.',
    highlight: 'resilient',
    tipMascotId: 7,
    tip: 'Nghĩ tới lò xo: "re-" là bật lại. Bị ép tới đâu cũng bật lên được.',
  },
  goals: [
    { key: 'new', label: 'Học 15 từ mới', current: 10, target: 15 },
    { key: 'review', label: 'Ôn 8 từ đến hạn', current: 0, target: 8 },
    { key: 'arena', label: 'Chơi 1 trận Đấu Trường', current: 1, target: 1 },
  ],
  courseEmptyMascotId: 4,
  journey: journey(POSITION),
  nextRank: { from: 'bach_kim', to: 'kim_cuong', current: 1248, target: 2000 },
  nextSpin: { current: 38, target: 50 },
  mascotId: 1,
  friends: [
    { name: 'Minh Anh', weekWords: 142, mascotId: 7 },
    { name: 'Nhân (bạn)', weekWords: 96, mascotId: 1, isMe: true },
    { name: 'Tuấn', weekWords: 71, mascotId: 12 },
  ],
  shaky: null,
}

const VARIANTS = {
  default: BASE,
  shaky: {
    ...BASE,
    stats: { ...BASE.stats, masteredWords: 996, rankShaky: true },
    dailyCheck: { correct: 2, total: 4, streakGained: false },
    goals: [
      { key: 'new', label: 'Học 15 từ mới', current: 4, target: 15 },
      { key: 'review', label: 'Ôn 13 từ đến hạn', current: 0, target: 13 },
      { key: 'arena', label: 'Chơi 1 trận Đấu Trường', current: 0, target: 1 },
    ],
    academy: { ...BASE.academy, dueReviews: 13 },
    arena: { ...BASE.arena, winStreak: 0 },
    nextRank: { from: 'bach_kim', to: 'kim_cuong', current: 996, target: 2000 },
    shaky: { daysLeft: 2, wordsToReview: 5, threshold: 1000 },
    friends: [
      { name: 'Minh Anh', weekWords: 142, mascotId: 7 },
      { name: 'Tuấn', weekWords: 71, mascotId: 12 },
      { name: 'Nhân (bạn)', weekWords: 38, mascotId: 1, isMe: true },
    ],
  },
  new: {
    ...BASE,
    stats: { streak: 1, masteredWords: 0, rank: 'tan_binh', rankShaky: false, spins: 0 },
    dailyCheck: null,
    week: week({ studiedBefore: false, studiedToday: false }),
    academy: {
      isNew: true,
      landmark: { key: 'a1_ho_guom', name: 'Hồ Gươm', label: 'Điểm đầu tiên' },
      stagesTotal: stagesOf(NEW_USER_POSITION.level),
      intro: [
        { icon: 'clock', text: '40 câu, khó dần theo câu trả lời của bạn' },
        { icon: 'map', text: `A1 có ${stagesOf('A1')} chặng quanh Miền Bắc Việt Nam` },
        { icon: 'boss', text: 'Thắng Trận Boss ở Vịnh Hạ Long để bay sang A2' },
      ],
    },
    arena: { weekWins: 0, weekLosses: 0, winStreak: 0, online: 128 },
    wordOfDay: {
      word: 'journey',
      ipa: '/ˈdʒɜː.ni/',
      pos: 'danh từ',
      level: 'A1',
      meaning: 'chuyến đi, hành trình',
      example: 'Every journey starts with one small step.',
      highlight: 'journey',
      tipMascotId: 7,
      tip: 'Đọc gần giống "chơ-ni": chuyến đi chơi nào cũng là một hành trình.',
    },
    goals: [
      { key: 'placement', label: 'Làm bài xếp lớp', current: 0, target: 1 },
      { key: 'new', label: 'Học 15 từ mới', current: 0, target: 15 },
      { key: 'arena', label: 'Chơi trận Đấu Trường đầu tiên', current: 0, target: 1 },
    ],
    journey: journey(NEW_USER_POSITION),
    nextRank: { from: 'tan_binh', to: 'dong', current: 0, target: 100 },
    nextSpin: { current: 0, target: 50 },
    friends: [],
  },
}

export const LOBBY_VARIANTS = [
  { key: 'default', label: 'Bình thường' },
  { key: 'shaky', label: 'Rank lung lay' },
  { key: 'new', label: 'Người mới' },
]

/** `user`: người dùng thật (authStore). Có thì tên và linh vật lấy từ user, kể cả dòng "bạn" ở bảng bạn bè. */
export function getLobbyMock(variant, user = null) {
  const data = VARIANTS[variant] ?? VARIANTS.default
  const name = user?.display_name ?? data.user.name
  const mascotId = user ? (user.avatar_mascot_id ?? 1) : data.mascotId
  return {
    ...data,
    user: { name },
    mascot: getMascot(mascotId),
    friends: data.friends.map((f) => (f.isMe ? { ...f, name: `${name} (bạn)`, mascot: getMascot(mascotId) } : { ...f, mascot: getMascot(f.mascotId) })),
    wordOfDay: { ...data.wordOfDay, tipMascot: getMascot(data.wordOfDay.tipMascotId) },
    courseEmptyMascot: getMascot(data.courseEmptyMascotId),
  }
}
