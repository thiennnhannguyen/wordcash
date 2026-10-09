/*
 * Giả lập API kết quả trận (server gửi sau `match_end`).
 *
 * Mọi con số do server tính từ nhật ký trận: máu còn lại, câu K.O., thông số đối chiếu, diễn biến máu,
 * phần thưởng (chuỗi thắng, thắng tuần, huy hiệu) và danh sách từ đã sai kèm đáp án đúng + lựa chọn nhầm.
 * Không có điểm rank ở đây: rank chỉ tính theo số từ đã thuộc ở Học Viện.
 * Diễn biến dưới đây được dựng để khớp luật sát thương (10 / +5 nhanh / x1,5 chí mạng / tự trúng đòn 5).
 * TODO: thay bằng services/arenaApi (GET /api/matches/:id/result) và sự kiện socket tái đấu.
 */

import { ENTRY_BY_WORD } from '../fixtures/lessonEntries'
import { OPPONENT, PLAYER_CARD } from './arenaMock'

// Nhật ký từng câu: ai bắn trúng, sát thương, chí mạng, tự trúng đòn
const WIN_LOG = [
  { hit: 'me', dmg: 15 },
  { hit: 'opp', dmg: 15 },
  { hit: 'me', dmg: 10 },
  { hit: null },
  { hit: 'me', dmg: 15 },
  { hit: 'opp', dmg: 10 },
  { hit: 'me', dmg: 15 },
  { hit: 'me', dmg: 15 },
  { hit: 'me', dmg: 22, crit: true },
  { hit: 'opp', dmg: 10 },
  { hit: null, selfOpp: 5 },
  { hit: null },
  { hit: null },
  { hit: 'me', dmg: 10 },
]

const LOSE_LOG = [
  { hit: 'opp', dmg: 15 },
  { hit: 'me', dmg: 15 },
  { hit: 'opp', dmg: 10 },
  { hit: 'opp', dmg: 15 },
  { hit: 'me', dmg: 10 },
  { hit: 'opp', dmg: 10 },
  { hit: 'opp', dmg: 22, crit: true },
  { hit: 'me', dmg: 15 },
  { hit: 'me', dmg: 15 },
  { hit: 'opp', dmg: 10, selfMe: 5 },
  { hit: 'me', dmg: 15 },
  { hit: 'me', dmg: 10 },
  { hit: 'me', dmg: 10 },
  { hit: 'opp', dmg: 15 },
]

function replay(log) {
  const hp = { me: 100, opp: 100 }
  const series = [{ round: 0, ...hp }]
  const crits = []
  const damage = { me: 0, opp: 0 }
  log.forEach((e, i) => {
    if (e.hit) {
      const target = e.hit === 'me' ? 'opp' : 'me'
      hp[target] = Math.max(0, hp[target] - e.dmg)
      damage[e.hit] += e.dmg
      if (e.crit) crits.push({ round: i + 1, side: e.hit })
    }
    if (e.selfMe) hp.me = Math.max(0, hp.me - e.selfMe)
    if (e.selfOpp) hp.opp = Math.max(0, hp.opp - e.selfOpp)
    series.push({ round: i + 1, ...hp })
  })
  return { hp, series, crits, damage, koRound: log.length }
}

const wrong = (word, chose) => {
  const e = ENTRY_BY_WORD[word]
  return { word, ipa: e.ipa, meaning: e.meaning, chose, example: e.example }
}

function build(outcome) {
  const win = outcome === 'win'
  const r = replay(win ? WIN_LOG : LOSE_LOG)
  return {
    outcome,
    reason: 'ko',
    koRound: r.koRound,
    me: PLAYER_CARD,
    opp: OPPONENT,
    hp: r.hp,
    series: r.series,
    crits: r.crits,
    // Câu trả lời đúng tính cả câu đúng nhưng chậm hơn đối thủ (không gây sát thương)
    stats: win
      ? { correct: { me: 10, opp: 6 }, avgSeconds: { me: 1.6, opp: 2.3 }, bestCombo: { me: 4, opp: 1 }, damage: r.damage }
      : { correct: { me: 9, opp: 10 }, avgSeconds: { me: 1.9, opp: 1.7 }, bestCombo: { me: 3, opp: 4 }, damage: r.damage },
    rewards: win
      ? [
          { kind: 'streak', value: 5, title: 'Chuỗi thắng 5' },
          { kind: 'week', title: 'Thắng tuần này +1', value: 8 },
          { kind: 'badge', title: 'Tốc độ bàn thờ', detail: '5 câu dưới 1 giây' },
        ]
      : [
          { kind: 'streak-lost', title: 'Chuỗi thắng dừng ở 4', value: 0 },
          { kind: 'week-loss', title: 'Thua tuần này +1', value: 4 },
        ],
    wrongWords: win
      ? [wrong('qualification', 'kỹ năng'), wrong('employer', 'đồng nghiệp'), wrong('deadline', 'tiền lương')]
      : [wrong('reliable', 'nhà tuyển dụng'), wrong('candidate', 'đồng nghiệp'), wrong('responsible', 'tự tin')],
    missingHp: win ? 0 : r.hp.opp,
  }
}

export const RESULTS = { win: build('win'), lose: build('lose') }

/**
 * Theo dõi lời mời tái đấu của đối thủ (sự kiện socket). Giả lập: đối thủ bấm tái đấu sau `delayMs`.
 * Trả về hàm hủy.
 */
export function watchRematch(onOpponentWants, { delayMs = 3500 } = {}) {
  const t = setTimeout(onOpponentWants, delayMs)
  return () => clearTimeout(t)
}
