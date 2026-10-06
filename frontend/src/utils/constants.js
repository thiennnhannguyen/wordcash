/*
 * Hằng số: tên rank, màu độ hiếm, tên sự kiện socket.
 *
 * Mốc rank ở đây chỉ để hiển thị. Số từ đã thuộc và rank thật luôn do server tính.
 */

export const RANKS = [
  { key: 'tan_binh', name: 'Tân Binh', min: 0, color: 'var(--color-rank-tan-binh)' },
  { key: 'dong', name: 'Đồng', min: 100, color: 'var(--color-rank-dong)' },
  { key: 'bac', name: 'Bạc', min: 300, color: 'var(--color-rank-bac)' },
  { key: 'vang', name: 'Vàng', min: 600, color: 'var(--color-rank-vang)' },
  { key: 'bach_kim', name: 'Bạch Kim', min: 1000, color: 'var(--color-rank-bach-kim)' },
  { key: 'kim_cuong', name: 'Kim Cương', min: 2000, color: 'var(--color-rank-kim-cuong)' },
  { key: 'cao_thu', name: 'Cao Thủ', min: 3500, color: 'var(--color-rank-cao-thu)' },
  { key: 'huyen_thoai', name: 'Huyền Thoại', min: 5000, color: 'var(--color-rank-huyen-thoai)' },
]

export const RANK_BY_KEY = Object.fromEntries(RANKS.map((rank) => [rank.key, rank]))

export const RARITIES = {
  common: { name: 'Thường', color: 'var(--color-rarity-common)', stars: 0, total: 45, rate: 60 },
  rare: { name: 'Hiếm', color: 'var(--color-rarity-rare)', stars: 1, total: 30, rate: 28 },
  epic: { name: 'Sử Thi', color: 'var(--color-rarity-epic)', stars: 2, total: 18, rate: 10 },
  legendary: { name: 'Huyền Thoại', color: 'var(--color-rarity-legendary)', stars: 3, total: 7, rate: 2 },
}
// Thứ tự hiếm dần; số thứ tự linh vật cũng đi theo thứ tự này (#001–#045 Thường … #094–#100 Huyền Thoại)
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary']

// Luật vòng quay và mảnh ghép. Chỉ để hiển thị: server mới là nơi quay thẻ, cộng mảnh và kiểm tra đủ mảnh.
export const GACHA = {
  totalMascots: 100,
  wordsPerSpin: 50,
  pityEpic: 20, // 20 lượt liên tiếp không ra Sử Thi thì lượt kế tiếp chắc chắn ra Sử Thi
  shardCost: { common: 20, rare: 40, epic: 60, legendary: 150 }, // giá đổi 1 linh vật chưa có
  shardsPerDuplicate: { common: 2, rare: 4, epic: 8, legendary: 20 }, // theo đề thiết kế màn Quay thẻ
  // Tỉ lệ lượt đặc biệt (lên rank, thắng Boss), đã chốt 05/10/2026; chế độ thường lấy từ GET /collection/rates
  specialRates: { common: 0, rare: 70, epic: 24, legendary: 6 },
  maxBatch: 10, // "Mở tất cả" tối đa 10 lượt mỗi lần
}

// Cấp độ CEFR và tên gọi tiếng Việt
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const LEVEL_NAMES = {
  A1: 'Mới bắt đầu',
  A2: 'Sơ cấp',
  B1: 'Trung cấp',
  B2: 'Trung cao cấp',
  C1: 'Cao cấp',
  C2: 'Thành thạo',
}

// Ngưỡng mở khóa, chỉ để hiển thị cho người học; server mới là bên quyết định (và các ngưỡng này chưa chốt)
export const PASS_LESSON_PERCENT = 80
export const PASS_BOSS_PERCENT = 85

// Luật Đấu Trường. Server dùng cùng bộ số (đặt trong config phía backend) để tính sát thương;
// client chỉ dùng để vẽ thanh máu, đồng hồ combo, đồng hồ đếm ngược
export const ARENA = {
  MAX_HP: 100,
  MAX_QUESTIONS: 20,
  BASE_DAMAGE: 10,
  FAST_BONUS: 5,
  FAST_MS: 2000,
  CRIT_STREAK: 3,
  CRIT_MULTIPLIER: 1.5,
  WRONG_SELF_DAMAGE: 5,
  ROUND_SECONDS: 10,
  LOW_HP: 30,
  RECONNECT_SECONDS: 15,
}

export const SOCKET_EVENTS = {
  JOIN_QUEUE: 'join_queue',
  LEAVE_QUEUE: 'leave_queue',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  MATCH_FOUND: 'match_found',
  ROUND_START: 'round_start',
  SUBMIT_ANSWER: 'submit_answer',
  ROUND_RESULT: 'round_result',
  MATCH_END: 'match_end',
}

// Ghi công nguồn dữ liệu kho từ theo yêu cầu giấy phép (docs/data-sources.md). Hiện ở chân trang Landing.
export const DATA_CREDITS = [
  'Danh sách từ dựa trên CEFR-J Wordlist (Tono Laboratory, Tokyo University of Foreign Studies).',
  'Phiên âm dựa trên CMU Pronouncing Dictionary (Carnegie Mellon University).',
]
