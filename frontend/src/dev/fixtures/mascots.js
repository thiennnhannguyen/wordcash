/*
 * DỮ LIỆU MẪU CHO TRANG DEV (src/dev): danh mục 100 linh vật để dựng các màn xem thử (Đấu Trường giả, lên rank, thẻ chứng
 * nhận, design system). Code production KHÔNG dùng file này: danh mục thật lấy từ GET /mascots (store/mascotStore.js).
 * Bản sao tĩnh của backend/seeds/data/mascots.json tại thời điểm tách mock (08/10/2026); lệch với JSON không ảnh hưởng gì ngoài
 * trang dev.
*/

const A1_IDS = new Set([1, 5, 7, 9, 10, 11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 26, 27])

const RAW = [
  [1, 'Bông Tím', 'common', 'round', 'primary', { top: 'leaf' }],
  [2, 'Bé Thính', 'common', 'round', 'gold', { top: 'tuft' }],
  [3, 'Ớt Hiểm', 'common', 'drop', 'danger', { top: 'leaf' }],
  [4, 'Bánh Mì Bé', 'common', 'wide', 'orange', { eyes: 'happy', belly: true }],
  [5, 'Nấm Nón', 'common', 'round', 'danger', { belly: true }],
  [6, 'Phin Phin', 'common', 'tall', 'map-wood', { belly: true }],
  [7, 'Tò He', 'rare', 'round', 'sky', { top: 'tuft', eyes: 'happy' }],
  [8, 'Lung Linh', 'rare', 'drop', 'gold', { top: 'antenna' }],
  [9, 'Bánh Bao Sấm', 'epic', 'round', 'raised', { top: 'bolt', belly: true }],
  [10, 'Rồng Mây', 'legendary', 'wide', 'sky', { top: 'horns', eyes: 'wink' }],
  [11, 'Trà Đá', 'common', 'tall', 'sky', { belly: true }],
  [12, 'Trâu Trâu', 'common', 'wide', 'map-stone-deep', { top: 'horns' }],
  [13, 'Cốm Non', 'common', 'round', 'accent', { top: 'leaf' }],
  [14, 'Diều Sáo', 'rare', 'drop', 'sky', { top: 'antenna' }],
  [15, 'Tí Tễu', 'epic', 'round', 'orange', { top: 'tuft', eyes: 'happy' }],
  [16, 'Dừa Xiêm', 'common', 'round', 'map-grass', { top: 'tuft' }],
  [17, 'Thúng Chai', 'common', 'wide', 'map-wood', { eyes: 'happy' }],
  [18, 'Sếu Đỏ', 'rare', 'tall', 'danger', { top: 'tuft' }],
  [19, 'Nhũ Nhũ', 'rare', 'drop', 'map-stone', { belly: true }],
  [20, 'Kim Đá', 'legendary', 'tall', 'gold', { top: 'crown' }],
  [21, 'Kem Kem', 'common', 'tall', 'raised', { top: 'tuft' }],
  [22, 'Voọc Quần Đùi', 'common', 'tall', 'orange', { top: 'bear' }],
  [23, 'Xe Hoa', 'common', 'wide', 'danger', { top: 'antenna' }],
  [24, 'Búp Sen', 'rare', 'drop', 'danger', { top: 'leaf' }],
  [25, 'Đồng Đồng', 'rare', 'round', 'gold', { eyes: 'happy', belly: true }],
  [26, 'Đào Đào', 'rare', 'round', 'danger', { top: 'leaf', eyes: 'happy' }],
  [27, 'Lân Lân', 'epic', 'wide', 'gold', { top: 'horns', eyes: 'wink' }],
  [28, 'Xèo Xèo', 'common', 'wide', 'gold', { eyes: 'happy' }],
  [29, 'Mai Vàng', 'rare', 'round', 'gold', { top: 'leaf' }],
  [30, 'Chép Vũ Môn', 'epic', 'drop', 'orange', { top: 'tuft' }],
]

const BIOS = [
  'Ngủ 14 tiếng mỗi ngày nhưng vẫn nhớ từ vựng giỏi hơn bạn.',
  'Thích nhất là tiếng "ting" khi trả lời đúng.',
  'Mỗi lần gặp từ khó là phồng má lên suy nghĩ.',
  'Tin rằng ôn bài đúng hạn là bí quyết của mọi huyền thoại.',
  'Đi đâu cũng mang theo một cuốn sổ từ bé xíu.',
  'Nói tiếng Anh giọng rất sang, chỉ tiếc là không ai hiểu.',
  'Từng thắng 3 trận liên tiếp chỉ bằng một ánh nhìn.',
  'Sợ nhất là bị gọi tên lúc đang ăn vặt.',
]
const SPECIAL_BIOS = {
  9: 'Sinh ra trong một cơn giông, mỗi lần hắt xì là lóe một tia sét nhỏ. Sợ nhất là bị bỏ vào xửng hấp lại.',
  10: 'Chỉ xuất hiện trước những người học không bao giờ bỏ streak.',
  20: 'Truyền thuyết kể rằng ai thấy nó sẽ nhớ mãi 1.000 từ.',
}

