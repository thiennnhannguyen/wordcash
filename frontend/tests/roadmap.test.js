/*
 * Kiểm tra cách đếm Hộ chiếu trong data/roadmap.js: mỗi cấp = số chặng + 1 địa danh Boss.
 * Chạy: `npm test`.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LEVELS, NEW_USER_POSITION, POSITION, TOTAL_LANDMARKS, journeyProgress, journeyRegions, landmarksOf, unlockedRegions } from '../src/data/roadmap.js'

test('mỗi cấp có số chặng + 1 Boss; A1, A2 có 11 địa danh (khớp seed backend 22 địa danh)', () => {
  assert.equal(landmarksOf(LEVELS[0]), 11)
  assert.equal(landmarksOf(LEVELS[1]), 11)
  assert.equal(landmarksOf(LEVELS[2]), 10)
})

test('tổng địa danh = Σ(số chặng + 1) = 68', () => {
  assert.equal(TOTAL_LANDMARKS, LEVELS.reduce((sum, l) => sum + l.stages + 1, 0))
  assert.equal(TOTAL_LANDMARKS, 68)
})

test('người dùng mẫu ở B1 chặng 3: 22 địa danh A1–A2 + 2 chặng B1 đã xong = 24/68', () => {
  assert.deepEqual(POSITION, { level: 'B1', stage: 2, lesson: 2 })
  assert.deepEqual(journeyProgress(POSITION), { visited: 24, total: 68 })
})

test('người mới: 0/68', () => {
  assert.deepEqual(journeyProgress(NEW_USER_POSITION), { visited: 0, total: 68 })
})

test('đếm các chặng đã xong của cấp hiện tại và Boss khi đã thắng', () => {
  assert.equal(journeyProgress({ level: 'A1', stage: 3 }).visited, 3)
  assert.equal(journeyProgress({ level: 'A1', stage: 10 }).visited, 10)
  assert.equal(journeyProgress({ level: 'A1', stage: 10, bossDone: true }).visited, 11)
  assert.equal(journeyProgress({ level: 'A2', stage: 0 }).visited, 11)
  assert.equal(journeyProgress({ level: 'B1', stage: 0 }).visited, 22)
  assert.equal(journeyProgress({ level: 'C2', stage: 11, bossDone: true }).visited, 68)
})

test('cấp không tồn tại thì báo lỗi thay vì đếm sai', () => {
  assert.throws(() => journeyProgress({ level: 'D1', stage: 0 }))
})

test('trạng thái vùng và vùng đã mở theo vị trí', () => {
  assert.deepEqual(journeyRegions(POSITION).map((r) => r.status), ['done', 'done', 'current', 'locked', 'locked', 'locked'])
  assert.deepEqual(unlockedRegions(POSITION), ['A1', 'A2', 'B1'])
})
