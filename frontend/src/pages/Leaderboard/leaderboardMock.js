/*
 * Giả lập API Bảng xếp hạng (`GET /api/leaderboard?board=learn|arena|total&scope=friends|national`).
 *
 * Server trả thời điểm kết thúc mùa tuần, danh sách xếp hạng (hạng, thay đổi so với hôm qua, tên, handle, linh vật đại diện,
 * rank, số liệu), dòng của chính người dùng và người ngay trên để tính câu động viên. Toàn quốc chỉ trả top 50
 * cùng vài người quanh hạng của mình. Số liệu, hạng và phần thưởng đều do server tính.
 */

const NAMES = [
  'Hải Đăng', 'Minh Thư', 'Quỳnh', 'Bảo Anh', 'Tuấn', 'Khoa', 'Linh', 'Gia Hân', 'Đức Anh', 'Phương Vy',
  'Thảo My', 'Hoàng Nam', 'Ngọc Trâm', 'Trí', 'Yến Nhi', 'Quang', 'Hà Vy', 'Thành', 'Mai Anh', 'Duy',
  'Kim Ngân', 'Long', 'Như Ý', 'Phúc', 'Trà My', 'Khánh', 'Diệp', 'Sơn', 'Hạnh', 'Vinh',
  'Tường Vi', 'Nhật', 'Bích', 'Hiếu', 'Lan Chi', 'Tâm', 'Uyên', 'Kiệt', 'Thu Hà', 'Lộc',
  'Ánh', 'Tùng', 'Mỹ Duyên', 'Đạt', 'Thanh Trúc', 'Minh Anh', 'Nhân', 'Bình', 'Hoà', 'Vân',
]
const HANDLES = ['haidang', 'minhthu', 'quynh.q', 'baoanh', 'tuan.t', 'khoa99', 'linh.b1', 'giahan', 'ducanh', 'phuongvy']
const COLORS = ['sky', 'orange', 'danger', 'gold', 'accent', 'primary', 'level-b1', 'rank-dong', 'rank-bach-kim', 'level-c2']
const SHAPES = ['round', 'tall', 'wide', 'drop']
// Không dùng vương miện để khỏi nhầm với vương miện của hạng 1
const TOPS = [null, 'cat', 'antenna', 'bunny', 'leaf', 'bear', 'tuft', 'bolt']

const RANK_BY_WORDS = (w) => (w >= 5000 ? 'huyen_thoai' : w >= 3500 ? 'cao_thu' : w >= 2000 ? 'kim_cuong' : w >= 1000 ? 'bach_kim' : w >= 600 ? 'vang' : w >= 300 ? 'bac' : w >= 100 ? 'dong' : 'tan_binh')

function person(i) {
  const name = NAMES[i % NAMES.length]
  return {
    id: `u${i}`,
    name,
    handle: i === 45 ? 'minh.anh' : HANDLES[i] ?? `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '.')}${i}`,
    mascot: { color: COLORS[(i * 3) % COLORS.length], shape: SHAPES[(i * 5 + 1) % SHAPES.length], traits: { top: TOPS[(i * 7) % TOPS.length] } },
  }
}

const ME = { id: 'me', name: 'Nhân', handle: 'nhan.wordclash', isMe: true, mascot: { color: 'danger', shape: 'tall', traits: {} } }

// Thay đổi hạng so với hôm qua (dương = tăng hạng)
const delta = (i) => [3, 0, -1, 2, 0, 1, -2, 0, 5, -1][i % 10]

function build(values, meValue, meRank, totalWords) {
  const rows = values.map((value, idx) => {
    const p = person(idx)
    const words = totalWords(idx)
    return { ...p, place: idx + 1, change: delta(idx), value, rank: RANK_BY_WORDS(words) }
  })
  return { rows, me: { ...ME, place: meRank, change: 2, value: meValue, rank: 'bach_kim' } }
}

// HỌC TẬP: từ thuộc mới trong tuần. Nhân hạng 47 với +86 từ; @minh.anh hạng 46 với +99.
function learnNational() {
  const values = Array.from({ length: 50 }, (_, i) => Math.round(312 - i * 4.7 - (i > 40 ? 3 : 0)))
  values[45] = 99
  values[46] = 86
  values[47] = 84
  values[48] = 80
  values[49] = 77
  const board = build(values, 86, 47, (i) => 4200 - i * 70)
  board.rows[46] = { ...board.me, place: 47 }
  return board
}

