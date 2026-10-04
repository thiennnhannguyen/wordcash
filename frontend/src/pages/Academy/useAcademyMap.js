/*
 * Dữ liệu cho bản đồ Học Viện: thật (GET /academy/roadmap + GET /me/stats) hoặc mock (roadmapMock.js khi VITE_USE_MOCK=true).
 * Trả { map, levels (thanh tab), sidebar (đến hạn ôn, mục tiêu hôm nay), currentCode, loading, error, reload }.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { USE_MOCK, getMeStats, getRoadmap } from '../../services/academyApi'
import { buildLevelMap, buildLevelTabs, buildSidebar } from './roadmapAdapter'
import { LEVELS, SIDEBAR_MOCK, getLevelMap } from './roadmapMock'

export default function useAcademyMap(levelCode, branch, { progress = 0 } = {}) {
  const [remote, setRemote] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    if (USE_MOCK) return Promise.resolve()
    return Promise.all([getRoadmap(), getMeStats()])
      .then(([roadmap, stats]) => setRemote({ roadmap, stats }))
      .catch(setError)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return useMemo(() => {
    if (USE_MOCK) {
      const code = levelCode ?? LEVELS.find((l) => l.status === 'current')?.code ?? 'A1'
      return { map: getLevelMap(code, branch, { progress }), levels: LEVELS, sidebar: SIDEBAR_MOCK, currentCode: code, loading: false, error: null, reload }
    }
    if (!remote) return { map: null, levels: LEVELS, sidebar: null, currentCode: levelCode, loading: !error, error, reload }
    const currentCode = remote.roadmap.current?.level_code ?? remote.roadmap.levels[0]?.code ?? 'A1'
    const code = levelCode ?? currentCode
    return {
      map: buildLevelMap(remote.roadmap, code),
      levels: buildLevelTabs(remote.roadmap),
      sidebar: buildSidebar(remote.stats, SIDEBAR_MOCK.tip),
      currentCode: code,
      loading: false,
      error: null,
      reload,
    }
  }, [remote, error, levelCode, branch, progress, reload])
}
