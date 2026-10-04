/*
 * Kiểm tra bảng phân bổ 100 linh vật (data/mascots.js) và luật chọn linh vật của vòng quay (mock).
 * Chạy: `npm test` (node:test, không cần trình duyệt).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DISTRIBUTION,
  MASCOTS,
  OBTAINABLE_MASCOTS,
  RARITY_KEYS,
  gachaPool,
  isGachaObtainable,
  pickGachaMascot,
} from '../src/data/mascots.js'
import { LEVELS, unlockedRegions } from '../src/data/roadmap.js'

const count = (list, region, rarity) => list.filter((m) => m.region === region && m.rarity === rarity).length

test('đủ 100 linh vật, id và số thứ tự liền nhau 1–100', () => {
  assert.equal(MASCOTS.length, 100)
  MASCOTS.forEach((m, i) => {
    assert.equal(m.id, i + 1)
    assert.equal(m.number, i + 1)
  })
})

test('đếm theo vùng × độ hiếm khớp đúng bảng phân bổ', () => {
  for (const [region, expected] of Object.entries(DISTRIBUTION)) {
    const actual = RARITY_KEYS.map((rarity) => count(MASCOTS, region, rarity))
    assert.deepEqual(actual, expected, `vùng ${region}`)
  }
  const regions = new Set(MASCOTS.map((m) => m.region))
  assert.deepEqual([...regions].sort(), Object.keys(DISTRIBUTION).sort())
})

test('tổng theo độ hiếm là 45 / 30 / 18 / 7, tổng theo vùng là 17/17/15/15/14/15/7', () => {
  const totals = RARITY_KEYS.map((rarity) => MASCOTS.filter((m) => m.rarity === rarity).length)
  assert.deepEqual(totals, [45, 30, 18, 7])
  const perRegion = Object.keys(DISTRIBUTION).map((region) => MASCOTS.filter((m) => m.region === region).length)
  assert.deepEqual(perRegion, [17, 17, 15, 15, 14, 15, 7])
})

test('mỗi vùng A1–C2 có đúng 1 Huyền Thoại', () => {
  for (const level of LEVELS) assert.equal(count(MASCOTS, level.code, 'legendary'), 1, level.code)
})

test('linh vật Đặc biệt nhận qua thành tích, linh vật theo vùng nhận qua vòng quay', () => {
  for (const m of MASCOTS) assert.equal(m.obtain, m.region === 'special' ? 'achievement' : 'gacha', `#${m.id}`)
})

test('#001–#030 đã có tên, #031–#100 là ô "Sắp ra mắt" chưa có tên', () => {
  for (const m of MASCOTS) {
    if (m.id <= 30) assert.ok(m.status === 'available' && m.name, `#${m.id}`)
    else assert.ok(m.status === 'coming_soon' && m.name === null, `#${m.id}`)
  }
})

test('vòng quay / đổi mảnh không bao giờ trả ô "Sắp ra mắt" hay linh vật thành tích', () => {
  assert.ok(OBTAINABLE_MASCOTS.length > 0)
  for (const m of OBTAINABLE_MASCOTS) assert.ok(m.status === 'available' && m.obtain === 'gacha', `#${m.id}`)

  const allRegions = LEVELS.map((l) => l.code).concat('special')
  for (const rarity of RARITY_KEYS) {
    for (const m of gachaPool(rarity, allRegions)) assert.ok(isGachaObtainable(m))
    // Quét đều toàn bộ dải số ngẫu nhiên
    for (let i = 0; i < 200; i += 1) {
      const m = pickGachaMascot(rarity, allRegions, () => i / 200)
      assert.ok(m && isGachaObtainable(m), `${rarity} lần ${i}`)
    }
  }
})

test('vòng quay chỉ lấy linh vật thuộc các vùng đã mở', () => {
  for (const level of LEVELS) {
    const regions = unlockedRegions({ level: level.code, stage: 0 })
    assert.equal(regions.at(-1), level.code)
    for (const rarity of RARITY_KEYS) {
      for (let i = 0; i < 100; i += 1) {
        const m = pickGachaMascot(rarity, regions, () => i / 100)
        if (m) assert.ok(regions.includes(m.region), `${level.code} ${rarity} → #${m.id} vùng ${m.region}`)
      }
    }
  }
  // Người mới (A1) chỉ quay ra linh vật A1
  assert.deepEqual(unlockedRegions({ level: 'A1', stage: 0 }), ['A1'])
})

test('trong cùng một độ hiếm, các con có khả năng ra ngang nhau', () => {
  const regions = ['A1', 'A2']
  for (const rarity of RARITY_KEYS) {
    const pool = gachaPool(rarity, regions)
    const hits = new Map(pool.map((m) => [m.id, 0]))
    const steps = pool.length * 50
    for (let i = 0; i < steps; i += 1) {
      const m = pickGachaMascot(rarity, regions, () => i / steps)
      hits.set(m.id, hits.get(m.id) + 1)
    }
    for (const [id, n] of hits) assert.equal(n, 50, `${rarity} #${id}`)
  }
})
