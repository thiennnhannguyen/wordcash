/*
 * Dữ liệu Sảnh, 100% từ server. Mỗi khối tải riêng và có đủ 3 trạng thái (đang tải / lỗi + Thử lại / trống), không bao giờ
 * thay bằng số giả khi lỗi:
 * - `useLobbyStats()`: GET /me/stats (+ GET /academy/units/:id của bài đang học để đếm từ đã gặp) → thanh trạng thái, chào hỏi,
 *   lịch tuần, card Học Viện, mục tiêu hôm nay, rank kế tiếp, lượt quay kế tiếp.
 * - Hành trình + Hộ chiếu: GET /academy/roadmap (`useServerData(getRoadmap)` ở Lobby.jsx).
 * - Từ của ngày: GET /words/daily; Top tuần này: GET /leaderboard?board=weekly&limit=3; Khóa học: GET /courses.
 * Linh vật đang dùng: avatar_mascot_id của user (authStore) tra trong danh mục GET /mascots (store/mascotStore.js).
 * `buildLobby` là hàm thuần (test ở tests/lobby.test.jsx).
 */

import useServerData from '../../hooks/useServerData'
import { daysLeft, getMeStats, getUnit } from '../../services/academyApi'

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const ALIVE = new Set(['passed', 'partial', 'exempt'])

function academyCard(position, unit, dueReviews) {
  if (!position || position.step === 'done') return { done: Boolean(position), level: position?.level_code ?? null, dueReviews, to: '/academy' }
  const landmark = position.landmark_key ? { key: position.landmark_key, name: position.landmark_name, label: 'Đang tới' } : null
  const base = { level: position.level_code, dueReviews, landmark, stage: position.topic_order ?? position.stages_total, stagesTotal: position.stages_total }
  if (position.step === 'unit') {
    return {
      ...base,
      topic: position.topic_title,
      lessonNumber: position.unit_position,
      lessonTitle: position.unit_title,
      lessonsInStage: position.units_total,
      // Số từ đã gặp / tổng từ của bài: chỉ có khi đọc được chi tiết bài; không có thì ẩn thanh tiến độ (không đoán)
      progress: unit ? { learned: unit.words.filter((w) => w.status !== 'new').length, total: unit.words.length } : null,
      to: `/academy/lesson?unit=${position.unit_id}`,
    }
  }
  if (position.step === 'topic_test') {
    return { ...base, topic: position.topic_title, lessonTitle: 'Bài tổng hợp chặng', lessonsInStage: position.units_total, lessonNumber: null, progress: null, to: `/academy/unit-test?topic=${position.topic_id}` }
  }
  return { ...base, topic: 'Trận Boss', lessonTitle: position.landmark_name ?? 'Trận Boss', lessonNumber: null, stage: base.stagesTotal, progress: null, to: `/academy/boss?level=${position.level_code}` }
}

export function buildLobby(stats, unit) {
  const r = stats.rank
  const today = stats.today
  const week = stats.streak.week.map((d, i) => ({
    label: WEEK_LABELS[i],
    state: d.today ? 'today' : d.status === 'future' ? 'future' : ALIVE.has(d.status) ? 'done' : 'empty',
    studied: ALIVE.has(d.status),
  }))
  const goals = [{ key: 'new', label: `Học ${today.new_words_goal} từ mới`, current: Math.min(today.new_words, today.new_words_goal), target: today.new_words_goal }]
  // Chỉ hiện mục ôn khi thật sự có từ đến hạn hôm nay (không đặt mục tiêu giả)
  if (today.reviews_total > 0) goals.push({ key: 'review', label: `Ôn ${today.reviews_total} từ đến hạn`, current: today.reviews_done, target: today.reviews_total })
  return {
    stats: { streak: stats.streak.current, masteredWords: stats.mastered_count, rank: r.current, rankShaky: r.shaky, spins: stats.spins.normal + stats.spins.special },
    dailyCheck: ['passed', 'partial'].includes(today.daily_check)
      ? { correct: today.daily_check_correct, total: today.daily_check_total, streakGained: today.daily_check === 'passed' }
      : null,
    firstDay: stats.mastered_count === 0 && today.answers === 0 && !week.some((d) => d.studied),
    week,
    academy: academyCard(stats.position, unit, today.due_now),
    goals,
    nextRank: r.next ? { from: r.current, to: r.next, current: stats.mastered_count, target: r.next_min, remaining: r.remaining } : { from: r.current, to: null },
    nextSpin: { current: stats.spins.progress.current, target: stats.spins.progress.target, left: stats.spins.progress.remaining },
    shaky: r.shaky ? { daysLeft: daysLeft(r.shaky_seconds_left), wordsToReview: r.words_to_recover, threshold: r.current_min } : null,
  }
}

async function loadLobby() {
  const stats = await getMeStats()
  const unit = stats.position?.step === 'unit' ? await getUnit(stats.position.unit_id).catch(() => null) : null
  return buildLobby(stats, unit)
}

export default function useLobbyStats() {
  return useServerData(loadLobby, [])
}
