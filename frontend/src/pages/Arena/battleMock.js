/*
 * Giả lập server trận đấu (trọng tài) khi backend Socket.IO chưa có.
 *
 * Server là bên duy nhất chấm đúng/sai, đo thời gian trả lời, tính sát thương, máu, combo và chí mạng.
 * Câu hỏi gửi xuống (`round_start`) KHÔNG kèm đáp án; đáp án đúng, nghĩa, phiên âm chỉ có trong `round_result`.
 * Trả lời sai chỉ báo "sai" + tự mất máu (`self_result`), không lộ đáp án đúng khi đối thủ còn đang trả lời.
 *
 * Luật (ARENA trong constants): người đúng trước gây 10 sát thương, đúng dưới 2 giây +5, sau 3 câu đúng liên tiếp
 * phát kế tiếp x1.5 (chí mạng, dùng xong đồng hồ combo về 0). Sai tự mất 5 HP. Cả hai sai hoặc hết giờ: không ai
 * mất máu. Tối đa 20 câu rồi so máu. Trận chỉ dùng câu mức 1, 2, 4 (không gõ từ, để công bằng giữa điện thoại và PC).
 * Người thua lượt có thể thấy "chậm hơn x giây" nếu câu trả lời của họ tới trong khoảng ngắn sau khi lượt đã chốt.
 *
 * `scene` dựng sẵn từng trạng thái để duyệt thiết kế (tự trả lời thay người chơi, dừng ở khoảnh khắc cần xem).
 * Câu hỏi dựng từ 18 mục từ nháp trong lessonMock.js. TODO: thay bằng services/socket.js + hooks/useSocket.js.
 */

import { ARENA } from '../../utils/constants'
import { speak } from '../../utils/speech'
import { ENTRIES } from '../Academy/lessonMock'

const ROUND_MS = ARENA.ROUND_SECONDS * 1000
const INTRO_MS = 1900
const NEXT_ROUND_MS = 2700
const LATE_WINDOW_MS = 1500
const KO_END_MS = 2800

// ---------- Đề ----------

const TYPES = [1, 2, 4]

function buildQuestions() {
  const fillable = ENTRIES.filter((e) => new RegExp(`\\b${e.word}\\b`, 'i').test(e.example))
  // Câu 7 là "reliable" (mức 1) để khớp thiết kế mẫu
  const rest = ENTRIES.filter((e) => e.word !== 'reliable')
  const order = [...rest.slice(0, 6), ENTRIES.find((e) => e.word === 'reliable'), ...rest.slice(6)]
  const questions = []
  const key = {}

  for (let i = 0; i < ARENA.MAX_QUESTIONS; i++) {
    const type = TYPES[i % 3]
    const entry = type === 4 ? fillable[(i * 7) % fillable.length] : order[i % order.length]
    const idx = ENTRIES.indexOf(entry)
    const others = [5, 9, 13].map((d) => ENTRIES[(idx + d) % ENTRIES.length])
    const pick = type === 1 ? (e) => e.meaning : (e) => e.word
    const options = [entry, ...others].map(pick)
    const shift = (i * 3) % 4
    const rotated = [...options.slice(shift), ...options.slice(0, shift)]
    const id = `r${i + 1}`

    key[id] = { correctIndex: rotated.indexOf(pick(entry)), entry }
    if (type === 1) questions.push({ id, type, word: entry.word, ipa: entry.ipa, options: rotated })
    if (type === 2) questions.push({ id, type, options: rotated })
    if (type === 4) questions.push({ id, type, sentence: entry.example.replace(new RegExp(`\\b${entry.word}\\b`, 'i'), '______'), options: rotated })
  }
  return { questions, key }
}

// Đối thủ mẫu cho chế độ chơi thử: đúng khoảng 60%, trả lời trong 2,2–7 giây, thỉnh thoảng không kịp
function defaultOpponent(round) {
  const r = (round * 37) % 100
  if (r < 12) return null
  return { correct: r % 5 < 3, ms: 2200 + ((round * 911) % 4800) }
}

// ---------- Các cảnh dựng sẵn ----------

const BASE = { hp: { me: 85, opp: 70 }, round: 7 }

