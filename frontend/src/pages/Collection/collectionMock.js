/*
 * Giả lập API Bộ Sưu Tập khi backend chưa có.
 *
 * Server trả danh sách 100 linh vật (số thứ tự, tên, độ hiếm, hình), phần sở hữu của người dùng
 * (số bản, ngày nhận, nguồn nhận, thẻ mới), số lượt quay, số mảnh, bộ đếm pity và linh vật đang dùng.
 * Việc đổi mảnh, đặt avatar, chọn linh vật cho Đấu Trường đều do server kiểm tra và trả trạng thái mới;
 * client không tự trừ mảnh hay tự thêm thẻ. Tên và tiểu sử là nội dung nháp tự viết (status = draft).
 */

import { GACHA, RARITIES, RARITY_ORDER } from '../../utils/constants'

// Tên nháp, theo số thứ tự: #001–#045 Thường, #046–#075 Hiếm, #076–#093 Sử Thi, #094–#100 Huyền Thoại
const NAMES = [
  'Bột Nếp', 'Mochi', 'Lửa Nhỏ', 'Hạt Tiêu', 'Bông Gòn', 'Xôi Gấc', 'Củ Khoai', 'Nấm Rơm', 'Đậu Nành', 'Bắp Rang',
  'Rau Câu', 'Bánh Flan', 'Tàu Hủ', 'Hạt Dẻ', 'Quả Bơ', 'Trà Đá', 'Bánh Tiêu', 'Chuối Chiên', 'Mít Non', 'Kem Que',
  'Sữa Đậu', 'Bánh Giò', 'Cà Rốt', 'Me Chua', 'Ốc Gạo', 'Bánh Bèo', 'Sương Mai', 'Lá Dứa', 'Hạt Sen', 'Gạo Nếp',
  'Bánh Ú', 'Củ Cải', 'Mây Bông', 'Hạt Mưa', 'Tí Hon', 'Bí Đỏ', 'Bánh Bao Sấm', 'Kẹo Lạc', 'Sỏi Tròn', 'Bánh Đa',
  'Nhãn Lồng', 'Dưa Hấu', 'Ổi Xanh', 'Chôm Chôm', 'Bánh Cam',
  'Trà Sữa', 'Mèo Mây', 'Giọt Sương', 'Cáo Bông', 'Thỏ Trăng', 'Sứa Hồng', 'Nấm Đèn', 'Cánh Diều', 'Gấu Mật', 'Rùa Rêu',
  'Vịt Vàng', 'Sẻ Gió', 'Ốc Tốc Độ', 'Cú Đêm', 'Cá Bay', 'Ếch Hát', 'Sóc Nâu', 'Kem Tan', 'Bánh Xèo', 'Chong Chóng',
  'Pháo Bông', 'Mực Tím', 'Nhím Xù', 'Tằm Tơ', 'Lồng Đèn', 'Bánh Nướng', 'Hạt Mầm', 'Đom Đóm', 'Sao Biển', 'Mây Mưa',
  'Rồng Con', 'Kẹo Dẻo', 'Hổ Giấy', 'Phượng Nhí', 'Lân Múa', 'Kỳ Lân Kem', 'Sét Tí Hon', 'Mèo Băng', 'Ninja Bánh Chưng',
  'Hiệp Sĩ Xôi', 'Pháp Sư Nấm', 'Cá Mập Nhí', 'Phi Hành Bơ', 'Siêu Nhân Đậu', 'Robot Trà Chanh', 'Ma Bánh Flan',
  'Sư Tử Mì', 'Dâu Bóng Đêm',
  'Rồng Mây', 'Phượng Hoàng Lửa', 'Cá Chép Vàng', 'Đại Bánh Bao', 'Thần Lá Sen', 'Kỳ Lân Cầu Vồng', 'Vua Chữ Cái',
]

const COLORS = ['primary', 'accent', 'danger', 'gold', 'sky', 'orange', 'level-b1', 'rank-dong', 'rank-bach-kim', 'level-a1', 'rank-bac', 'level-c2']
const SHAPES = ['round', 'tall', 'wide', 'drop']
const TOPS = [null, 'cat', 'antenna', 'bunny', 'leaf', 'bear', 'tuft', 'horns']
const EYES = ['dot', 'happy', 'dot', 'wink']

function rarityOf(number) {
  if (number <= 45) return 'common'
  if (number <= 75) return 'rare'
  if (number <= 93) return 'epic'
  return 'legendary'
}

