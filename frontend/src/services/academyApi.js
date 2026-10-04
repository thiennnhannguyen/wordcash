/*
 * Gọi API Học Viện, Cửa Ải Hôm Nay, Ôn tập, /me/stats (docs/academy.md).
 *
 * - Hàm gọi thẳng API (`getRoadmap`, `startLearn`, `submitAnswers`, `getMeStats`…) trả JSON của server (snake_case);
 *   câu hỏi được đổi `letter_count` → `letterCount` cho khớp components/academy/QuestionView.
 * - "Bộ chuyển" cho các màn đã thiết kế trên dữ liệu mẫu (UnitTest, BossBattle qua useTestRun; DailyCheck): trả đúng cấu trúc
 *   các file mock cũ (testMock.js, dailyCheckMock.js) để giữ nguyên giao diện. VITE_USE_MOCK=true thì dùng lại chính các
 *   file mock đó (không cần backend).
 * - Server là trọng tài: câu hỏi không có đáp án; đúng/sai, điểm, mở khóa, con dấu, lượt quay, rank đều lấy từ phản hồi.
 */

import { request } from './api'
import * as testMock from '../pages/Academy/testMock'
import * as dailyMock from '../pages/DailyCheck/dailyCheckMock'
import { speak } from '../utils/speech'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

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
export function toWordEntry(e) {
  if (!e) return null
  return { id: e.id, word: e.headword, ipa: e.ipa, pos: e.pos, meaning: e.meaning_vi, example: e.example, collocations: e.collocations ?? [], family: e.word_family ?? [], audio_url: e.audio_url }
}

function playQuestion(question, { slow = false } = {}) {
  if (question?.audio_url) {
    const audio = new Audio(question.audio_url)
    audio.playbackRate = slow ? 0.75 : 1
    audio.play().catch(() => {})
  } else if (question?.word) speak(question.word, { rate: slow ? 0.55 : 0.9 })
}

/* ---------- Bộ chuyển cho màn Kiểm tra / Trận Boss (cùng dạng testMock.js) ---------- */

let run = null // phiên đang làm: {id, kind, total, correct, questions, final}

function openRun(kind, session, extra) {
  run = { id: session.id, kind, total: session.total, correct: 0, questions: session.questions, final: null }
  return { total: session.total, passPercent: Math.round(session.pass_rate * 100), questions: session.questions, answered: 0, correct: 0, ...extra }
}

/** Kiểm tra cuối bài (`unitId`) hoặc bài tổng hợp chặng (`topicId`). */
async function realStartUnitTest({ unitId, topicId } = {}) {
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

async function realSubmitTestAnswer(questionId, answer) {
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

function realPlayTestAudio(questionId, opts) {
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

async function realFinishUnitTest() {
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
async function realStartBoss({ level = 'A1' } = {}) {
  const road = await getRoadmap()
  const lv = road.levels.find((l) => l.code === level)
  if (!lv) throw { code: 'NOT_FOUND', message: 'Không tìm thấy cấp.', details: null, status: 404 }
  const session = await startBossSession(lv.id)
  return openRun('boss', session, { level, nextLevel: CEFR[CEFR.indexOf(level) + 1] ?? level, bossName: lv.boss.landmark_name, bossHp: 100, levelId: lv.id })
}

const WEAK_COLORS = ['accent', 'danger', 'sky', 'gold']

async function realFinishBoss() {
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

export const startUnitTest = USE_MOCK ? testMock.startUnitTest : realStartUnitTest
export const submitTestAnswer = USE_MOCK ? testMock.submitTestAnswer : realSubmitTestAnswer
export const playTestAudio = USE_MOCK ? testMock.playTestAudio : realPlayTestAudio
export const finishUnitTest = USE_MOCK ? testMock.finishUnitTest : realFinishUnitTest
export const startBoss = USE_MOCK ? testMock.startBoss : realStartBoss
export const finishBoss = USE_MOCK ? testMock.finishBoss : realFinishBoss

/* ---------- Bộ chuyển cho màn Cửa Ải (cùng dạng dailyCheckMock.js) ---------- */

let check = null // {answers: {question_id: kết quả}, last}

function toCheckQuestion(q) {
  if (q.type === 'type_word') return { id: q.id, type: 'type', prompt: q.prompt, pos: q.pos, letterCount: q.letter_count }
  return { id: q.id, type: 'choice', sentence: q.sentence, options: q.options }
}

function toFeedback(r) {
  return {
    correct: r.correct,
    correctAnswer: r.correct_answer,
    ipa: r.entry?.ipa,
    meaning: r.entry?.meaning_vi,
    example: r.entry?.example,
    masteredDelta: r.lost_mastered ? -1 : 0,
  }
}

async function realFetchDailyCheck() {
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

async function realSubmitAnswer(questionId, answer) {
  const res = await submitDailyCheck([{ question_id: questionId, answer }])
  const r = res.results[0]
  check.answers[questionId] = r
  check.last = res
  return toFeedback(r)
}

async function realFinishDailyCheck({ streak }) {
  const res = check.last
  const result = res.result
  const stats = await getMeStats()
  const wrong = Object.values(check.answers).filter((a) => !a.correct)
  const deadline = result.rank?.shaky_deadline ? new Date(result.rank.shaky_deadline) : null
  return {
    correctCount: result.correct,
    total: result.total,
    perfect: result.passed,
    streakBefore: streak,
    streakAfter: result.streak,
    spinReward: (result.rewards?.spins ?? []).filter((s) => s.reason === 'streak').length,
    masteredDelta: -result.mastered_lost,
    wrongWords: wrong.map((a) => ({ word: a.correct_answer, meaning: a.entry?.meaning_vi })),
    rankShaky: result.rank?.shaky
      ? { rank: result.rank.current, daysLeft: Math.max(1, Math.ceil((deadline - Date.now()) / 86400000)), wordsToRecover: stats.rank.words_to_recover }
      : null,
    rewards: result.rewards,
  }
}

export const fetchDailyCheck = USE_MOCK ? dailyMock.fetchDailyCheck : realFetchDailyCheck
export const submitDailyAnswer = USE_MOCK ? dailyMock.submitAnswer : realSubmitAnswer
export const finishDailyCheck = USE_MOCK ? dailyMock.finishDailyCheck : realFinishDailyCheck
