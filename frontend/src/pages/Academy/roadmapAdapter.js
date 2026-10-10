/*
 * Chuyển GET /academy/roadmap (server) sang đúng cấu trúc bản đồ mà RoadmapMap và map/layout.js vẽ, để giữ nguyên tranh bản
 * đồ, sương mù, con dấu, Hộ chiếu. Mọi số liệu (trạng thái, điểm, số từ, ngày đóng dấu, Hộ chiếu) lấy từ server.
 *
 * - Bài: completed → done, unlocked → current, locked → locked. Bài tổng hợp chặng: passed → done, available → current.
 * - Địa danh: chặng đã đóng dấu → visited (ngày đóng dấu), chặng đang học → target, còn lại → unexplored.
 * - Boss: won → done, available/cooldown → current, locked → locked.
 * - Hộ chiếu: theo số liệu server (địa danh = chặng + Boss; chỉ đếm cấp đang có).
 * - Cấp chưa có trong DB (B1–C2) hiện ở thanh tab là "đang khóa / sắp ra mắt".
 * - Thanh tiến độ cấp: số từ trong các bài đã qua / tổng số từ của cấp (không phải số từ "đã thuộc").
 * Icon, chữ trên con dấu, quái vật canh giữ, câu "Bạn có biết?" là phần trang trí của frontend (map/decor.js); vùng đất
 * theo `region_theme` (utils/regions.js).
 */

import { House } from '@phosphor-icons/react'
import { LEVEL_CODES, REGION_BY_LEVEL, regionOf } from '../../utils/regions'
import { BOSSES, DEFAULT_BOSS, LANDMARK_FACTS, STAGE_ART, STAMP_STYLE } from './map/decor'

const LEVEL_STATUS = { completed: 'done', unlocked: 'current', locked: 'locked' }

const wordsOf = (level) => level.topics.flatMap((t) => t.units).reduce((n, u) => n + u.word_count, 0)

/** Thanh tab cấp: 6 cấp; cấp có trong DB lấy tên, vùng, trạng thái, số từ từ server; cấp chưa có thì khóa, "sắp ra mắt". */
export function buildLevelTabs(roadmap) {
  const byCode = Object.fromEntries((roadmap?.levels ?? []).map((l) => [l.code, l]))
  return LEVEL_CODES.map((code) => {
    const l = byCode[code]
    if (!l) return { code, name: null, region_theme: REGION_BY_LEVEL[code], status: 'locked', id: undefined, words: null, comingSoon: true }
    return { code, name: l.name, region_theme: l.region_theme ?? REGION_BY_LEVEL[code], status: LEVEL_STATUS[l.status], id: l.id, words: wordsOf(l), comingSoon: false }
  })
}

function stampText(name) {
  return (name ?? '').toUpperCase().split(/\s*[–-]\s*|\s*&\s*/)[0].slice(0, 16)
}

export function buildLevelMap(roadmap, code) {
  const tabs = buildLevelTabs(roadmap)
  const tab = tabs.find((l) => l.code === code) ?? tabs[0]
  const index = tabs.indexOf(tab)
  const next = tabs[index + 1] ?? null
  const region = regionOf(tab.code, tab.region_theme)
  const nextLevel = next ? { code: next.code, region: regionOf(next.code, next.region_theme), status: next.status } : null
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
    level: tab,
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
