/*
 * Giả lập dữ liệu cảnh chuyển cấp "Bay sang vùng đất mới".
 *
 * `fetchLevelComplete(code)` đóng vai phản hồi của server sau khi thắng Trận Boss (POST /academy/boss/:level/result):
 * cấp vừa chinh phục (vùng đất, số từ đã thuộc, số địa danh), cấp mới được mở, trang hộ chiếu đủ con dấu, phần thưởng.
 * Việc mở cấp, số từ thuộc và lượt quay đều do server quyết định; client chỉ diễn hoạt cảnh.
 * `fetchJourneyStart()` cho người dùng mới: danh sách 6 vùng đất theo thứ tự cấp và tổng số từ của hành trình.
 */

import { getLevelMap, LEVELS, REGIONS } from '../Academy/roadmapMock'

export function fetchLevelComplete(code = 'B1') {
  const index = Math.max(0, LEVELS.findIndex((l) => l.code === code))
  const level = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  const map = getLevelMap(level.code)
  // Sau khi thắng Boss: mọi địa danh của cấp đều đã có dấu
  const stages = map.stages.map((s, i) => (s.visit.status === 'visited' ? s : { ...s, visit: { status: 'visited', visited_at: `2026-09-${String(14 + i).padStart(2, '0')}` } }))
  return {
    from: { code: level.code, name: level.name, region: REGIONS[level.region_theme], words: level.words, landmarks: stages.length + 1 },
    to: next && { code: next.code, name: next.name, region: REGIONS[next.region_theme] },
    boss: { name: map.boss.landmark_name, guardian: map.boss.guardian },
    passportMap: {
      ...map,
      stages,
      boss: { ...map.boss, status: 'done' },
      passport: { ...map.passport, visited: stages.length + 1 }, // các chặng + Boss
    },
    reward: { specialSpins: 1 },
  }
}

export function fetchJourneyStart() {
  return {
    totalWords: 10000,
    regions: LEVELS.map((l) => ({ code: l.code, name: l.name, region: REGIONS[l.region_theme] })),
  }
}
