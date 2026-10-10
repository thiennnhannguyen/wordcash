/*
 * Gọi API Học Viện, Cửa Ải Hôm Nay, Ôn tập, /me/stats (docs/academy.md).
 *
 * - Hàm gọi thẳng API (`getRoadmap`, `startLearn`, `submitAnswers`, `getMeStats`…) trả JSON của server (snake_case);
 *   câu hỏi được đổi `letter_count` → `letterCount` cho khớp components/academy/QuestionView.
 * - "Bộ chuyển" cho các màn Kiểm tra / Trận Boss (qua useTestRun) và Cửa Ải: đổi phản hồi server sang dạng dữ liệu các màn
 *   đó vẽ (camelCase, gom sẵn từ sai, phần mở khóa…).
 * - Server là trọng tài: câu hỏi không có đáp án; đúng/sai, điểm, mở khóa, con dấu, lượt quay, rank đều lấy từ phản hồi.
 */

import { request } from './api'
import { speak } from '../utils/speech'

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const toQuestion = ({ letter_count: letterCount, ...q }) => (letterCount == null ? q : { ...q, letterCount })
const withQuestions = (session) => ({ ...session, questions: session.questions.map(toQuestion) })

/* ---------- Gọi thẳng API ---------- */

export const getRoadmap = (branch = 'foundation') => request({ url: '/academy/roadmap', params: { branch } })
export const getUnit = (id) => request({ url: `/academy/units/${id}` })
export const startLearn = (unitId) => request({ method: 'post', url: `/academy/units/${unitId}/learn-sessions` }).then(withQuestions)
export const startUnitTestSession = (unitId) => request({ method: 'post', url: `/academy/units/${unitId}/test-sessions` }).then(withQuestions)
export const startTopicTestSession = (topicId) => request({ method: 'post', url: `/academy/topics/${topicId}/test-sessions` }).then(withQuestions)
export const startPractice = (topicId) => request({ method: 'post', url: `/academy/topics/${topicId}/practice-sessions` }).then(withQuestions)
export const getBoss = (levelId) => request({ url: `/academy/levels/${levelId}/boss` })
export const startBossSession = (levelId) => request({ method: 'post', url: `/academy/levels/${levelId}/boss-sessions` }).then(withQuestions)
export const submitAnswers = (sessionId, answers) => request({ method: 'post', url: `/study-sessions/${sessionId}/answers`, data: { answers } })
export const getDailyCheckToday = () => request({ url: '/daily-check/today' })
export const submitDailyCheck = (answers) => request({ method: 'post', url: '/daily-check/today/answers', data: { answers } })
export const getMeStats = () => request({ url: '/me/stats' })
export const getReviewDue = () => request({ url: '/review/due' })
export const startReview = (limit) => request({ method: 'post', url: '/review/sessions', data: limit ? { limit } : {} }).then(withQuestions)

/** Mục từ của server → dạng WordCard / danh sách từ sai. */
/** Số ngày còn lại (làm tròn lên, tối thiểu 1) từ số giây server trả; không dùng giờ máy người dùng. */
export function daysLeft(seconds) {
  return Math.max(1, Math.ceil((seconds ?? 0) / 86400))
}

export function toWordEntry(e) {
  if (!e) return null
  return { id: e.id, word: e.headword, ipa: e.ipa, pos: e.pos, meaning: e.meaning_vi, variantNote: e.variant_note, example: e.example, collocations: e.collocations ?? [], family: e.word_family ?? [], audio_url: e.audio_url }
}

function playQuestion(question, { slow = false } = {}) {
  if (question?.audio_url) {
    const audio = new Audio(question.audio_url)
    audio.playbackRate = slow ? 0.75 : 1
    audio.play().catch(() => {})
  } else if (question?.word) speak(question.word, { rate: slow ? 0.55 : 0.9 })
}

/* ---------- Bộ chuyển cho màn Kiểm tra / Trận Boss ---------- */

let run = null // phiên đang làm: {id, kind, total, correct, questions, final}

function openRun(kind, session, extra) {
  run = { id: session.id, kind, total: session.total, correct: 0, questions: session.questions, final: null }
  return { total: session.total, passPercent: Math.round(session.pass_rate * 100), questions: session.questions, answered: 0, correct: 0, ...extra }
}

