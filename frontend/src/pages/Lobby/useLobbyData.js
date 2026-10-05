/*
 * Dữ liệu Sảnh: số liệu thật từ GET /me/stats (streak + lịch tuần, số từ đã thuộc, rank + lung lay, lượt quay + tiến độ x/50,
 * mục tiêu hôm nay, Cửa Ải hôm nay, bài đang học, Hành trình + Hộ chiếu) ghép lên khung data/mockLobby.js.
 *
 * Linh vật đang dùng: avatar_mascot_id của user (authStore) tra trong danh mục GET /mascots (store/mascotStore.js).
 * CÒN MOCK (TODO, chưa có API): Đấu Trường (thắng/thua tuần, số người online), Từ của ngày, bảng bạn bè, mục tiêu Đấu Trường.
 * Chế độ mock (VITE_USE_MOCK=true) hoặc `?variant=` khi dev: dùng nguyên getLobbyMock.
 */

import { useEffect, useState } from 'react'
import { journeyRegions } from '../../data/roadmap'
import { getLobbyMock } from '../../data/mockLobby'
import { USE_MOCK, daysLeft, getMeStats, getUnit } from '../../services/academyApi'
import { useMascot } from '../../store/mascotStore'

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const ALIVE = new Set(['passed', 'partial', 'exempt'])

function academyCard(position, unit, dueReviews) {
  if (!position) return { isNew: false, level: 'A1', topic: '', lessonNumber: 1, lessonTitle: '', lessonsInStage: 1, stage: 1, stagesTotal: 1, learned: 0, total: 1, dueReviews, landmark: null, to: '/academy' }
  const landmark = position.landmark_key ? { key: position.landmark_key, name: position.landmark_name, label: 'Đang tới' } : null
  const base = { isNew: false, level: position.level_code, dueReviews, landmark, stage: position.topic_order ?? position.stages_total, stagesTotal: position.stages_total }
  if (position.step === 'unit') {
    const learned = unit ? unit.words.filter((w) => w.status !== 'new').length : 0
    return {
      ...base, topic: position.topic_title, lessonNumber: position.unit_position, lessonTitle: position.unit_title,
      lessonsInStage: position.units_total, learned, total: unit?.words.length ?? 1, to: `/academy/lesson?unit=${position.unit_id}`,
    }
  }
  if (position.step === 'topic_test') {
    return { ...base, topic: position.topic_title, lessonNumber: position.units_total, lessonTitle: 'Bài tổng hợp chặng', lessonsInStage: position.units_total, learned: 1, total: 1, to: `/academy/unit-test?topic=${position.topic_id}` }
  }
  return { ...base, topic: 'Trận Boss', lessonNumber: base.stagesTotal, lessonTitle: position.landmark_name ?? 'Trận Boss', lessonsInStage: base.stagesTotal, learned: 1, total: 1, to: `/academy/boss?level=${position.level_code}`, stage: base.stagesTotal }
}

export function buildLobby(stats, unit, user) {
  const base = getLobbyMock('default', user)
  const r = stats.rank
  const today = stats.today
  const week = stats.streak.week.map((d, i) => ({
    label: WEEK_LABELS[i],
    state: d.today ? 'today' : d.status === 'future' ? 'future' : ALIVE.has(d.status) ? 'done' : 'empty',
    studied: ALIVE.has(d.status),
  }))
  return {
    ...base,
    stats: { streak: stats.streak.current, masteredWords: stats.mastered_count, rank: r.current, rankShaky: r.shaky, spins: stats.spins.normal + stats.spins.special },
    dailyCheck: ['passed', 'partial'].includes(today.daily_check)
      ? { correct: today.daily_check_correct, total: today.daily_check_total, streakGained: today.daily_check === 'passed' }
      : null,
    week,
    academy: academyCard(stats.position, unit, today.due_now),
    goals: [
      { key: 'new', label: `Học ${today.new_words_goal} từ mới`, current: Math.min(today.new_words, today.new_words_goal), target: today.new_words_goal },
      { key: 'review', label: today.reviews_total ? `Ôn ${today.reviews_total} từ đến hạn` : 'Không có từ đến hạn ôn', current: today.reviews_done, target: Math.max(today.reviews_total, 1) },
      base.goals.find((g) => g.key === 'arena'), // TODO: chưa có API Đấu Trường
    ],
    nextRank: { from: r.current, to: r.next ?? r.current, current: stats.mastered_count, target: r.next_min ?? stats.mastered_count },
    nextSpin: { current: stats.spins.progress.current, target: stats.spins.progress.target, left: stats.spins.progress.remaining },
    shaky: r.shaky ? { daysLeft: daysLeft(r.shaky_seconds_left), wordsToReview: r.words_to_recover, threshold: r.current_min } : null,
    journey: { regions: journeyRegions({ level: stats.position?.level_code ?? 'A1' }), passport: stats.passport },
  }
}

export default function useLobbyData(variant, user) {
  const mock = USE_MOCK || (import.meta.env.DEV && variant)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (mock) return undefined
    let alive = true
    getMeStats()
      .then(async (stats) => {
        const unit = stats.position?.step === 'unit' ? await getUnit(stats.position.unit_id).catch(() => null) : null
        if (alive) setData(buildLobby(stats, unit, user))
      })
      .catch(() => alive && setData(getLobbyMock('default', user)))
    return () => {
      alive = false
    }
  }, [mock, user])

  const mascot = useMascot(user?.avatar_mascot_id)
  if (mock) return getLobbyMock(variant ?? 'default', user)
  return data && { ...data, mascot }
}
