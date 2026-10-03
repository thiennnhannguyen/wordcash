/*
 * Danh sách DUY NHẤT 100 linh vật (Từ Linh) của frontend. Bộ Sưu Tập, vòng quay, Sảnh, Hồ Sơ, Đấu Trường, Onboarding,
 * Landing đều import từ đây; không giữ danh sách linh vật ở nơi khác.
 *
 * - #001–#030: linh vật đã có tên (tên do người dùng đặt; tiểu sử là nội dung nháp tự viết, status = draft).
 * - #031–#100: ô trống `status: "coming_soon"`, `name: null`, đã có vùng đất và độ hiếm theo bảng phân bổ:
 *   vùng A1 17 · A2 17 · B1 15 · B2 15 · C1 14 · C2 15 · Đặc biệt 7; độ hiếm Thường 45 · Hiếm 30 · Sử Thi 18 · Huyền Thoại 7.
 *   Ô "Sắp ra mắt" hiện bóng đen, dấu "?" và nhãn "Sắp ra mắt"; KHÔNG BAO GIỜ rơi ra từ vòng quay hay đổi mảnh được.
 *
 * Mỗi linh vật: `id`, `number`, `name`, `rarity` (common | rare | epic | legendary, khớp RARITIES trong utils/constants.js),
 * `region` (A1…C2 hoặc special), `status` (available | coming_soon), `shape` + `color` + `traits` để vẽ tạm bằng MascotBlob
 * (tác giả sẽ vẽ linh vật thật). `color` là tên token màu trong styles/tokens.css.
 * Linh vật khởi đầu (chọn ở Onboarding, backend chỉ cho đặt avatar 1–3): #001–#003.
 * TODO: lấy từ API khi có bảng mascots.
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

// Ô #031–#100 theo vùng: [vùng, số Thường, Hiếm, Sử Thi, Huyền Thoại]
const COMING_SOON_PLAN = [
  ['A2', 2, 1, 1, 0],
  ['B1', 7, 5, 3, 0],
  ['B2', 7, 5, 3, 0],
  ['C1', 7, 5, 2, 0],
  ['C2', 7, 5, 3, 0],
  ['special', 0, 0, 2, 5],
]
const SHAPES = ['round', 'tall', 'wide', 'drop']

const available = RAW.map(([id, name, rarity, shape, color, traits]) => ({
  id,
  number: id,
  name,
  rarity,
  region: A1_IDS.has(id) ? 'A1' : 'A2',
  status: 'available',
  shape,
  color,
  traits,
  bio: SPECIAL_BIOS[id] ?? BIOS[id % BIOS.length],
}))

const comingSoon = []
for (const [region, ...counts] of COMING_SOON_PLAN) {
  ;['common', 'rare', 'epic', 'legendary'].forEach((rarity, r) => {
    for (let i = 0; i < counts[r]; i += 1) {
      const id = 31 + comingSoon.length
      comingSoon.push({ id, number: id, name: null, rarity, region, status: 'coming_soon', shape: SHAPES[id % SHAPES.length], color: 'neutral', traits: {}, bio: null })
    }
  })
}

export const MASCOTS = [...available, ...comingSoon]
export const MASCOT_BY_ID = Object.fromEntries(MASCOTS.map((m) => [m.id, m]))
export const STARTER_MASCOT_IDS = [1, 2, 3]

export const REGION_LABELS = { A1: 'Vùng A1', A2: 'Vùng A2', B1: 'Vùng B1', B2: 'Vùng B2', C1: 'Vùng C1', C2: 'Vùng C2', special: 'Đặc biệt' }

export const isAvailable = (mascot) => mascot?.status === 'available'

/** Linh vật có thể nhận được (vòng quay, đổi mảnh): bỏ mọi ô "Sắp ra mắt". */
export const OBTAINABLE_MASCOTS = MASCOTS.filter(isAvailable)

export function getMascot(id) {
  const mascot = MASCOT_BY_ID[id]
  return isAvailable(mascot) ? mascot : MASCOT_BY_ID[1]
}