/** Kiểm tra cuối bài (`unitId`) hoặc bài tổng hợp chặng (`topicId`). */
export async function startUnitTest({ unitId, topicId } = {}) {
  if (topicId) {
    const [session, road] = await Promise.all([startTopicTestSession(topicId), getRoadmap()])
    const level = road.levels.find((l) => l.topics.some((t) => t.id === Number(topicId)))
    const topic = level.topics.find((t) => t.id === Number(topicId))
    return openRun('topic', session, {
      lesson: { kind: 'topic', level: level.code, number: topic.order, title: topic.title, topicId: topic.id, landmark: topic.landmark_name },
    })
  }
  const [session, unit] = await Promise.all([startUnitTestSession(unitId), getUnit(unitId)])
  return openRun('unit', session, {
    lesson: { kind: 'unit', level: unit.level.code, number: unit.position, title: unit.title, topic: unit.topic.title, unitId: unit.id, topicId: unit.topic.id },
  })
}

export async function submitTestAnswer(questionId, answer) {
  const res = await submitAnswers(run.id, [{ question_id: questionId, answer }])
  const r = res.results.find((x) => x.question_id === questionId)
  if (r.correct) run.correct += 1
  if (res.finished) run.final = res
  const perHit = 100 / run.total
  return {
    correct: r.correct,
    answered: res.answered,
    correctCount: run.correct,
    bossHp: run.kind === 'boss' ? Math.max(0, 100 - run.correct * perHit) : undefined,
    damage: run.kind === 'boss' && r.correct ? perHit : 0,
  }
}

/** id phiên kiểm tra / Trận Boss đang làm (nút "Báo lỗi" gửi kèm để server chụp lại câu hỏi). */
export const currentRunId = () => run?.id ?? null

export function playTestAudio(questionId, opts) {
  playQuestion(run?.questions.find((q) => q.id === questionId), opts)
}

function wrongWordsOf(final) {
  return (final.summary?.wrong ?? []).map((w) => ({ word: w.headword, meaning: w.meaning_vi, ipa: w.ipa, entry: toWordEntry(w) }))
}

function unlockedOf(outcome) {
  const unit = outcome.unlocked.find((e) => e.type === 'unit' && !outcome.unlocked.some((x) => x.type === 'topic'))
  if (unit) return { kind: 'unit', number: unit.position, title: unit.title, id: unit.id }
  if (outcome.unlocked.some((e) => e.type === 'topic_test')) return { kind: 'topic_test', number: null, title: 'Bài tổng hợp chặng', topicId: outcome.unlocked[0].topic_id }
  const topic = outcome.unlocked.find((e) => e.type === 'topic')
  if (topic) {
    const first = outcome.unlocked.find((e) => e.type === 'unit')
    return { kind: 'topic', number: topic.order, title: topic.title, landmark: topic.landmark_name, id: first?.id }
  }
  const boss = outcome.unlocked.find((e) => e.type === 'boss')
  if (boss) return { kind: 'boss', number: null, title: `Trận Boss ${boss.code}`, code: boss.code }
  return null
}

export async function finishUnitTest() {
  const final = run.final
  const { summary, outcome } = final
  const passPercent = Math.round(outcome.pass_rate * 100)
  return {
    score: summary.score,
    correct: summary.correct,
    total: summary.total,
    passPercent,
    passed: outcome.passed,
    missing: Math.max(0, Math.ceil((outcome.pass_rate * summary.total) - 1e-9) - summary.correct),
    unlocked: outcome.passed ? unlockedOf(outcome) : null,
    stamps: outcome.stamps ?? [],
    rewards: final.rewards,
    wrongWords: wrongWordsOf(final),
  }
}

/** Trận Boss theo mã cấp (A1…). BOSS_COOLDOWN ném lỗi kèm details.retry_at, weak_topics. */
export async function startBoss({ level = 'A1' } = {}) {
  const road = await getRoadmap()
  const lv = road.levels.find((l) => l.code === level)
  if (!lv) throw { code: 'NOT_FOUND', message: 'Không tìm thấy cấp.', details: null, status: 404 }
  const session = await startBossSession(lv.id)
  return openRun('boss', session, { level, nextLevel: CEFR[CEFR.indexOf(level) + 1] ?? level, bossName: lv.boss.landmark_name, bossHp: 100, levelId: lv.id })
}

