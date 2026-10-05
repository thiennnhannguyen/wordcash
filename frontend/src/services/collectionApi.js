/*
 * Gọi API Bộ Sưu Tập và vòng quay. Trả cùng một dạng dữ liệu (camelCase, giống pages/Collection/collectionMock.js) ở cả hai
 * chế độ để các màn không phân biệt nguồn:
 *   collection = { owned: {id: {count, isNew, receivedAt, source}}, spins: {normal, special}, shards, pity, pityEpic,
 *                  nextSpin: {current, target, left}, avatarId, arenaId, unlockedRegions, newCount }
 *   mascot     = { id, number, name, rarity, region (A1…C2 | special), status (available | coming_soon), obtain, isStarter,
 *                  shape, color, traits, bio, profile }
 * - Chế độ thường: GET /mascots (lưu ETag, gửi If-None-Match), GET /collection, GET /collection/rates,
 *   POST /collection/spins | /collection/exchange (Idempotency-Key), POST /collection/seen, PATCH /users/me.
 * - VITE_USE_MOCK=true: collectionMock.js + data/mascots.js (bản mock, khớp backend/seeds/data/mascots.json bằng npm test).
 * Kết quả quay do SERVER quyết định; client chỉ diễn hoạt cảnh theo kết quả nhận được.
 *
 * Idempotency-Key: mỗi lần bấm sinh một UUID (crypto.randomUUID). Lỗi mạng (không có phản hồi) thì tự thử lại đúng một lần
 * với CÙNG key; người dùng bấm lại cùng thao tác sau lỗi mạng cũng dùng lại key đó, nên server không trừ lượt hai lần.
 * Có phản hồi (thành công hay lỗi nghiệp vụ) thì bỏ key, lần bấm sau sinh key mới.
 */

import { request } from './api'
import { USE_MOCK } from './academyApi'
import * as mock from '../pages/Collection/collectionMock'
import { MASCOTS as MOCK_MASCOTS } from '../data/mascots'
import { GACHA, RARITIES, RARITY_ORDER } from '../utils/constants'

export { USE_MOCK }

const SHAPES = ['round', 'tall', 'wide', 'drop']
const SOURCE_LABELS = { starter: 'Linh vật khởi đầu', gacha: 'Lượt quay', exchange: 'Đổi mảnh', achievement: 'Thành tích' }

/** Một ô danh mục từ API → dạng linh vật của frontend. Ô coming_soon chỉ có id, code, region, rarity, status. */
export function toMascot(m) {
  const profile = m.profile ?? {}
  return {
    id: m.id,
    number: m.id,
    name: m.name ?? null,
    rarity: m.rarity,
    region: m.region === 'SPECIAL' ? 'special' : m.region,
    status: m.status === 'released' ? 'available' : 'coming_soon',
    obtain: m.obtain ?? (m.region === 'SPECIAL' ? 'achievement' : 'gacha'),
    isStarter: Boolean(m.is_starter),
    shape: m.shape ?? SHAPES[m.id % SHAPES.length],
    color: m.primary_color ?? 'neutral',
    traits: m.accessory ?? {},
    bio: profile.bio ?? null,
    profile,
  }
}

export function toCollection(c) {
  return {
    owned: Object.fromEntries(
      c.owned.map((o) => [o.mascot_id, { count: o.copies, isNew: o.is_new, receivedAt: o.first_obtained_at, source: SOURCE_LABELS[o.source] ?? o.source, sourceKey: o.source }]),
    ),
    spins: c.spins,
    shards: c.shards,
    pity: c.pity_counter,
    pityEpic: c.pity_epic,
    nextSpin: { current: c.next_spin.current, target: c.next_spin.target, left: c.next_spin.remaining },
    avatarId: c.avatar_mascot_id,
    arenaId: c.arena_mascot_id,
    unlockedRegions: c.unlocked_regions,
    newCount: c.new_count,
  }
}

const percent = (table) => Object.fromEntries(RARITY_ORDER.map((r) => [r, Math.round(table[r] * 1000) / 10]))

export function toRates(r) {
  return {
    normal: percent(r.rates.normal),
    special: percent(r.rates.special),
    pityEpic: r.pity_epic,
    pity: r.pity_counter,
    poolSize: r.pool_size,
    shardCost: r.exchange_cost,
    shardsPerDuplicate: r.shards_per_duplicate,
    maxBatch: r.max_batch,
    unlockedRegions: r.unlocked_regions,
  }
}

/* ---------- Idempotency-Key ---------- */

const pendingKeys = {} // tên thao tác → {sig, key}

function newKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4000-8000-${Math.random().toString(16).slice(2, 14)}`
}

async function withIdempotency(name, body, send) {
  const sig = JSON.stringify(body)
  let pending = pendingKeys[name]
  if (!pending || pending.sig !== sig) pending = pendingKeys[name] = { sig, key: newKey() }
  for (let attempt = 0; ; attempt += 1) {
    try {
      const res = await send(pending.key)
      delete pendingKeys[name]
      return res
    } catch (error) {
      if (error.status) delete pendingKeys[name] // có phản hồi: lỗi nghiệp vụ, lần sau là lần bấm mới
      else if (attempt === 0) continue // lỗi mạng: thử lại một lần với CÙNG key
      throw error
    }
  }
}

/* ---------- Danh mục ---------- */

let catalogCache = null // {etag, mascots}

async function realFetchCatalog() {
  const res = await request({
    url: '/mascots',
    headers: catalogCache ? { 'If-None-Match': catalogCache.etag } : undefined,
    validateStatus: (s) => s === 200 || s === 304,
    transformResponse: [(data, headers) => ({ body: data ? JSON.parse(data) : null, etag: headers.etag })],
  })
  if (res.body?.mascots) catalogCache = { etag: res.etag, mascots: res.body.mascots.map(toMascot) }
  return catalogCache.mascots
}

export const fetchCatalog = USE_MOCK ? async () => MOCK_MASCOTS : realFetchCatalog

/* ---------- Bộ sưu tập ---------- */

function mockCollection(state = mock.fetchCollection()) {
  const newCount = Object.values(state.owned).filter((o) => o.isNew).length
  return { pityEpic: GACHA.pityEpic, unlockedRegions: ['A1', 'A2'], newCount, ...state, nextSpin: { ...state.nextSpin, left: state.nextSpin.target - state.nextSpin.current } }
}

export const fetchCollection = USE_MOCK
  ? async () => mockCollection()
  : async () => toCollection(await request({ url: '/collection' }))

export const fetchRates = USE_MOCK
  ? async () => ({
      normal: Object.fromEntries(RARITY_ORDER.map((r) => [r, RARITIES[r].rate])),
      special: GACHA.specialRates,
      pityEpic: GACHA.pityEpic,
      pity: mock.fetchCollection().pity,
      poolSize: null,
      shardCost: GACHA.shardCost,
      shardsPerDuplicate: GACHA.shardsPerDuplicate,
      maxBatch: GACHA.maxBatch,
      unlockedRegions: ['A1', 'A2'],
    })
  : async () => toRates(await request({ url: '/collection/rates' }))

/** Một kết quả quay từ API → dạng màn quay dùng: {id, rarity, hint, duplicate, shards, isNew, pity, forced}. `forced` chỉ có thể true ở dev/e2e (/dev/force-next). */
function toResult(r) {
  return { id: r.mascot.id, rarity: r.rarity, hint: r.hint, duplicate: r.was_duplicate, shards: r.shards_gained, isNew: r.is_new_mascot, copies: r.copies, pity: r.pity_triggered, forced: Boolean(r.forced) }
}

async function realOpenPack(kind, count) {
  const res = await withIdempotency('spin', { kind, count }, (key) =>
    request({ url: '/collection/spins', method: 'POST', data: { kind, count }, headers: { 'Idempotency-Key': key } }),
  )
  // Kết quả đã nằm trong DB; đọc lại bộ sưu tập để album, lượt, mảnh khớp server.
  // replayed = server trả lại kết quả của lần gửi trước cùng Idempotency-Key (thử lại sau lỗi mạng), không trừ thêm lượt.
  return { results: res.results.map(toResult), replayed: Boolean(res.replayed), state: await fetchCollection() }
}

export const openPack = USE_MOCK
  ? async (kind, count, force) => {
      const res = await mock.openPack(kind, count, force)
      return { results: res.results.map((r) => ({ ...r, hint: r.rarity, isNew: !r.duplicate })), state: mockCollection(res.state) }
    }
  : realOpenPack

export const exchangeShards = USE_MOCK
  ? async (id) => mockCollection(await mock.exchangeShards(id))
  : async (id) => {
      await withIdempotency('exchange', { mascot_id: id }, (key) =>
        request({ url: '/collection/exchange', method: 'POST', data: { mascot_id: id }, headers: { 'Idempotency-Key': key } }),
      )
      return fetchCollection()
    }

/** Tắt nhãn MỚI (server); trả số thẻ vừa đổi trạng thái. */
export const markSeen = USE_MOCK
  ? async (ids) => {
      ids.forEach((id) => mock.markSeen(id))
      return ids.length
    }
  : async (ids) => (ids.length ? (await request({ url: '/collection/seen', method: 'POST', data: { mascot_ids: ids } })).updated : 0)

/** Đặt avatar / linh vật Đấu Trường (null = Đấu Trường dùng avatar). Server kiểm tra sở hữu (MASCOT_NOT_OWNED). Trả user mới. */
export const updateMascots = USE_MOCK
  ? async ({ avatarId, arenaId }) => {
      if (avatarId !== undefined) await mock.setAvatar(avatarId)
      if (arenaId !== undefined) await mock.setArenaMascot(arenaId)
      return null
    }
  : async ({ avatarId, arenaId }) => {
      const data = {}
      if (avatarId !== undefined) data.avatar_mascot_id = avatarId
      if (arenaId !== undefined) data.arena_mascot_id = arenaId
      return request({ url: '/users/me', method: 'PATCH', data })
    }
