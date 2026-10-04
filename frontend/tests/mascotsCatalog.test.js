/*
 * Bản mock data/mascots.js (chỉ dùng khi VITE_USE_MOCK) không được lệch so với nguồn chính backend/seeds/data/mascots.json:
 * cùng id, tên, độ hiếm, vùng, trạng thái, cách nhận, cờ khởi đầu, hình khối, màu, phụ kiện.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { MASCOTS, STARTER_MASCOT_IDS } from '../src/data/mascots.js'

const SOURCE = JSON.parse(readFileSync(new URL('../../backend/seeds/data/mascots.json', import.meta.url), 'utf8'))

const fromMock = (m) => ({
  id: m.id,
  name: m.name,
  rarity: m.rarity,
  region: m.region === 'special' ? 'SPECIAL' : m.region,
  status: m.status === 'available' ? 'released' : m.status,
  obtain: m.obtain,
  is_starter: STARTER_MASCOT_IDS.includes(m.id),
  shape: m.shape,
  primary_color: m.color,
  accessory: m.traits,
})

const fromSource = (m) => ({
  id: m.id,
  name: m.name,
  rarity: m.rarity,
  region: m.region,
  status: m.status,
  obtain: m.obtain,
  is_starter: m.is_starter,
  shape: m.shape,
  primary_color: m.primary_color,
  accessory: m.accessory,
})

test('mock linh vật khớp mascots.json (100 ô)', () => {
  assert.equal(SOURCE.length, 100)
  assert.deepEqual(MASCOTS.map(fromMock), SOURCE.map(fromSource))
})
