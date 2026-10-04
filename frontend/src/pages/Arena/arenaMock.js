/*
 * Giả lập API Sảnh Đấu Trường khi backend chưa có.
 *
 * Chuỗi thắng, thắng/thua tuần, lịch sử trận, thành tích, bảng xếp hạng và bạn bè online đều do server trả.
 * Cấp được chọn khi tạo phòng chỉ là mong muốn của chủ phòng; câu hỏi thật chỉ lấy từ các cấp mà
 * CẢ HAI người chơi đều đã mở khóa, do server lọc khi trận bắt đầu. Mã phòng cũng do server sinh.
 * TODO: thay bằng services/arenaApi và sự kiện socket `create_room` / `join_room`.
 */

import { getMascot } from '../../data/mascots'

const LATENCY_MS = 350
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const PLAYER = {
  name: 'Nhân',
  rank: 'bach_kim',
  mascot: getMascot(1),
  unlockedLevels: ['A1', 'A2', 'B1'],
}

export const LOBBY = {
  winStreak: 4,
  week: { wins: 7, losses: 3 },
  rankedPool: 'A1–B1',
}

// `hpLeft`: máu còn lại của người chơi khi hết trận
export const RECENT_MATCHES = [
  { id: 1, opponent: 'Minh Thư', color: 'orange', won: true, hpLeft: 62, minutesAgo: 2 },
  { id: 2, opponent: 'Khoa', color: 'sky', won: true, hpLeft: 35, minutesAgo: 18 },
  { id: 3, opponent: 'Bảo Anh', color: 'danger', won: false, hpLeft: 0, minutesAgo: 47 },
  { id: 4, opponent: 'Tuấn', color: 'gold', won: true, hpLeft: 80, minutesAgo: 130 },
  { id: 5, opponent: 'Linh', color: 'accent', won: false, hpLeft: 15, minutesAgo: 1500 },
]

export const STATS = { accuracy: 86, avgSeconds: 1.9, bestCombo: 9 }

// Xếp theo số trận thắng trong tuần
export const WEEKLY_BOARD = [
  { place: 1, name: 'Hải Đăng', color: 'sky', wins: 15 },
  { place: 2, name: 'Minh Thư', color: 'orange', wins: 13 },
  { place: 3, name: 'Quỳnh', color: 'danger', wins: 11 },
  { place: 4, name: 'Nhân', color: 'primary', wins: 7, me: true },
  { place: 5, name: 'Khoa', color: 'gold', wins: 6 },
]

export const FRIENDS = [
  { id: 'f1', name: 'Khoa', color: 'gold', status: 'Đang ở sảnh', busy: false },
  { id: 'f2', name: 'Linh', color: 'accent', status: 'Đang học B1', busy: false },
  { id: 'f3', name: 'Bảo Anh', color: 'danger', status: 'Đang trong trận', busy: true },
  { id: 'f4', name: 'Tuấn', color: 'sky', status: 'Đang ở sảnh', busy: false },
]

export async function createRoom({ levels, questions }) {
  await wait(LATENCY_MS)
  return { code: 'WX7K2', levels, questions }
}

/** Mã phòng chỉ gồm chữ in hoa và số. Trả `ok: false` khi không có phòng. */
export async function joinRoom(code) {
  await wait(LATENCY_MS)
  return code.toUpperCase() === 'WX7K2' ? { ok: true, code: 'WX7K2' } : { ok: false, message: 'Không tìm thấy phòng với mã này.' }
}

// ---------- Ghép trận, phòng chờ, màn VS ----------

export const PLAYER_CARD = { ...PLAYER, accuracy: STATS.accuracy, avgSeconds: STATS.avgSeconds }

// Đối thủ mẫu: thông số chỉ để giới thiệu, linh vật không có chỉ số sức mạnh
export const OPPONENT = {
  name: 'Minh Thư',
  rank: 'vang',
  mascot: getMascot(3),
  accuracy: 81,
  avgSeconds: 2.3,
}

export const MATCH_INFO = { pool: 'A1–B1', questions: 20, arenaName: 'Thành Phố Kẹo' }

export const EXPECTED_WAIT_SECONDS = 15

// Mẹo chạy luân phiên khi chờ, viết theo đúng luật Đấu Trường
export const WAITING_TIPS = [
  'Trả lời dưới 2 giây được +5 sát thương.',
  'Đúng 3 câu liên tiếp: phát bắn kế tiếp x1.5 CHÍ MẠNG.',
  'Trả lời sai sẽ tự mất 5 HP. Không chắc thì đọc kỹ đề.',
  'Hết 20 câu mà chưa ai hạ gục thì so máu còn lại.',
  'Câu hỏi chỉ lấy từ các cấp mà cả hai đều đã mở khóa.',
]

const FIND_MS = 9000

/**
 * Vào hàng chờ (`join_queue`). Server ghép trận và gửi `match_found`; ở đây giả lập sau vài giây.
 * Trả về hàm hủy (`leave_queue`).
 */
export function joinQueue(onFound, { delayMs = FIND_MS } = {}) {
  const t = setTimeout(() => onFound({ opponent: OPPONENT, match: MATCH_INFO }), delayMs)
  return () => clearTimeout(t)
}

export async function getRoom(code) {
  await wait(200)
  return { code: code.toUpperCase(), levels: ['B1'], questions: 20, arenaName: 'Thành Phố Kẹo' }
}

/**
 * Theo dõi phòng chờ (sự kiện socket của phòng). Giả lập: bạn vào phòng sau `joinMs`, sẵn sàng sau `readyMs` nữa.
 * Trả về hàm hủy theo dõi.
 */
export function watchRoom({ onJoin, onFriendReady }, { joinMs = 4000, readyMs = 2500 } = {}) {
  const timers = [
    setTimeout(() => onJoin({ ...OPPONENT, name: 'Khoa', rank: 'bac', mascot: getMascot(14), accuracy: 79, avgSeconds: 2.1 }), joinMs),
    setTimeout(onFriendReady, joinMs + readyMs),
  ]
  return () => timers.forEach(clearTimeout)
}
