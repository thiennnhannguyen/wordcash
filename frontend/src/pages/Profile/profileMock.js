/*
 * Giả lập API Hồ sơ khi backend chưa có.
 *
 * `GET /api/profile/me` trả đủ thống kê, gồm cả phần riêng tư (độ ghi nhớ, từ khó nhất, trạng thái lung lay).
 * `GET /api/profile/:handle` chỉ trả phần công khai kèm quan hệ bạn bè và thành tích đối đầu với mình.
 * Số từ đã thuộc, rank, lung lay, tỉ lệ thắng… đều do server tính; client chỉ vẽ.
 * Biến thể: "default", "shaky" (rank lung lay).
 */

import { RANKS } from '../../utils/constants'
import { MASCOT_BY_ID } from '../Collection/collectionMock'

// Số từ đã thuộc theo cấp (tổng mỗi cấp là số mục từ đã duyệt của cấp đó)
const LEVELS_ME = [
  { level: 'A1', mastered: 452, total: 500, unlocked: true },
  { level: 'A2', mastered: 610, total: 800, unlocked: true },
  { level: 'B1', mastered: 186, total: 1500, unlocked: true },
  { level: 'B2', mastered: 0, total: 2200, unlocked: false },
  { level: 'C1', mastered: 0, total: 2500, unlocked: false },
  { level: 'C2', mastered: 0, total: 2500, unlocked: false },
]

// Số từ học mỗi ngày trong 12 tuần, ngày cuối là hôm nay (30/09/2026, thứ Tư)
function activity(seed, restDays) {
  const today = new Date('2026-09-30T12:00:00')
  return Array.from({ length: 84 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (83 - i))
    const x = Math.sin((i + 1) * seed) * 10000
    const r = x - Math.floor(x)
    const words = restDays.includes(i % 17) ? 0 : Math.round(r * 26)
    return { date: date.toISOString().slice(0, 10), words: i >= 72 ? Math.max(words, 6) : words }
  })
}

const ME = {
  isMe: true,
  name: 'Nhân',
  handle: 'nhan.wordclash',
  joined: '2026-09-01',
  avatar: { id: 77, name: 'Kẹo Dẻo', rarity: 'epic', number: 77, color: 'danger', shape: 'tall', traits: {} },
  rank: 'bach_kim',
  masteredWords: 1248,
  streak: 12,
  bestStreak: 31,
  level: 'B1',
  shaky: null,
  levels: LEVELS_ME,
  activity: activity(1.7, [3, 11]),
  retention: { correct: 118, total: 130, days: 30 },
  hardest: [
    { word: 'reluctant', meaning: 'miễn cưỡng', forgot: 4 },
    { word: 'deadline', meaning: 'hạn chót', forgot: 3 },
    { word: 'negotiate', meaning: 'đàm phán', forgot: 3 },
    { word: 'take over', meaning: 'tiếp quản', forgot: 2 },
    { word: 'in charge of', meaning: 'phụ trách', forgot: 2 },
  ],
  arena: { matches: 86, wins: 53, losses: 33, bestWinStreak: 9, avgSeconds: 2.4, bestCombo: 7, knockouts: 21, recent: ['win', 'win', 'lose', 'win', 'win'] },
  achievements: [
    { key: 'first_ko', title: 'Lần đầu K.O.', detail: 'Hạ gục đối thủ lần đầu', icon: 'ko', color: 'danger', done: true, date: '2026-09-06' },
    { key: 'streak_7', title: 'Streak 7 ngày', detail: 'Học 7 ngày liên tiếp', icon: 'fire', color: 'orange', done: true, date: '2026-09-07' },
    { key: 'streak_30', title: 'Streak 30 ngày', detail: 'Học 30 ngày liên tiếp', icon: 'fire', color: 'gold', done: true, date: '2026-09-15' },
    { key: 'speed', title: 'Tốc độ bàn thờ', detail: '5 câu đúng dưới 1 giây trong một trận', icon: 'lightning', color: 'sky', done: true, date: '2026-09-21' },
    { key: 'words_1000', title: 'Nghìn từ', detail: 'Thuộc 1.000 từ', icon: 'book', color: 'accent', done: true, date: '2026-09-18' },
    { key: 'clear_a1', title: 'Phá đảo A1', detail: 'Thuộc hết từ cấp A1', icon: 'crown', color: 'primary', done: false, progress: 452, goal: 500 },
    { key: 'collector_50', title: 'Nhà sưu tầm', detail: 'Sở hữu 50 linh vật', icon: 'cards', color: 'gold', done: false, progress: 37, goal: 50 },
    { key: 'unbeaten_10', title: 'Bất bại 10 trận', detail: 'Thắng 10 trận liên tiếp', icon: 'shield', color: 'orange', done: false, progress: 9, goal: 10 },
    { key: 'ko_50', title: 'Sát thủ từ vựng', detail: 'K.O. 50 lần', icon: 'ko', color: 'danger', done: false, progress: 21, goal: 50 },
    { key: 'perfect_30', title: 'Cửa Ải hoàn hảo', detail: 'Đúng hết Cửa Ải 30 lần', icon: 'gate', color: 'sky', done: false, progress: 22, goal: 30 },
  ],
  showcase: [77, 37, 63],
  collection: { owned: 37, total: 100 },
}

