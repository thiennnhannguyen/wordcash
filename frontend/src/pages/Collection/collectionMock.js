/*
 * Giả lập API Bộ Sưu Tập khi backend chưa có.
 *
 * Server trả danh sách 100 linh vật (số thứ tự, tên, độ hiếm, hình), phần sở hữu của người dùng
 * (số bản, ngày nhận, nguồn nhận, thẻ mới), số lượt quay, số mảnh, bộ đếm pity và linh vật đang dùng.
 * Việc đổi mảnh, đặt avatar, chọn linh vật cho Đấu Trường đều do server kiểm tra và trả trạng thái mới;
 * client không tự trừ mảnh hay tự thêm thẻ. Danh sách 100 linh vật nằm ở data/mascots.js (ô "Sắp ra mắt" không bao giờ
 * rơi ra từ vòng quay hay đổi mảnh được).
 */

import { MASCOT_BY_ID, OBTAINABLE_MASCOTS } from '../../data/mascots'
import { GACHA, RARITIES, RARITY_ORDER } from '../../utils/constants'

// Thẻ đã sở hữu (chỉ trong 30 linh vật đã ra mắt): Thường 12 · Hiếm 6 · Sử Thi 3 · Huyền Thoại 0
const OWNED_IDS = [1, 2, 3, 4, 5, 6, 11, 12, 13, 16, 17, 21, 7, 8, 14, 18, 25, 26, 9, 15, 27]
export const OWNED_COUNT = OWNED_IDS.length
const COUNTS = { 9: 3, 1: 2, 12: 2, 4: 4, 5: 2, 7: 2 }
const NEW_IDS = [26, 27, 18]
const SOURCES = ['Lượt quay mốc 1.200 từ', 'Lượt quay streak 7 ngày', 'Lượt quay đặc biệt khi lên Bạch Kim', 'Lượt quay mốc 1.150 từ', 'Đổi mảnh']

function dateDaysAgo(days) {
  const d = new Date('2026-09-30T09:00:00')
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const OWNED = Object.fromEntries(
  OWNED_IDS.map((id, i) => [
    id,
    {
      count: COUNTS[id] ?? 1,
      isNew: NEW_IDS.includes(id),
      receivedAt: id === 9 ? '2026-09-12T20:15:00' : NEW_IDS.includes(id) ? dateDaysAgo(NEW_IDS.indexOf(id)) : dateDaysAgo(3 + ((i * 5) % 120)),
      source: id === 9 ? SOURCES[0] : id === 1 ? 'Linh vật khởi đầu' : SOURCES[i % SOURCES.length],
    },
  ]),
)

let state = {
  owned: OWNED,
  spins: { normal: 2, special: 1 }, // lượt thường và lượt đặc biệt (lên rank)
  shards: 34,
  pity: 14, // số lượt liên tiếp chưa ra Sử Thi
  nextSpin: { current: 38, target: 50 }, // tiến độ tới lượt kế tiếp (số từ thuộc)
  avatarId: 1,
  arenaId: 1,
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function fetchCollection() {
  return state
}

export async function setAvatar(id) {
  await wait(250)
  if (!state.owned[id]) throw new Error('not_owned')
  state = { ...state, avatarId: id }
  return state
}

export async function setArenaMascot(id) {
  await wait(250)
  if (!state.owned[id]) throw new Error('not_owned')
  state = { ...state, arenaId: id }
  return state
}

// Mở thẻ: server bỏ nhãn "MỚI"
export function markSeen(id) {
  if (!state.owned[id]?.isNew) return state
  state = { ...state, owned: { ...state.owned, [id]: { ...state.owned[id], isNew: false } } }
  return state
}

// Đổi mảnh lấy một linh vật chưa có. Server kiểm tra đủ mảnh và thẻ chưa sở hữu.
export async function exchangeShards(id) {
  await wait(500)
  const mascot = MASCOT_BY_ID[id]
  if (mascot?.status !== 'available') throw new Error('coming_soon')
  const cost = GACHA.shardCost[mascot.rarity]
  if (state.owned[id]) throw new Error('already_owned')
  if (state.shards < cost) throw new Error('not_enough_shards')
  state = {
    ...state,
    shards: state.shards - cost,
    owned: { ...state.owned, [id]: { count: 1, isNew: true, receivedAt: new Date().toISOString(), source: 'Đổi mảnh' } },
  }
  return state
}

export function countByRarity(owned) {
  return Object.fromEntries(
    RARITY_ORDER.map((r) => [r, OBTAINABLE_MASCOTS.filter((m) => m.rarity === r && owned[m.id]).length]),
  )
}

export function totalSpins(spins) {
  return spins.normal + spins.special
}

// Chọn độ hiếm theo tỉ lệ; đủ 20 lượt liên tiếp không ra Sử Thi thì lượt này chắc chắn Sử Thi
function rollRarity(type, pity) {
  if (pity >= GACHA.pityEpic) return 'epic'
  const rates = type === 'special' ? GACHA.specialRates : Object.fromEntries(RARITY_ORDER.map((r) => [r, RARITIES[r].rate]))
  let x = Math.random() * 100
  for (const r of RARITY_ORDER) {
    x -= rates[r]
    if (x < 0) return r
  }
  return 'common'
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

/*
 * Mở thẻ (giả lập `POST /api/gacha/open`). Server trừ lượt, quay độ hiếm (có pity), chọn linh vật,
 * cộng bản trùng thành mảnh rồi trả kết quả. Client chỉ diễn hoạt cảnh theo kết quả nhận được.
 * `force` (chỉ để xem thử khi dev): danh sách độ hiếm ép, thêm hậu tố "-dupe" để ép ra thẻ trùng.
 */
export async function openPack(type, count = 1, force = []) {
  await wait(300)
  if (state.spins[type] < count) throw new Error('no_spins')
  let { owned, shards, pity } = state
  owned = { ...owned }
  const results = []
  for (let i = 0; i < count; i++) {
    const forced = force[i]
    const rarity = forced ? forced.replace('-dupe', '') : rollRarity(type, pity)
    pity = rarity === 'epic' || rarity === 'legendary' ? 0 : pity + 1
    // Chỉ linh vật đã ra mắt; ô "Sắp ra mắt" không bao giờ rơi ra
    const pool = OBTAINABLE_MASCOTS.filter((m) => m.rarity === rarity)
    const wantDupe = forced?.endsWith('-dupe')
    const ownedPool = pool.filter((m) => owned[m.id])
    const freshPool = pool.filter((m) => !owned[m.id])
    const mascot = wantDupe && ownedPool.length ? pick(ownedPool) : forced && freshPool.length ? pick(freshPool) : pick(pool)
    const duplicate = Boolean(owned[mascot.id])
    const gained = duplicate ? GACHA.shardsPerDuplicate[rarity] : 0
    shards += gained
    owned[mascot.id] = duplicate
      ? { ...owned[mascot.id], count: owned[mascot.id].count + 1 }
      : { count: 1, isNew: true, receivedAt: new Date().toISOString(), source: type === 'special' ? 'Lượt quay đặc biệt' : 'Lượt quay thường' }
    results.push({ id: mascot.id, rarity, duplicate, shards: gained })
  }
  state = { ...state, owned, shards, pity, spins: { ...state.spins, [type]: state.spins[type] - count } }
  return { results, state }
}

// Chỉ để xem thử trạng thái hết lượt khi dev
export function devEmptySpins() {
  state = { ...state, spins: { normal: 0, special: 0 } }
  return state
}
