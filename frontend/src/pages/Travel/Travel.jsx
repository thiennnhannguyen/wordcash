/*
 * Cảnh chuyển cấp "Bay sang vùng đất mới" và màn "Hành trình bắt đầu từ đây", chạy trên dữ liệu thật.
 *
 * - `?from=A1` (màn thắng Boss dẫn tới): cấp vừa chinh phục và cấp kế tiếp, trang Hộ chiếu của cấp (GET /academy/roadmap),
 *   số từ đã thuộc của cấp (GET /me/profile). Lượt quay đặc biệt chỉ hiện khi màn Boss truyền sang (`location.state`, lấy từ
 *   phần thưởng server trả). Cấp chưa thắng Boss thì báo và quay về bản đồ.
 *   Cấp kế tiếp chưa có nội dung: vẫn diễn cảnh bay nhưng nút cuối ghi "sắp mở" và về bản đồ.
 * - `?variant=start` (người mới xong onboarding): tổng số mục từ hiện có (GET /public/stats) và các vùng đất theo lộ trình.
 * Linh vật là avatar thật của người dùng. Đang tải: màn chờ; lỗi: thông báo + Thử lại.
 * `?hold=a|b|c|d|e`: dừng ở một khung của hoạt cảnh (chỉ ảnh hưởng hiển thị).
 */

import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MapTrifold } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { BootSplash } from '../../components/layout/RouteGuards'
import { EmptyState, ErrorState } from '../../components/ui/DataState'
import useServerData from '../../hooks/useServerData'
import { getRoadmap } from '../../services/academyApi'
import { getMyProfile, getPublicStats } from '../../services/profileApi'
import { useAuthStore } from '../../store/authStore'
import { useMascot } from '../../store/mascotStore'
import { journeyRegions, regionOf } from '../../utils/regions'
import { buildLevelMap } from '../Academy/roadmapAdapter'
import LevelTravel from './LevelTravel'
import StartJourney from './StartJourney'

async function loadStart() {
  const [roadmap, stats] = await Promise.all([getRoadmap(), getPublicStats()])
  return { totalWords: stats.entries_total, regions: journeyRegions(roadmap).map((r) => ({ code: r.code, region: r })) }
}

async function loadLevel(code, specialSpins) {
  const [roadmap, profile] = await Promise.all([getRoadmap(), getMyProfile()])
  const index = roadmap.levels.findIndex((l) => l.code === code)
  const level = roadmap.levels[index]
  if (!level || level.status !== 'completed') return { notWon: true }
  const next = roadmap.levels[index + 1] ?? null
  // Cấp kế tiếp chưa có trong DB: vẫn bay tới vùng đất của nó, nhưng ghi "sắp mở" và quay về bản đồ
  const upcoming = !next && roadmap.upcoming_levels?.[0]
  const map = buildLevelMap(roadmap, code)
  return {
    from: {
      code,
      name: level.name,
      region: regionOf(code, level.region_theme),
      words: profile.levels.find((l) => l.code === code)?.mastered ?? 0,
      landmarks: level.passport.total,
    },
    to: next ? { code: next.code, name: next.name, region: regionOf(next.code, next.region_theme) } : upcoming ? { code: upcoming, name: null, region: regionOf(upcoming), soon: true } : null,
    boss: { name: map.boss.landmark_name, guardian: map.boss.guardian },
    passportMap: map,
    reward: specialSpins ? { specialSpins } : null,
  }
}

export default function Travel() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const variant = params.get('variant')
  const from = params.get('from')
  const mascot = useMascot(useAuthStore((s) => s.user?.avatar_mascot_id))
  const state = useServerData(
    () => (variant === 'start' ? loadStart() : loadLevel(from, location.state?.specialSpins ?? 0)),
    [variant, from],
  )

  if (state.status === 'loading') return <BootSplash />
  if (state.status === 'error') {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <ErrorState title="Chưa tải được hành trình" onRetry={state.reload} />
      </div>
    )
  }
  const data = state.data
  if (variant === 'start') return <StartJourney data={data} mascot={mascot} onStart={() => navigate('/academy?level=A1')} />
  if (data.notWon) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <EmptyState
          mascot={mascot}
          title="Chưa tới lúc cất cánh"
          message={`Thắng Trận Boss ${from ?? ''} để bay sang vùng đất mới.`}
          action={
            <Button icon={MapTrifold} onClick={() => navigate('/academy')}>
              Về bản đồ
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <LevelTravel
      key={params.toString()}
      data={data}
      mascot={mascot}
      hold={params.get('hold')}
      onStart={() => navigate(data.to && !data.to.soon ? `/academy?level=${data.to.code}` : '/academy')}
    />
  )
}