// ĐẤU TRƯỜNG: số trận thắng trong tuần. Nhân hạng 128 (7 thắng), ngoài top 50.
function arenaNational() {
  const values = Array.from({ length: 50 }, (_, i) => Math.max(12, 41 - Math.floor(i * 0.6)))
  const board = build(values, 7, 128, (i) => 3900 - i * 55)
  board.neighbors = [
    { ...person(60), place: 126, change: 1, value: 8, rank: 'vang' },
    { ...person(61), place: 127, change: -2, value: 8, rank: 'bach_kim' },
    { ...board.me },
    { ...person(62), place: 129, change: 0, value: 7, rank: 'bac' },
    { ...person(63), place: 130, change: 4, value: 6, rank: 'vang' },
  ]
  return board
}

// TỔNG: tổng số từ đã thuộc. Nhân hạng 1.204.
function totalNational() {
  const values = Array.from({ length: 50 }, (_, i) => Math.round(8420 - i * 118))
  const board = build(values, 1248, 1204, (i) => 8420 - i * 118)
  board.neighbors = [
    { ...person(70), place: 1202, change: 0, value: 1261, rank: 'bach_kim' },
    { ...person(71), place: 1203, change: -1, value: 1255, rank: 'bach_kim' },
    { ...board.me },
    { ...person(72), place: 1205, change: 1, value: 1240, rank: 'bach_kim' },
    { ...person(73), place: 1206, change: 0, value: 1236, rank: 'bach_kim' },
  ]
  return board
}

// Bạn bè: danh sách nhỏ, Nhân nằm giữa bảng
const FRIENDS = {
  learn: [['Minh Anh', 188], ['Khoa', 142], ['Linh', 120], ['Nhân', 86], ['Tuấn', 64], ['Bảo Anh', 51], ['Gia Hân', 23]],
  arena: [['Bảo Anh', 15], ['Khoa', 11], ['Nhân', 7], ['Minh Anh', 6], ['Linh', 4], ['Tuấn', 3], ['Gia Hân', 1]],
  total: [['Minh Anh', 1812], ['Nhân', 1248], ['Tuấn', 1105], ['Khoa', 960], ['Linh', 742], ['Bảo Anh', 518], ['Gia Hân', 230]],
}

function friendsBoard(board) {
  const rows = FRIENDS[board].map(([name, value], idx) => {
    if (name === 'Nhân') return { ...ME, place: idx + 1, change: idx === 1 ? 1 : 0, value, rank: 'bach_kim' }
    const i = NAMES.indexOf(name)
    const p = person(i)
    return { ...p, handle: name === 'Minh Anh' ? 'minh.anh' : p.handle, place: idx + 1, change: delta(i), value, rank: RANK_BY_WORDS(board === 'total' ? value : 900 + i * 40) }
  })
  return { rows, me: rows.find((r) => r.isMe) }
}

export const UNITS = {
  learn: { plus: true, short: 'từ', label: (v) => `+${v} từ tuần này`, gap: 'từ' },
  arena: { short: 'thắng', label: (v) => `${v} trận thắng`, gap: 'trận thắng' },
  total: { short: 'từ', label: (v) => `${v} từ đã thuộc`, gap: 'từ' },
}

// Phần thưởng tuần: chỉ huy hiệu, khung avatar và lượt quay (TẠM ĐẶT số lượng, cần chốt)
export const WEEKLY_REWARDS = [
  { places: 'Hạng 1', items: ['Huy hiệu Quán quân tuần', 'Khung avatar vàng', '3 lượt quay'] },
  { places: 'Hạng 2–3', items: ['Huy hiệu Á quân tuần', 'Khung avatar bạc', '2 lượt quay'] },
  { places: 'Hạng 4–10', items: ['Huy hiệu Top 10 tuần', '1 lượt quay'] },
]

export function fetchLeaderboard(board, scope, { noFriends = false } = {}) {
  const endsAt = new Date(Date.now() + ((2 * 24 + 6) * 3600 + 14 * 60 + 22) * 1000).toISOString()
  if (scope === 'friends') {
    if (noFriends) return { endsAt, rows: [], me: null, empty: true }
    return { endsAt, ...friendsBoard(board) }
  }
  const data = board === 'arena' ? arenaNational() : board === 'total' ? totalNational() : learnNational()
  return { endsAt, ...data }
}

export async function copyInviteLink() {
  const url = 'https://wordclash.vn/moi/nhan.wordclash'
  await navigator.clipboard.writeText(url)
  return url
}