export const RARITY_KEYS = ['common', 'rare', 'epic', 'legendary']

// Bảng phân bổ 100 linh vật theo vùng × độ hiếm (Thường / Hiếm / Sử Thi / Huyền Thoại), tính cả 30 con đã có tên.
// Tổng: Thường 45 · Hiếm 30 · Sử Thi 18 · Huyền Thoại 7.
export const DISTRIBUTION = {
  A1: [8, 5, 3, 1],
  A2: [8, 5, 3, 1],
  B1: [7, 5, 2, 1],
  B2: [7, 4, 3, 1],
  C1: [6, 4, 3, 1],
  C2: [6, 5, 3, 1],
  special: [3, 2, 1, 1],
}

// Ô #031–#100 theo vùng = bảng phân bổ trừ đi các con đã có tên (A1 đã đủ; A2 thiếu 1 Thường, 1 Hiếm, 2 Sử Thi)
const COMING_SOON_PLAN = [
  ['A2', 1, 1, 2, 0],
  ['B1', 7, 5, 2, 1],
  ['B2', 7, 4, 3, 1],
  ['C1', 6, 4, 3, 1],
  ['C2', 6, 5, 3, 1],
  ['special', 3, 2, 1, 1],
]
const SHAPES = ['round', 'tall', 'wide', 'drop']

const available = RAW.map(([id, name, rarity, shape, color, traits]) => ({
  id,
  number: id,
  name,
  rarity,
  region: A1_IDS.has(id) ? 'A1' : 'A2',
  status: 'available',
  obtain: 'gacha',
  shape,
  color,
  traits,
  bio: SPECIAL_BIOS[id] ?? BIOS[id % BIOS.length],
}))

const comingSoon = []
for (const [region, ...counts] of COMING_SOON_PLAN) {
  RARITY_KEYS.forEach((rarity, r) => {
    for (let i = 0; i < counts[r]; i += 1) {
      const id = 31 + comingSoon.length
      const obtain = region === 'special' ? 'achievement' : 'gacha'
      comingSoon.push({ id, number: id, name: null, rarity, region, status: 'coming_soon', obtain, shape: SHAPES[id % SHAPES.length], color: 'neutral', traits: {}, bio: null })
    }
  })
}

export const MASCOTS = [...available, ...comingSoon]
export const MASCOT_BY_ID = Object.fromEntries(MASCOTS.map((m) => [m.id, m]))
export const STARTER_MASCOT_IDS = [1, 2, 3]

export const REGION_LABELS = { A1: 'Vùng A1', A2: 'Vùng A2', B1: 'Vùng B1', B2: 'Vùng B2', C1: 'Vùng C1', C2: 'Vùng C2', special: 'Đặc biệt' }

export const isAvailable = (mascot) => mascot?.status === 'available'

/** Linh vật có thể nhận từ vòng quay / đổi mảnh: đã ra mắt và `obtain = gacha` (bỏ ô "Sắp ra mắt" và linh vật thành tích). */
export const isGachaObtainable = (mascot) => isAvailable(mascot) && mascot.obtain === 'gacha'
export const OBTAINABLE_MASCOTS = MASCOTS.filter(isGachaObtainable)

/** Các linh vật có thể ra ở một độ hiếm, chỉ trong các vùng đã mở (`regions`: mã cấp, vd. ['A1', 'A2', 'B1']). */
export function gachaPool(rarity, regions) {
  return OBTAINABLE_MASCOTS.filter((m) => m.rarity === rarity && regions.includes(m.region))
}

/**
 * Chọn linh vật cho một lượt quay (mock của server) khi đã biết độ hiếm: các con cùng độ hiếm có khả năng ngang nhau.
 * Độ hiếm đó chưa có con nào trong các vùng đã mở thì hạ dần xuống độ hiếm thấp hơn. `random` trả số trong [0, 1).
 */
export function pickGachaMascot(rarity, regions, random = Math.random) {
  for (let r = RARITY_KEYS.indexOf(rarity); r >= 0; r -= 1) {
    const pool = gachaPool(RARITY_KEYS[r], regions)
    if (pool.length) return pool[Math.floor(random() * pool.length)]
  }
  return null
}

export function getMascot(id) {
  const mascot = MASCOT_BY_ID[id]
  return isAvailable(mascot) ? mascot : MASCOT_BY_ID[1]
}