const OTHER = {
  isMe: false,
  name: 'Minh Thư',
  handle: 'minhthu',
  joined: '2026-06-01',
  avatar: { id: 99, name: 'Kỳ Lân Cầu Vồng', rarity: 'legendary', number: 99 },
  rank: 'kim_cuong',
  masteredWords: 2310,
  streak: 45,
  bestStreak: 60,
  level: 'B2',
  friendship: 'none', // none | pending | friends
  headToHead: { me: 2, them: 3 },
  levels: [
    { level: 'A1', mastered: 500, total: 500, unlocked: true },
    { level: 'A2', mastered: 780, total: 800, unlocked: true },
    { level: 'B1', mastered: 842, total: 1500, unlocked: true },
    { level: 'B2', mastered: 188, total: 2200, unlocked: true },
    { level: 'C1', mastered: 0, total: 2500, unlocked: false },
    { level: 'C2', mastered: 0, total: 2500, unlocked: false },
  ],
  activity: activity(3.1, [5]),
  arena: { matches: 142, wins: 97, losses: 45, bestWinStreak: 14, avgSeconds: 1.9, bestCombo: 11, knockouts: 48, recent: ['win', 'lose', 'win', 'win', 'win'] },
  achievements: ME.achievements.map((a) =>
    ['clear_a1', 'unbeaten_10', 'perfect_30'].includes(a.key) ? { ...a, done: true, date: '2026-08-20', progress: undefined } : a.key === 'collector_50' ? { ...a, progress: 44 } : a.key === 'ko_50' ? { ...a, progress: 48 } : a,
  ),
  showcase: [99, 94, 80],
  collection: { owned: 44, total: 100 },
}

export function fetchProfile(handle, variant = 'default') {
  if (handle && handle !== ME.handle) return { ...OTHER, handle }
  if (variant === 'shaky') {
    // Rơi dưới mốc 1.000: còn 2 ngày 14 giờ để gỡ lại 12 từ trước khi tụt về Vàng
    return {
      ...ME,
      masteredWords: 988,
      levels: LEVELS_ME.map((l) => (l.level === 'A2' ? { ...l, mastered: 598 } : l)),
      shaky: { threshold: 1000, wordsNeeded: 12, deadline: new Date(Date.now() + ((2 * 24 + 14) * 3600 + 12 * 60) * 1000).toISOString(), fallTo: 'vang' },
    }
  }
  return ME
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/*
 * Chứng nhận rank (giả lập `GET /api/profile/me/certificate`): server lưu bản ghi lúc đạt rank
 * gồm mã chứng nhận, ngày đạt, số từ lúc đạt và các chỉ số kèm theo. `rank` đổi được để xem 8 phiên bản màu.
 */
const GALLERY_MASCOTS = [2, 37, 48, 63, 77, 82, 97, 99]
const GALLERY_WORDS = [64, 100, 300, 600, 1000, 2000, 3500, 5000]

export function fetchCertificate(rank) {
  const base = {
    fullName: 'Nguyễn Thiện Nhân',
    handle: ME.handle,
    rank: 'bach_kim',
    words: 1000,
    achievedAt: '2026-09-18',
    code: '#WC-2026-00482',
    streak: 31,
    level: 'B1',
    mascots: 37,
    mascot: MASCOT_BY_ID[77],
  }
  if (!rank || rank === base.rank) return base
  const i = RANKS.findIndex((r) => r.key === rank)
  return { ...base, rank, words: GALLERY_WORDS[i], mascot: MASCOT_BY_ID[GALLERY_MASCOTS[i]], code: `#WC-2026-${String(482 + i * 37).padStart(5, '0')}` }
}

export async function sendFriendRequest() {
  await wait(300)
  return 'pending'
}

export async function updateShowcase(ids) {
  await wait(250)
  ME.showcase = ids
  return ids
}

export async function updateProfile(fields) {
  await wait(300)
  Object.assign(ME, fields)
  return ME
}
