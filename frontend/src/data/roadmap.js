/*
 * Nguồn dữ liệu lộ trình dùng chung (mock) cho bản đồ Học Viện, khối Hành trình và Hộ chiếu ở Sảnh, cảnh chuyển cấp.
 * Mọi con số "đã đến / tổng địa danh" đều tính từ LEVELS (số chặng mỗi cấp) và vị trí người học, không viết cứng ở màn nào.
 *
 * Hộ chiếu đếm địa danh cuối mỗi chặng (topics); Trận Boss không tính.
 * TODO: thay bằng GET /academy/levels (số chặng, trạng thái từng cấp) và vị trí học hiện tại do server trả.
 */

// Vùng đất theo `region_theme` của cấp; `flag` là mã lá cờ (components/academy/Flag.jsx), `theme` chọn bộ vật trang trí
// nền bản đồ; `icon` là icon nhỏ ở dải Hành trình (pages/Lobby/RegionIcon.jsx), `landmark` là địa danh tiêu biểu.
export const REGIONS = {
  'vn-north': { name: 'Việt Nam · Miền Bắc', short: 'Việt Nam', flag: 'vn', theme: 'generic', icon: 'ho_guom', landmark: 'Hồ Gươm' },
  'vn-central-south': { name: 'Việt Nam · Miền Trung & Nam', short: 'Miền Trung & Nam', flag: 'vn', theme: 'generic', icon: 'chua_cau', landmark: 'Chùa Cầu' },
  uk: { name: 'Vương quốc Anh', short: 'Anh', flag: 'uk', theme: 'uk', stamp: 'UNITED KINGDOM', icon: 'big_ben', landmark: 'Big Ben' },
  us: { name: 'Mỹ & Canada', short: 'Mỹ & Canada', flag: 'us', theme: 'generic', icon: 'liberty', landmark: 'Tượng Nữ thần Tự do' },
  au: { name: 'Úc', short: 'Úc', flag: 'au', theme: 'generic', icon: 'opera', landmark: 'Nhà hát Sydney' },
  world: { name: 'Thế giới', short: 'Thế giới', flag: 'world', theme: 'generic', icon: 'globe', landmark: 'Vòng quanh thế giới' },
}

// `stages`: số chặng (địa danh) của cấp. B2–C2 chưa có danh sách địa danh, tạm 11 chặng mỗi cấp (cần chốt).
// `status` theo vị trí mẫu bên dưới (A1, A2 xong; đang ở B1).
export const LEVELS = [
  { code: 'A1', name: 'Mới bắt đầu', words: 800, status: 'done', region_theme: 'vn-north', stages: 10 },
  { code: 'A2', name: 'Sơ cấp', words: 1200, status: 'done', region_theme: 'vn-central-south', stages: 10 },
  { code: 'B1', name: 'Trung cấp', words: 2000, status: 'current', region_theme: 'uk', stages: 9 },
  { code: 'B2', name: 'Trung cao cấp', words: 2500, status: 'locked', region_theme: 'us', stages: 11 },
  { code: 'C1', name: 'Cao cấp', words: 2000, status: 'locked', region_theme: 'au', stages: 11 },
  { code: 'C2', name: 'Thành thạo', words: 1500, status: 'locked', region_theme: 'world', stages: 11 },
]

// Vị trí học hiện tại (mẫu): cấp B1, chặng 3 (index 2), bài 3 (index 2). Người mới: A1, chặng 1.
export const POSITION = { level: 'B1', stage: 2, lesson: 2 }
export const NEW_USER_POSITION = { level: 'A1', stage: 0, lesson: 0 }

export const TOTAL_LANDMARKS = LEVELS.reduce((sum, l) => sum + l.stages, 0)

/** Số địa danh đã đến trên cả hành trình: mọi chặng của các cấp trước + các chặng đã xong của cấp hiện tại. */
export function journeyProgress(position = POSITION) {
  const index = LEVELS.findIndex((l) => l.code === position.level)
  const before = LEVELS.slice(0, index).reduce((sum, l) => sum + l.stages, 0)
  return { visited: before + position.stage, total: TOTAL_LANDMARKS }
}

/** 6 vùng đất theo thứ tự cấp, kèm trạng thái done / current / locked so với vị trí người học. */
export function journeyRegions(position = POSITION) {
  const index = LEVELS.findIndex((l) => l.code === position.level)
  return LEVELS.map((l, i) => ({
    code: l.code,
    ...REGIONS[l.region_theme],
    stages: l.stages,
    status: i < index ? 'done' : i === index ? 'current' : 'locked',
  }))
}