const WEAK_COLORS = ['accent', 'danger', 'sky', 'gold']

export async function finishBoss() {
  const { summary, outcome, rewards } = run.final
  const accuracy = Object.fromEntries((outcome.topic_accuracy ?? []).map((a) => [a.topic_id, a]))
  const special = (rewards?.spins ?? []).filter((s) => s.kind === 'special' && s.reason === 'boss').length
  const nextUnlocked = outcome.unlocked.find((e) => e.type === 'level')
  return {
    level: outcome.level.code,
    nextLevel: nextUnlocked?.code ?? CEFR[CEFR.indexOf(outcome.level.code) + 1] ?? outcome.level.code,
    levelId: outcome.level.id,
    score: summary.score,
    correct: summary.correct,
    total: summary.total,
    passPercent: Math.round(outcome.pass_rate * 100),
    passed: outcome.passed,
    reward: special ? { specialSpins: special } : null,
    stamps: outcome.stamps ?? [],
    rewards,
    weakStages: (outcome.weak_topics ?? []).map((w, i) => {
      const a = accuracy[w.id]
      return { id: w.id, title: w.title, percent: a ? Math.round((a.correct * 100) / a.total) : 0, color: WEAK_COLORS[i % WEAK_COLORS.length] }
    }),
    retryAt: outcome.retry_at,
    retryInSeconds: outcome.retry_in_seconds,
  }
}


/* ---------- Bộ chuyển cho màn Cửa Ải ---------- */

let check = null // {answers: {question_id: kết quả}, last}

function toCheckQuestion(q) {
  if (q.type === 'type_word') return { id: q.id, type: 'type', prompt: q.prompt, pos: q.pos, letterCount: q.letter_count }
  return { id: q.id, type: 'choice', sentence: q.sentence, options: q.options }
}

function toFeedback(r) {
  return {
    correct: r.correct,
    correctAnswer: r.correct_answer, // Cửa Ải chỉ có Mức 3–4: đáp án là từ
    word: r.entry?.headword,
    ipa: r.entry?.ipa,
    meaning: r.entry?.meaning_vi,
    example: r.entry?.example,
    masteredDelta: r.lost_mastered ? -1 : 0,
  }
}

export async function fetchDailyCheck() {
  const [today, stats] = await Promise.all([getDailyCheckToday(), getMeStats()])
  check = { answers: Object.fromEntries(today.answered.map((a) => [a.question_id, a])), last: null }
  return {
    status: today.status,
    streak: stats.streak.current,
    questions: today.questions.map(toCheckQuestion),
    answered: today.questions.filter((q) => check.answers[q.id]).map((q) => toFeedback(check.answers[q.id])),
    result: today.result,
  }
}

export async function submitDailyAnswer(questionId, answer) {
  const res = await submitDailyCheck([{ question_id: questionId, answer }])
  const r = res.results[0]
  check.answers[questionId] = r
  check.last = res
  return toFeedback(r)
}

export async function finishDailyCheck({ streak }) {
  const res = check.last
  const result = res.result
  const stats = await getMeStats()
  const wrong = Object.values(check.answers).filter((a) => !a.correct)
  return {
    correctCount: result.correct,
    total: result.total,
    perfect: result.passed,
    streakBefore: streak,
    streakAfter: result.streak,
    spinReward: (result.rewards?.spins ?? []).filter((s) => s.reason === 'streak').length,
    masteredDelta: -result.mastered_lost,
    wrongWords: wrong.map((a) => ({ word: a.entry?.headword ?? a.correct_answer, meaning: a.entry?.meaning_vi })),
    rankShaky: result.rank?.shaky
      ? { rank: result.rank.current, daysLeft: daysLeft(stats.rank.shaky_seconds_left), wordsToRecover: stats.rank.words_to_recover }
      : null,
    rewards: result.rewards,
  }
}
