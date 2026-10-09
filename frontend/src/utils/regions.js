/*
 * Vùng đất (trang trí) của lộ trình: tên, lá cờ, bộ vật trang trí bản đồ, icon nhỏ ở dải Hành trình, địa danh tiêu biểu.
 * Chỉ là phần trình bày theo `region_theme` mà server trả cho mỗi cấp (GET /academy/roadmap). KHÔNG chứa số liệu nào:
 * số chặng, trạng thái, Hộ chiếu đều lấy từ server.
 *
 * `REGION_BY_LEVEL`: vùng đất dự kiến của các cấp CHƯA có trong DB (`upcoming_levels` của roadmap), để dải Hành trình vẽ đủ
 * 6 chặng đường với nhãn "Sắp mở". Cấp đã có trong DB luôn dùng `region_theme` của server.
 */

export const REGIONS = {
  'vn-north': { name: 'Việt Nam · Miền Bắc', short: 'Việt Nam', flag: 'vn', theme: 'generic', icon: 'ho_guom', landmark: 'Hồ Gươm' },
  'vn-central-south': { name: 'Việt Nam · Miền Trung & Nam', short: 'Miền Trung & Nam', flag: 'vn', theme: 'generic', icon: 'chua_cau', landmark: 'Chùa Cầu' },
  uk: { name: 'Vương quốc Anh', short: 'Anh', flag: 'uk', theme: 'uk', stamp: 'UNITED KINGDOM', icon: 'big_ben', landmark: 'Big Ben' },
  us: { name: 'Mỹ & Canada', short: 'Mỹ & Canada', flag: 'us', theme: 'generic', icon: 'liberty', landmark: 'Tượng Nữ thần Tự do' },
  au: { name: 'Úc', short: 'Úc', flag: 'au', theme: 'generic', icon: 'opera', landmark: 'Nhà hát Sydney' },
  world: { name: 'Thế giới', short: 'Thế giới', flag: 'world', theme: 'generic', icon: 'globe', landmark: 'Vòng quanh thế giới' },
}

export const REGION_BY_LEVEL = { A1: 'vn-north', A2: 'vn-central-south', B1: 'uk', B2: 'us', C1: 'au', C2: 'world' }

export const LEVEL_CODES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Vùng của một cấp: ưu tiên `region_theme` của server, không có thì vùng dự kiến. */
export function regionOf(levelCode, regionTheme) {
  return REGIONS[regionTheme] ?? REGIONS[REGION_BY_LEVEL[levelCode]] ?? REGIONS.world
}

/**
 * 6 chặng của dải Hành trình từ GET /academy/roadmap: cấp đã có trong DB lấy trạng thái thật (done = Boss đã thắng,
 * current = cấp đang học, locked); cấp chưa có trong DB → `soon` (Sắp mở).
 */
export function journeyRegions(roadmap) {
  const byCode = Object.fromEntries((roadmap?.levels ?? []).map((l) => [l.code, l]))
  const currentCode = roadmap?.current?.level_code ?? roadmap?.levels?.[0]?.code
  return LEVEL_CODES.map((code) => {
    const level = byCode[code]
    const status = !level ? 'soon' : code === currentCode ? 'current' : level.status === 'completed' ? 'done' : 'locked'
    return { code, ...regionOf(code, level?.region_theme), status }
  })
}
