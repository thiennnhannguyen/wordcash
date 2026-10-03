/*
 * 30 Từ Linh đầu tiên (dữ liệu giả để dựng giao diện; tên do người dùng đặt, chưa có tiểu sử).
 *
 * Mỗi linh vật: `id`, `name`, `rarity` (common | rare | epic | legendary, khớp RARITIES trong utils/constants.js),
 * `region` (vùng đất xuất hiện: A1 Miền Bắc, A2 Miền Trung & Nam), `shape` + `color` + `traits` để vẽ tạm bằng MascotBlob
 * (chưa có ShapeMascot; tác giả sẽ vẽ linh vật thật). `color` là tên token màu trong styles/tokens.css.
 *
 * TODO: thống nhất với 100 linh vật trong pages/Collection/collectionMock.js (đang đánh số theo độ hiếm, tên khác)
 * khi có danh sách chính thức; sau này dữ liệu lấy từ API.
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

export const MASCOTS = RAW.map(([id, name, rarity, shape, color, traits]) => ({
  id,
  number: id,
  name,
  rarity,
  region: A1_IDS.has(id) ? 'A1' : 'A2',
  shape,
  color,
  traits,
}))

const BY_ID = new Map(MASCOTS.map((m) => [m.id, m]))

export function getMascot(id) {
  return BY_ID.get(id) ?? MASCOTS[0]
}