export const SCENES = {
  play: { round: 1 },
  intro: { round: 1, hold: 'question' },
  shoot: { ...BASE, combo: { me: 1 }, auto: { correct: true, ms: 1400 }, opponent: { correct: true, ms: 6000 }, hold: 'result' },
  hit: { ...BASE, combo: { me: 1 }, auto: { correct: true, ms: 1400 }, opponent: { correct: true, ms: 6000 }, hold: 'result' },
  crit: { ...BASE, hp: { me: 85, opp: 62 }, combo: { me: 3 }, auto: { correct: true, ms: 1300 }, opponent: { correct: true, ms: 6000 }, hold: 'result' },
  hurt: { ...BASE, opponent: { correct: true, ms: 1300 }, auto: { correct: true, ms: 1900 }, hold: 'result' },
  wrong: { ...BASE, combo: { me: 2 }, auto: { correct: false, ms: 1500 }, hold: 'self' },
  draw: { ...BASE, auto: { correct: false, ms: 1200 }, opponent: { correct: false, ms: 2000 }, hold: 'result' },
  reveal: { ...BASE, auto: { correct: true, ms: 1400 }, opponent: { correct: true, ms: 6000 }, hold: 'reveal' },
  stickers: { ...BASE, auto: { correct: true, ms: 1400 }, opponent: { correct: true, ms: 6000 }, hold: 'reveal', oppSticker: 'nhanh' },
  ko: { hp: { me: 62, opp: 10 }, round: 13, combo: { me: 1 }, auto: { correct: true, ms: 1500 }, hold: 'ko' },
  timeup: { hp: { me: 45, opp: 30 }, round: 20, auto: { correct: false, ms: 900 }, opponent: { correct: false, ms: 1500 }, hold: 'end' },
  listen: { ...BASE, round: 8, hold: 'question' },
  fill: { ...BASE, round: 9, hold: 'question' },
  'opp-offline': { ...BASE, hold: 'question', opponentLost: true },
  offline: { ...BASE, hold: 'question', selfLost: true },
}

export const STICKERS = [
  { id: 'gg', text: 'GG' },
  { id: 'nhanh', text: 'Nhanh quá!' },
  { id: 'hehe', text: 'Hehe' },
  { id: 'sap-thua', text: 'Sắp thua rồi' },
  { id: 'tai-dau', text: 'Tái đấu?' },
  { id: 'hay', text: 'Hay đó' },
]

// ---------- Server ----------

