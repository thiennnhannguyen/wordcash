/*
 * Dữ liệu mẫu cho Sảnh khi chưa có API. Có 3 biến thể: "default", "shaky" (rank lung lay), "new" (người mới).
 * TODO: thay bằng dữ liệu từ services/profileApi và academyApi khi backend sẵn sàng.
 */

const BASE = {
  user: { name: 'Nhân' },
  stats: { streak: 12, masteredWords: 1248, rank: 'bach_kim', rankShaky: false, spins: 2 },
  dailyCheck: { correct: 4, total: 4, streakGained: true },
  academy: {
    isNew: false,
    level: 'B1',
    topic: 'Công việc',
    lessonNumber: 3,
    lessonTitle: 'Phỏng vấn xin việc',
    learned: 12,
    total: 18,
    dueReviews: 8,
  },
  arena: { weekWins: 7, weekLosses: 3 },
  nextRank: { from: 'bach_kim', to: 'kim_cuong', current: 1248, target: 2000 },
  nextSpin: { current: 38, target: 50 },
  mascot: { name: 'Kẹo Dẻo', rarity: 'epic', number: 77, color: 'danger', shape: 'tall', bg: 'raised' },
  friends: [
    { name: 'Minh Anh', words: 1812, color: 'sky', shape: 'drop' },
    { name: 'Nhân (bạn)', words: 1248, color: 'danger', shape: 'tall', isMe: true },
    { name: 'Tuấn', words: 1105, color: 'gold', shape: 'round' },
  ],
  shaky: null,
}

const VARIANTS = {
  default: BASE,
  shaky: {
    ...BASE,
    stats: { ...BASE.stats, masteredWords: 996, rankShaky: true },
    dailyCheck: { correct: 2, total: 4, streakGained: false },
    nextRank: { from: 'bach_kim', to: 'kim_cuong', current: 996, target: 2000 },
    shaky: { daysLeft: 2, wordsToReview: 5, threshold: 1000 },
    friends: BASE.friends.map((f) => (f.isMe ? { ...f, words: 996 } : f)),
  },
  new: {
    ...BASE,
    stats: { streak: 1, masteredWords: 0, rank: 'tan_binh', rankShaky: false, spins: 0 },
    dailyCheck: null,
    academy: { isNew: true },
    arena: { weekWins: 0, weekLosses: 0 },
    nextRank: { from: 'tan_binh', to: 'dong', current: 0, target: 100 },
    nextSpin: { current: 0, target: 50 },
    mascot: { name: 'Bột Nếp', rarity: 'common', number: 1, color: 'gold', shape: 'round', bg: 'raised' },
    friends: [],
  },
}

export const LOBBY_VARIANTS = [
  { key: 'default', label: 'Bình thường' },
  { key: 'shaky', label: 'Rank lung lay' },
  { key: 'new', label: 'Người mới' },
]

export function getLobbyMock(variant) {
  return VARIANTS[variant] ?? VARIANTS.default
}
