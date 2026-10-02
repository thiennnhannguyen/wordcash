/*
 * Giả lập API bài kiểm tra cuối bài (20 câu, qua 80%) và Trận Boss cuối cấp (50 câu, qua 85%).
 *
 * Giữ luật "server là trọng tài": câu hỏi gửi xuống KHÔNG kèm đáp án. Mỗi lần nộp, server chỉ trả đúng/sai
 * và số liệu tiến độ (số câu đúng, máu Boss); đáp án đúng và danh sách từ sai chỉ trả về khi bài kết thúc.
 * Điểm, ngưỡng qua, sát thương lên Boss, phần thưởng và thời gian chờ thử lại đều do server tính.
 * Câu hỏi được dựng từ 18 mục từ nháp trong lessonMock.js, chỉ để dựng giao diện.
 * TODO: thay bằng services/academyApi.
 */

import { speak } from '../../utils/speech'
import { ENTRIES, ENTRY_BY_WORD, LESSON } from './lessonMock'

const LATENCY_MS = 250
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ')

const UNIT_TOTAL = 20
const UNIT_PASS_PERCENT = 80
const BOSS_TOTAL = 50
const BOSS_PASS_PERCENT = 85
const BOSS_RETRY_HOURS = 24

// Mục từ có câu ví dụ chứa đúng nguyên dạng từ, dùng được cho câu "Điền vào câu"
const FILLABLE = ENTRIES.filter((e) => new RegExp(`\\b${e.word}\\b`, 'i').test(e.example))

/** Dựng đề trộn đủ 4 mức. Trả về câu hỏi (gửi xuống client) và khóa đáp án (chỉ server giữ). */
function buildQuestions(prefix, total) {
  const questions = []
  const key = {}
  for (let i = 0; i < total; i++) {
    const level = (i % 4) + 1
    const pool = level === 4 ? FILLABLE : ENTRIES
    const entry = pool[(i * 5 + Math.floor(i / 4)) % pool.length]
    const others = [3, 7, 11].map((d) => ENTRIES[(ENTRIES.indexOf(entry) + d) % ENTRIES.length])
    const pick = level === 1 ? (e) => e.meaning : (e) => e.word
    const options = [entry, ...others].map(pick)
    // Xoay vị trí đáp án đúng theo số câu
    const shift = i % 4
    const rotated = [...options.slice(shift), ...options.slice(0, shift)]
    const id = `${prefix}${i + 1}`

    key[id] = { answer: pick(entry), word: entry.word }
    if (level === 1) questions.push({ id, level, word: entry.word, options: rotated })
    if (level === 2) questions.push({ id, level, options: rotated })
    if (level === 3) questions.push({ id, level, prompt: entry.meaning, letterCount: entry.word.length })
    if (level === 4) {
      const sentence = entry.example.replace(new RegExp(`\\b${entry.word}\\b`, 'i'), '______')
      questions.push({ id, level, sentence, options: rotated })
    }
  }
  return { questions, key }
}

// Phiên làm bài đang mở phía "server"
let session = null

function openSession(kind, total, resumeAt) {
  const { questions, key } = buildQuestions(kind === 'boss' ? 'b' : 'u', total)
  session = { kind, questions, key, answered: 0, correct: 0, wrong: [], bossHp: 100 }
  // Dev: giả lập đã làm sẵn `resumeAt` câu (vài câu sai rải rác) để xem giữa bài
  const wrongAt = kind === 'boss' ? (i) => i % 7 === 5 : (i) => i === 3 || i === 9
  for (let i = 0; i < Math.min(resumeAt, total - 1); i++) record(questions[i].id, !wrongAt(i))
  return session
}

function record(questionId, correct) {
  session.answered += 1
  if (correct) {
    session.correct += 1
    if (session.kind === 'boss') session.bossHp = Math.max(0, session.bossHp - 100 / session.questions.length)
  } else {
    const word = session.key[questionId].word
    if (!session.wrong.includes(word)) session.wrong.push(word)
  }
}

const percentOf = (correct, total) => Math.round((correct / total) * 100)

// ---------- Kiểm tra cuối bài ----------

export async function startUnitTest({ resumeAt = 0 } = {}) {
  await wait(LATENCY_MS)
  const s = openSession('unit', UNIT_TOTAL, resumeAt)
  return {
    lesson: LESSON,
    total: UNIT_TOTAL,
    passPercent: UNIT_PASS_PERCENT,
    questions: s.questions,
    answered: s.answered,
    correct: s.correct,
  }
}

