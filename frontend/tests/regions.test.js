/*
 * Vùng đất của lộ trình (utils/regions.js) và bộ chuyển bản đồ (pages/Academy/roadmapAdapter.js) chạy trên phản hồi mẫu của
 * GET /academy/roadmap (tests/fixtures/roadmap.json): trạng thái lấy từ server, cấp chưa có trong DB ghi "sắp mở",
 * Hộ chiếu và số từ không tự đặt.
 */

import assert from 'node:assert/strict'
import { test } from 'vitest'
import roadmap from './fixtures/roadmap.json'
import { journeyRegions, regionOf } from '../src/utils/regions.js'
import { buildLevelMap, buildLevelTabs } from '../src/pages/Academy/roadmapAdapter.js'

test('dải Hành trình: 6 vùng, trạng thái theo server, cấp chưa có trong DB là "soon"', () => {
  const regions = journeyRegions(roadmap)
  assert.deepEqual(regions.map((r) => [r.code, r.status]), [['A1', 'done'], ['A2', 'current'], ['B1', 'soon'], ['B2', 'soon'], ['C1', 'soon'], ['C2', 'soon']])
  assert.equal(regions[0].flag, 'vn')
  assert.equal(regionOf('B1').short, 'Anh')
})

test('tab cấp và bản đồ: tên, số từ, Hộ chiếu đều từ server', () => {
  const tabs = buildLevelTabs(roadmap)
  assert.equal(tabs[1].name, 'Sơ cấp')
  assert.equal(tabs[1].words, 33)
  assert.equal(tabs[2].comingSoon, true)
  assert.equal(tabs[2].name, null)
  const map = buildLevelMap(roadmap, 'A2')
  assert.equal(map.summary.total, 33)
  assert.equal(map.summary.mastered, 0) // chưa qua bài nào
  assert.deepEqual(map.passport, { visited: 0, total: 2, journeyVisited: 2, journeyTotal: 4 })
  assert.equal(map.stages[0].visit.status, 'target')
  assert.equal(buildLevelMap(roadmap, 'B1').comingSoon, true)
})