export function createBattle({ scene = 'play', onEvent }) {
  const cfg = SCENES[scene] ?? SCENES.play
  const { questions, key } = buildQuestions()
  const st = {
    round: cfg.round ?? 1,
    hp: { me: ARENA.MAX_HP, opp: ARENA.MAX_HP, ...cfg.hp },
    combo: { me: 0, opp: 0, ...cfg.combo },
    history: [],
    timers: [],
    rs: null,
    disposed: false,
  }
  const emit = (event) => !st.disposed && onEvent(event)
  const later = (ms, fn) => st.timers.push(setTimeout(fn, ms))
  const other = (side) => (side === 'me' ? 'opp' : 'me')

  // Lịch sử giả cho các câu trước (để băng từ vựng có từ đã qua)
  for (let r = 1; r < st.round; r++) {
    const e = key[`r${r}`].entry
    st.history.push({ word: e.word, winner: r % 3 === 0 ? 'opp' : r % 4 === 0 ? null : 'me' })
  }

  function ticker() {
    return questions.map((q, i) => {
      const r = i + 1
      if (r < st.round) return { round: r, state: 'done', ...st.history[i] }
      if (r === st.round) return { round: r, state: 'current', word: q.type === 1 ? q.word : null, type: q.type }
      return { round: r, state: 'upcoming', length: key[q.id].entry.word.length }
    })
  }

  function startRound() {
    const q = questions[st.round - 1]
    const t0 = Date.now()
    st.rs = { q, t0, me: null, opp: null, resolved: false }
    emit({ type: 'round_start', round: st.round, total: ARENA.MAX_QUESTIONS, question: q, endsAt: t0 + ROUND_MS, hp: { ...st.hp }, combo: { ...st.combo }, ticker: ticker() })

    if (cfg.opponentLost) later(900, () => emit({ type: 'opponent_connection', status: 'lost', graceSeconds: ARENA.RECONNECT_SECONDS }))
    if (cfg.selfLost) later(900, () => emit({ type: 'connection', status: 'lost' }))
    if (cfg.hold === 'question') return

    const script = scene === 'play' ? defaultOpponent(st.round) : cfg.opponent
    if (script) later(script.ms, () => answer('opp', script.correct ? key[q.id].correctIndex : (key[q.id].correctIndex + 1) % 4, script.ms))
    if (cfg.auto) later(cfg.auto.ms, () => answer('me', cfg.auto.correct ? key[q.id].correctIndex : (key[q.id].correctIndex + 2) % 4, cfg.auto.ms))
    if (cfg.hold !== 'self') later(ROUND_MS, () => !st.rs.resolved && resolve(null))
  }

  function answer(side, choice, ms) {
    const rs = st.rs
    if (!rs) return
    if (rs.resolved) {
      // Trả lời tới sau khi lượt đã chốt: không chấm, chỉ báo chậm hơn bao nhiêu
      if (side === 'me' && !rs.me && Date.now() - rs.resolvedAt < LATE_WINDOW_MS && rs.winnerMs != null) {
        rs.me = { choice, late: true }
        emit({ type: 'late', choice, slowerBy: (ms - rs.winnerMs) / 1000 })
      }
      return
    }
    if (rs[side]) return
    const correct = choice === key[rs.q.id].correctIndex
    rs[side] = { choice, correct, ms }
    if (correct) {
      resolve(side)
      return
    }
    st.hp[side] = Math.max(0, st.hp[side] - ARENA.WRONG_SELF_DAMAGE)
    st.combo[side] = 0
    emit({ type: side === 'me' ? 'self_result' : 'opponent_self', choice: side === 'me' ? choice : undefined, amount: ARENA.WRONG_SELF_DAMAGE, hp: { ...st.hp }, combo: { ...st.combo } })
    if (st.hp[side] === 0) resolve(null)
    else if (rs[other(side)] && !rs[other(side)].correct) resolve(null)
  }

  function resolve(winner) {
    const rs = st.rs
    rs.resolved = true
    rs.resolvedAt = Date.now()
    rs.winnerMs = winner ? rs[winner].ms : null
    const { entry, correctIndex } = key[rs.q.id]

    let damage = null
    if (winner) {
      const target = other(winner)
      const fast = rs[winner].ms < ARENA.FAST_MS
      const crit = st.combo[winner] >= ARENA.CRIT_STREAK
      const amount = Math.floor((ARENA.BASE_DAMAGE + (fast ? ARENA.FAST_BONUS : 0)) * (crit ? ARENA.CRIT_MULTIPLIER : 1))
      st.hp[target] = Math.max(0, st.hp[target] - amount)
      st.combo[winner] = crit ? 0 : st.combo[winner] + 1
      damage = { from: winner, target, amount, fast, crit, bonus: fast ? ARENA.FAST_BONUS : 0 }
    }
    // Hết giờ mà không trả lời thì mất chuỗi combo
    for (const side of ['me', 'opp']) if (!rs[side] && !winner) st.combo[side] = 0

    const ko = st.hp.me === 0 ? 'me' : st.hp.opp === 0 ? 'opp' : null
    st.history[st.round - 1] = { word: entry.word, winner }
    emit({
      type: 'round_result',
      round: st.round,
      outcome: winner === 'me' ? 'me_hit' : winner === 'opp' ? 'opp_hit' : 'draw',
      correctIndex,
      word: entry.word,
      ipa: entry.ipa,
      meaning: entry.meaning,
      damage,
      // Lựa chọn của người chơi trong lượt (nếu có), để client tô đúng nút
      myChoice: rs.me && !rs.me.late ? rs.me.choice : null,
      hp: { ...st.hp },
      combo: { ...st.combo },
      ko,
      // Từ người chơi chưa trả lời đúng được đưa vào danh sách ôn
      bookmarked: winner !== 'me',
    })

    if (['result', 'self', 'reveal'].includes(cfg.hold)) return
    if (ko) {
      if (cfg.hold !== 'ko') later(KO_END_MS, () => emit({ type: 'match_end', reason: 'ko', winner: other(ko), hp: { ...st.hp } }))
      return
    }
    if (st.round >= ARENA.MAX_QUESTIONS) {
      const w = st.hp.me === st.hp.opp ? null : st.hp.me > st.hp.opp ? 'me' : 'opp'
      later(1400, () => emit({ type: 'match_end', reason: 'rounds', winner: w, hp: { ...st.hp } }))
      return
    }
    later(NEXT_ROUND_MS, () => {
      st.round += 1
      startRound()
    })
  }

  return {
    start() {
      emit({ type: 'intro' })
      later(INTRO_MS, () => {
        startRound()
        if (cfg.oppSticker) later(2600, () => emit({ type: 'sticker', side: 'opp', id: cfg.oppSticker }))
      })
    },
    /** `choice` là vị trí đáp án (0–3). Thời gian trả lời do server đo. */
    submit(questionId, choice) {
      if (st.rs?.q.id !== questionId) return
      answer('me', choice, Date.now() - st.rs.t0)
    },
    /** Âm thanh câu "nghe chọn từ": API thật gửi audio_url, không gửi chữ. */
    playAudio(questionId, { slow = false } = {}) {
      const item = key[questionId]
      if (item) speak(item.entry.word, { rate: slow ? 0.55 : 0.9 })
    },
    /** Sticker chỉ được gửi giữa hai câu hỏi; server từ chối nếu đang trong lượt. */
    sendSticker(id) {
      if (st.rs && !st.rs.resolved) return false
      emit({ type: 'sticker', side: 'me', id })
      return true
    },
    dispose() {
      st.disposed = true
      st.timers.forEach(clearTimeout)
    },
  }
}
