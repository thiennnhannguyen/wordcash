/*
 * Chuyển GET /academy/roadmap (server) sang đúng cấu trúc bản đồ mà RoadmapMap và map/layout.js đang vẽ
 * (cùng dạng getLevelMap trong roadmapMock.js), để giữ nguyên tranh bản đồ, sương mù, con dấu, Hộ chiếu.
 *
 * - Bài: completed → done, unlocked → current, locked → locked. Bài tổng hợp chặng: passed → done, available → current.
 * - Địa danh: chặng đã đóng dấu → visited (ngày đóng dấu), chặng đang học → target, còn lại → unexplored.
 * - Boss: won → done, available/cooldown → current, locked → locked.
 * - Hộ chiếu: theo số liệu server (địa danh = chặng + Boss; chỉ đếm cấp đang có).
 * - Cấp chưa có trong DB (B1–C2) hiện ở thanh tab là "đang khóa / sắp ra mắt".
 * Icon, chữ trên con dấu, quái vật canh giữ, câu "Bạn có biết?" là phần trang trí của frontend (roadmapMock.js).
 */

import { House } from '@phosphor-icons/react'
import { LEVELS, REGIONS } from '../../data/roadmap'
import { BOSSES, DEFAULT_BOSS, LANDMARK_FACTS, STAGE_ART, STAMP_STYLE } from './roadmapMock'

const LEVEL_STATUS = { completed: 'done', unlocked: 'current', locked: 'locked' }

/** Thanh tab cấp: 6 cấp, trạng thái lấy từ server (cấp chưa có dữ liệu thì khóa). */
export function buildLevelTabs(roadmap) {
  const byCode = Object.fromEntries((roadmap?.levels ?? []).map((l) => [l.code, l]))
  return LEVELS.map((l) => ({ ...l, status: byCode[l.code] ? LEVEL_STATUS[byCode[l.code].status] : 'locked', id: byCode[l.code]?.id, comingSoon: !byCode[l.code] }))
}

function stampText(name) {
  return (name ?? '').toUpperCase().split(/\s*[–-]\s*|\s*&\s*/)[0].slice(0, 16)
}

export function buildLevelMap(roadmap, code) {
  const tabs = buildLevelTabs(roadmap)
  const tab = tabs.find((l) => l.code === code) ?? tabs[0]
  const index = tabs.indexOf(tab)
  const next = tabs[index + 1] ?? null
  const region = REGIONS[tab.region_theme]
  const nextLevel = next ? { code: next.code, region: REGIONS[next.region_theme], status: next.status } : null
  const data = roadmap?.levels.find((l) => l.code === tab.code)
  if (!data || data.status === 'locked') return { level: tab, region, nextLevel, locked: true, comingSoon: !data }

  const current = roadmap.current
  const stages = data.topics.map((t, s) => {
    const art = STAGE_ART[t.landmark_key] ?? { icon: House, stamp: stampText(t.landmark_name) }
    const lessons = t.units.map((u) => ({
      id: u.id,
      number: u.position,
      title: u.title,
      words: u.word_count,
      phrases: null,
      status: u.status === 'completed' ? 'done' : u.status === 'unlocked' ? 'current' : 'locked',
      best: u.best_score,
    }))
    const visitStatus = t.stamped_at ? 'visited' : current?.topic_id === t.id ? 'target' : 'unexplored'
    return {
      id: t.id,
      topicId: t.id,
      number: t.order,
      title: t.title,
      icon: art.icon,
      stamp: art.stamp,
      landmark_key: t.landmark_key,
      landmark_name: t.landmark_name,
      landmark_image: t.landmark_image,
      lessons,
      checkpoint: { status: { passed: 'done', available: 'current', locked: 'locked' }[t.test.status], best: t.test.best },
      visit: t.stamped_at ? { status: 'visited', visited_at: t.stamped_at.slice(0, 10) } : { status: visitStatus },
      stampStyle: STAMP_STYLE[s % STAMP_STYLE.length],
    }
  })
  const bossDef = BOSSES[data.code] ?? DEFAULT_BOSS
  const boss = data.boss
  const doneUnits = data.topics.flatMap((t) => t.units).filter((u) => u.status === 'completed')
  const allUnits = data.topics.flatMap((t) => t.units)
  const target = stages.find((s) => s.visit.status === 'target')

  return {
    level: { ...tab, words: allUnits.reduce((n, u) => n + u.word_count, 0) },
    levelId: data.id,
    region,
    nextLevel,
    summary: {
      mastered: doneUnits.reduce((n, u) => n + u.word_count, 0),
      total: allUnits.reduce((n, u) => n + u.word_count, 0),
      stageCurrent: data.status === 'completed' ? stages.length : (stages.findIndex((s) => s.visit.status !== 'visited') + 1 || stages.length),
      stageTotal: stages.length,
    },
    stages,
    boss: {
      ...bossDef,
      landmark_key: boss.landmark_key ?? bossDef.landmark_key,
      landmark_name: boss.landmark_name ?? bossDef.landmark_name,
      landmark_image: null,
      status: boss.status === 'won' ? 'done' : boss.status === 'locked' ? 'locked' : 'current',
      cooldown: boss.status === 'cooldown' ? boss.can_retry : null,
      questions: boss.questions,
      best: boss.best,
      visited_at: boss.won_at ? boss.won_at.slice(0, 10) : null,
      stampStyle: STAMP_STYLE[stages.length % STAMP_STYLE.length],
    },
    passport: {
      visited: data.passport.visited,
      total: data.passport.total,
      journeyVisited: roadmap.passport.visited,
      journeyTotal: roadmap.passport.total,
    },
    fact: LANDMARK_FACTS[target?.landmark_key] ?? null,
  }
}

/** Cột widget bên phải bản đồ: số từ đến hạn ôn, mục tiêu từ mới hôm nay (GET /me/stats). */
export function buildSidebar(stats, tip) {
  return {
    dueReviews: stats.today.due_now,
    dailyGoal: { learned: stats.today.new_words, target: stats.today.new_words_goal },
    tip,
  }
}
