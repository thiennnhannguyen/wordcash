/*
 * Dữ liệu cho bản đồ Học Viện: GET /academy/roadmap + GET /me/stats.
 * Trả { map, levels (thanh tab), sidebar (đến hạn ôn, mục tiêu hôm nay, mẹo học), currentCode, loading, error, reload }.
 * Lỗi thì `error` có giá trị (bản đồ hiện thông báo + Thử lại), không bao giờ thay bằng dữ liệu mẫu.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMeStats, getRoadmap } from '../../services/academyApi'
import { buildLevelMap, buildLevelTabs, buildSidebar } from './roadmapAdapter'
import { STUDY_TIP } from './map/decor'

export default function useAcademyMap(levelCode) {
  const [remote, setRemote] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    setError(null)
    return Promise.all([getRoadmap(), getMeStats()])
      .then(([roadmap, stats]) => setRemote({ roadmap, stats }))
      .catch(setError)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return useMemo(() => {
    if (!remote) return { map: null, levels: buildLevelTabs(null), sidebar: null, currentCode: levelCode, loading: !error, error, reload }
    const currentCode = remote.roadmap.current?.level_code ?? remote.roadmap.levels[0]?.code ?? 'A1'
    const code = levelCode ?? currentCode
    return {
      map: buildLevelMap(remote.roadmap, code),
      levels: buildLevelTabs(remote.roadmap),
      sidebar: buildSidebar(remote.stats, STUDY_TIP),
      currentCode: code,
      loading: false,
      error: null,
      reload,
    }
  }, [remote, error, levelCode, reload])
}
