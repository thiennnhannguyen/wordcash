/*
 * Giả lập API Cửa Ải Hôm Nay khi backend chưa có (services/daily_check.py).
 *
 * Giữ đúng luật "server là trọng tài": câu hỏi gửi xuống KHÔNG kèm đáp án; đáp án đúng, phiên âm,
 * câu ví dụ và mức trừ từ thuộc chỉ trả về sau khi người dùng nộp câu trả lời.
 * TODO: thay bằng services/academyApi (GET /daily-check, POST /daily-check/answer, POST /daily-check/finish).
 */

const LATENCY_MS = 250

// "Kho" phía server: chỉ module này thấy đáp án
const SERVER_BANK = {
  q1: { answer: 'reliable', ipa: '/rɪˈlaɪəbl/', meaning: 'đáng tin cậy', example: 'She is a very reliable friend.' },
  q2: { answer: 'a piece of cake', ipa: '/ə piːs əv keɪk/', meaning: 'dễ ợt', example: "Don't worry, the test was a piece of cake." },
  q3: { answer: 'environment', ipa: '/ɪnˈvaɪrənmənt/', meaning: 'môi trường', example: 'We must protect the environment.' },
  q4: { answer: 'loyal', ipa: '/ˈlɔɪəl/', meaning: 'trung thành', example: 'He has always been a loyal friend.' },
}

// Dữ liệu gửi xuống client
const QUESTIONS = [
  { id: 'q1', type: 'type', prompt: 'đáng tin cậy', letterCount: 8 },
  {
    id: 'q2',
    type: 'choice',
    sentence: "Don't worry, the test was ______.",
    options: ['a piece of cake', 'look forward to', 'brave', 'reliable'],
  },
  { id: 'q3', type: 'type', prompt: 'môi trường', letterCount: 11 },
  {
    id: 'q4',
    type: 'choice',
    sentence: 'She is a very ______ friend.',
    options: ['loyal', 'recyclable', 'relevant', 'famous'],
  },
]

// Mức trừ khi quên từ (theo CLAUDE.md lấy từ config; chưa chốt, tạm là 1)
const FORGET_PENALTY = 1
const SPIN_EVERY_STREAK_DAYS = 7

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ')

export async function fetchDailyCheck({ streak = 12 } = {}) {
  await wait(LATENCY_MS)
  return { streak, questions: QUESTIONS }
}

export async function submitAnswer(questionId, answer) {
  await wait(LATENCY_MS)
  const item = SERVER_BANK[questionId]
  const correct = normalize(answer) === normalize(item.answer)
  return {
    correct,
    correctAnswer: item.answer,
    ipa: item.ipa,
    meaning: item.meaning,
    example: item.example,
    masteredDelta: correct ? 0 : -FORGET_PENALTY,
  }
}

export async function finishDailyCheck({ streak, results }) {
  await wait(LATENCY_MS)
  const wrong = results.filter((r) => !r.correct)
  const perfect = wrong.length === 0
  const newStreak = perfect ? streak + 1 : streak
  return {
    correctCount: results.length - wrong.length,
    total: results.length,
    perfect,
    streakBefore: streak,
    streakAfter: newStreak,
    spinReward: perfect && newStreak % SPIN_EVERY_STREAK_DAYS === 0 ? 1 : 0,
    masteredDelta: -wrong.length * FORGET_PENALTY,
    wrongWords: wrong.map((r) => ({ word: r.correctAnswer, meaning: r.meaning })),
    // Minh họa: có câu sai thì số từ thuộc rơi dưới mốc Bạch Kim
    rankShaky: perfect ? null : { rank: 'bach_kim', daysLeft: 3, wordsToRecover: 12 },
  }
}

/** Kết quả dựng sẵn để xem nhanh 3 biến thể màn kết quả (`?preview=perfect|milestone|mistake`). */
export const PREVIEW_RESULTS = {
  perfect: {
    correctCount: 4, total: 4, perfect: true, streakBefore: 12, streakAfter: 13, spinReward: 0, masteredDelta: 0, wrongWords: [], rankShaky: null,
  },
  milestone: {
    correctCount: 4, total: 4, perfect: true, streakBefore: 13, streakAfter: 14, spinReward: 1, masteredDelta: 0, wrongWords: [], rankShaky: null,
  },
  mistake: {
    correctCount: 3,
    total: 4,
    perfect: false,
    streakBefore: 12,
    streakAfter: 12,
    spinReward: 0,
    masteredDelta: -1,
    wrongWords: [{ word: 'reliable', meaning: 'đáng tin cậy' }],
    rankShaky: { rank: 'bach_kim', daysLeft: 3, wordsToRecover: 12 },
  },
}