// Hình cố định cho các linh vật đã xuất hiện ở màn khác, để mọi nơi vẽ giống nhau
const FIXED = {
  1: { color: 'gold', shape: 'round', traits: {} },
  2: { color: 'primary', shape: 'round', traits: {} },
  3: { color: 'orange', shape: 'tall', traits: { top: 'tuft' } },
  37: { color: 'rank-bac', shape: 'round', traits: { top: 'bolt', eyes: 'happy', belly: true } },
  48: { color: 'sky', shape: 'drop', traits: {} },
  77: { color: 'danger', shape: 'tall', traits: {} },
  97: { color: 'accent', shape: 'wide', traits: { top: 'crown', belly: true } },
}

const BIOS = [
  'Ngủ 14 tiếng mỗi ngày nhưng vẫn nhớ từ vựng giỏi hơn bạn.',
  'Thích nhất là tiếng "ting" khi trả lời đúng.',
  'Mỗi lần gặp từ khó là phồng má lên suy nghĩ.',
  'Tin rằng ôn bài đúng hạn là bí quyết của mọi huyền thoại.',
  'Đi đâu cũng mang theo một cuốn sổ từ bé xíu.',
  'Nói tiếng Anh giọng rất sang, chỉ tiếc là không ai hiểu.',
  'Từng thắng 3 trận liên tiếp chỉ bằng một ánh nhìn.',
  'Sợ nhất là bị gọi tên lúc đang ăn vặt.',
]
const LEGEND_BIOS = [
  'Chỉ xuất hiện trước những người học không bao giờ bỏ streak.',
  'Truyền thuyết kể rằng ai thấy nó sẽ nhớ mãi 1.000 từ.',
]

export const MASCOTS = NAMES.map((name, i) => {
  const number = i + 1
  const rarity = rarityOf(number)
  const top = rarity === 'legendary' ? ['crown', 'leaf', 'horns', 'antenna', 'bolt', 'bunny', 'cat'][number - 94] : TOPS[(number * 3) % TOPS.length]
  return {
    id: number,
    number,
    name,
    rarity,
    color: COLORS[(number * 7) % COLORS.length],
    shape: SHAPES[(number + Math.floor(number / 4)) % SHAPES.length],
    traits: { top, eyes: EYES[number % EYES.length], belly: number % 3 === 0 },
    bio: number === 37 ? 'Sinh ra trong một cơn giông, mỗi lần hắt xì là lóe một tia sét nhỏ. Sợ nhất là bị bỏ vào xửng hấp lại.' : rarity === 'legendary' ? LEGEND_BIOS[number % 2] : BIOS[number % BIOS.length],
    ...FIXED[number],
  }
})

export const MASCOT_BY_ID = Object.fromEntries(MASCOTS.map((m) => [m.id, m]))

// Thẻ đã sở hữu: Thường 28 · Hiếm 7 · Sử Thi 2 · Huyền Thoại 0
const OWNED_IDS = [
  1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 17, 18, 20, 22, 23, 25, 26, 28, 30, 33, 36, 37, 40, 41, 44,
  46, 48, 51, 55, 60, 63, 70,
  77, 82,
]
const COUNTS = { 37: 3, 1: 2, 12: 2, 20: 4, 5: 2, 48: 2 }
const NEW_IDS = [41, 63, 82]
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
      receivedAt: id === 37 ? '2026-09-12T20:15:00' : NEW_IDS.includes(id) ? dateDaysAgo(NEW_IDS.indexOf(id)) : dateDaysAgo(3 + ((i * 5) % 120)),
      source: id === 37 ? SOURCES[0] : id === 2 ? 'Linh vật khởi đầu' : SOURCES[i % SOURCES.length],
    },
  ]),
)

let state = {
  owned: OWNED,
  spins: { normal: 2, special: 1 }, // lượt thường và lượt đặc biệt (lên rank)
  shards: 34,
  pity: 14, // số lượt liên tiếp chưa ra Sử Thi
  nextSpin: { current: 38, target: 50 }, // tiến độ tới lượt kế tiếp (số từ thuộc)
  avatarId: 77,
  arenaId: 77,
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
    RARITY_ORDER.map((r) => [r, MASCOTS.filter((m) => m.rarity === r && owned[m.id]).length]),
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
    const pool = MASCOTS.filter((m) => m.rarity === rarity)
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