/** Nộp một câu. Chỉ trả đúng/sai và bộ đếm, không trả đáp án đúng (bài chưa kết thúc). */
export async function submitTestAnswer(questionId, answer) {
  await wait(LATENCY_MS)
  const correct = normalize(answer) === normalize(session.key[questionId].answer)
  record(questionId, correct)
  return {
    correct,
    answered: session.answered,
    correctCount: session.correct,
    bossHp: session.kind === 'boss' ? session.bossHp : undefined,
    damage: session.kind === 'boss' && correct ? 100 / session.questions.length : 0,
  }
}

export function playTestAudio(questionId, { slow = false } = {}) {
  const item = session?.key[questionId]
  if (item) speak(item.word, { rate: slow ? 0.55 : 0.9 })
}

const wrongWordsOf = (words) =>
  words.map((w) => ({ word: w, meaning: ENTRY_BY_WORD[w].meaning, ipa: ENTRY_BY_WORD[w].ipa }))

export async function finishUnitTest() {
  await wait(LATENCY_MS)
  const score = percentOf(session.correct, UNIT_TOTAL)
  const passed = score >= UNIT_PASS_PERCENT
  return {
    score,
    correct: session.correct,
    total: UNIT_TOTAL,
    passPercent: UNIT_PASS_PERCENT,
    passed,
    missing: Math.max(0, Math.ceil((UNIT_PASS_PERCENT / 100) * UNIT_TOTAL) - session.correct),
    unlocked: passed ? { number: 4, title: 'Kỹ năng mềm' } : null,
    wrongWords: wrongWordsOf(session.wrong),
  }
}

// ---------- Trận Boss ----------

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export async function startBoss({ level = 'B1', resumeAt = 0 } = {}) {
  await wait(LATENCY_MS)
  const s = openSession('boss', BOSS_TOTAL, resumeAt)
  return {
    level,
    nextLevel: LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1] ?? level,
    bossName: `Boss ${level}`,
    total: BOSS_TOTAL,
    passPercent: BOSS_PASS_PERCENT,
    questions: s.questions,
    answered: s.answered,
    correct: s.correct,
    bossHp: s.bossHp,
  }
}

export async function finishBoss({ level = 'B1' } = {}) {
  await wait(LATENCY_MS)
  const score = percentOf(session.correct, BOSS_TOTAL)
  const passed = score >= BOSS_PASS_PERCENT
  return {
    level,
    nextLevel: LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1] ?? level,
    score,
    correct: session.correct,
    total: BOSS_TOTAL,
    passPercent: BOSS_PASS_PERCENT,
    passed,
    reward: passed ? { specialSpins: 1 } : null,
    weakStages: passed ? [] : WEAK_STAGES,
    retryInHours: passed ? null : BOSS_RETRY_HOURS,
  }
}

// Tỉ lệ đúng theo chặng trong trận (server tổng hợp), 3 chặng yếu nhất
const WEAK_STAGES = [
  { title: 'Môi trường', percent: 64, color: 'accent' },
  { title: 'Sức khỏe', percent: 71, color: 'danger' },
  { title: 'Công việc', percent: 82, color: 'sky' },
]

/** Kết quả dựng sẵn cho `?preview=`. Số liệu khớp mẫu số (20 và 50 câu). */
export const PREVIEW_UNIT = {
  pass: {
    score: 90, correct: 18, total: 20, passPercent: 80, passed: true, missing: 0,
    unlocked: { number: 4, title: 'Kỹ năng mềm' }, wrongWords: wrongWordsOf(['qualification', 'colleague']),
  },
  fail: {
    score: 70, correct: 14, total: 20, passPercent: 80, passed: false, missing: 2, unlocked: null,
    wrongWords: wrongWordsOf(['reliable', 'qualification', 'responsible', 'colleague', 'impress', 'employer']),
  },
}

export const PREVIEW_BOSS = {
  win: {
    level: 'B1', nextLevel: 'B2', score: 92, correct: 46, total: 50, passPercent: 85, passed: true,
    reward: { specialSpins: 1 }, weakStages: [], retryInHours: null,
  },
  lose: {
    level: 'B1', nextLevel: 'B2', score: 78, correct: 39, total: 50, passPercent: 85, passed: false,
    reward: null, weakStages: WEAK_STAGES, retryInHours: BOSS_RETRY_HOURS,
  },
}
