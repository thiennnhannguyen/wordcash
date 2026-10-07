/*
 * Các widget cột phải của Sảnh (mọi số liệu từ server, có trạng thái tải / lỗi):
 * - Tiến tới rank tiếp theo, lượt quay tiếp theo (GET /me/stats; "Cứ N từ thuộc được 1 lượt" đọc luật từ GET /public/stats).
 * - Linh vật đang dùng (avatar thật từ danh mục GET /mascots; nút ĐỔI mở bộ chọn linh vật đang sở hữu).
 * - Top tuần này (GET /leaderboard?board=weekly&limit=3): top 3 + hạng của tôi (hệ thống bạn bè chưa có).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Crown, Gift, WarningCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import ProgressBar from '../../components/ui/ProgressBar'
import ProgressRing from '../../components/ui/ProgressRing'
import RankBadge from '../../components/ui/RankBadge'
import MascotBlob from '../../components/collection/MascotBlob'
import MascotCard from '../../components/collection/MascotCard'
import MascotPicker from '../../components/collection/MascotPicker'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/DataState'
import cx from '../../utils/cx'
import { RANK_BY_KEY, RARITIES } from '../../utils/constants'
import { formatNumber } from '../../utils/format'
import { useMascotCatalog, FALLBACK_MASCOT } from '../../store/mascotStore'
import { useRules } from '../../store/rulesStore'
import { useAuthStore } from '../../store/authStore'

function WidgetTitle({ children }) {
  return <h2 className="mb-4 font-heading text-lg font-extrabold leading-tight tracking-tight">{children}</h2>
}

function WidgetState({ state, title, height = 'h-28' }) {
  if (state.status === 'loading') return <Skeleton className={cx('w-full', height)} />
  if (state.status === 'error') return <ErrorState compact title={title} onRetry={state.reload} />
  return null
}

export function NextRankWidget({ core }) {
  const navigate = useNavigate()
  const nextRank = core.data?.nextRank
  const shaky = core.data?.shaky

  return (
    <Card padding="sm" aria-busy={core.status === 'loading'} className={cx('lift p-5', shaky && 'border-danger')}>
      <WidgetTitle>Tiến tới rank tiếp theo</WidgetTitle>
      <WidgetState state={core} title="Chưa tải được rank" />
      {nextRank && !nextRank.to && (
        <div className="flex items-center gap-3">
          <RankBadge rank={nextRank.from} size="sm" shaky={!!shaky} />
          <p className="text-caption font-medium text-muted">Bạn đang ở rank cao nhất.</p>
        </div>
      )}
      {nextRank?.to && (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <RankBadge rank={nextRank.from} size="sm" shaky={!!shaky} />
            <Icon icon={ArrowRight} size={20} color="muted" />
            <RankBadge rank={nextRank.to} size="sm" />
          </div>
          <ProgressBar value={nextRank.current} max={nextRank.target} tone="sky" showValue label="Từ đã thuộc" />
          <p className="mt-2 text-caption font-medium text-muted">
            Còn <span className="font-num text-ink">{formatNumber(nextRank.remaining)}</span> từ để lên {RANK_BY_KEY[nextRank.to].name}
          </p>
        </>
      )}

      {shaky && (
        <div className="mt-4 flex flex-col gap-3 rounded-[16px] border-thick border-line bg-danger/15 p-3.5">
          <div className="flex items-start gap-2.5">
            <Icon icon={WarningCircle} size={22} color="danger-deep" className="mt-0.5 shrink-0" />
            <p className="text-caption font-medium text-ink">
              Rank đang lung lay, còn <b>{shaky.daysLeft} ngày</b> để gỡ. Ôn {shaky.wordsToReview} từ để giữ rank.
            </p>
          </div>
          <Button variant="danger" size="sm" fullWidth onClick={() => navigate('/academy/review')}>
            Ôn {shaky.wordsToReview} từ ngay
          </Button>
        </div>
      )}
    </Card>
  )
}

export function NextSpinWidget({ core }) {
  const navigate = useNavigate()
  const { rules } = useRules()
  const nextSpin = core.data?.nextSpin
  const spins = core.data?.stats.spins ?? 0

  return (
    <Card padding="sm" aria-busy={core.status === 'loading'} className="lift p-5">
      <WidgetTitle>Lượt quay tiếp theo</WidgetTitle>
      <WidgetState state={core} title="Chưa tải được lượt quay" />
      {nextSpin && (
        <>
          <div className="flex items-center gap-4">
            <ProgressRing value={nextSpin.current} max={nextSpin.target} size={104} stroke={14} tone="danger" label="Số từ tới lượt quay kế tiếp">
              <div className="leading-none">
                <div className="font-num text-2xl">{nextSpin.current}</div>
                <div className="font-num text-sm text-muted">/{nextSpin.target} từ</div>
              </div>
            </ProgressRing>
            <p className="min-w-0 flex-1 text-caption text-muted">
              Còn <span className="font-num text-ink">{nextSpin.left}</span> từ nữa là có thêm lượt.
              {rules && ` Cứ ${rules.spin_every_n_words} từ thuộc được 1 lượt quay linh vật.`}
            </p>
          </div>
          <Button variant="danger" icon={Gift} fullWidth className="mt-4" disabled={spins === 0} onClick={() => navigate('/collection/spin')}>
            {spins > 0 ? `Quay ngay (${spins})` : 'Chưa có lượt quay'}
          </Button>
        </>
      )}
    </Card>
  )
}

export function MascotWidget({ mascot }) {
  const [picking, setPicking] = useState(false)

  return (
    <Card padding="sm" className="lift p-5">
      <WidgetTitle>Linh vật đang dùng</WidgetTitle>
      <div className="flex items-center gap-4">
        <div className="w-32 shrink-0">
          <MascotCard
            rarity={mascot.rarity}
            name={mascot.name}
            number={mascot.number}
            compact
            art={<MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={80} blink />}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {mascot.name ? (
            <>
              <p className="font-heading text-lg font-extrabold leading-tight">{mascot.name}</p>
              <p className="text-caption text-muted">
                {RARITIES[mascot.rarity].name} · {mascot.region === 'special' ? 'Đặc biệt' : `Vùng ${mascot.region}`}. Chỉ để trang trí, không ảnh hưởng tới trận đấu.
              </p>
            </>
          ) : (
            <p className="text-caption text-muted">Chọn một linh vật đang sở hữu làm avatar.</p>
          )}
          <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
            Đổi
          </Button>
        </div>
      </div>
      <MascotPicker open={picking} onClose={() => setPicking(false)} />
    </Card>
  )
}

const PODIUM = ['gold', 'rank-bac', 'rank-dong']

function Row({ rank, name, score, mascot, me = false }) {
  return (
    <li className={cx('flex items-center gap-3 rounded-[16px] border-thick px-2.5 py-2', me ? 'border-line bg-accent' : 'border-transparent')}>
      <span
        className="grid size-8 shrink-0 place-items-center rounded-pill border-2 border-line font-num text-sm"
        style={{ background: rank <= 3 ? `var(--color-${PODIUM[rank - 1]})` : 'var(--color-surface)' }}
      >
        {rank}
      </span>
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-pill border-2 border-line bg-surface">
        <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={36} className="translate-y-0.5" />
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      <span className="whitespace-nowrap font-num text-sm">+{formatNumber(score)}</span>
    </li>
  )
}

export function TopWeekWidget({ state, mascot, className }) {
  const navigate = useNavigate()
  const { byId } = useMascotCatalog()
  const username = useAuthStore((s) => s.user?.username)
  const board = state.data
  const me = board?.my_entry
  const meInTop = board?.entries.some((e) => e.username === username)

  return (
    <Card padding="sm" aria-busy={state.status === 'loading'} className={cx('lift flex flex-col p-5', className)}>
      <WidgetTitle>Top tuần này</WidgetTitle>
      <WidgetState state={state} title="Chưa tải được bảng xếp hạng" height="h-40" />
      {board && board.entries.length === 0 && (
        <EmptyState
          compact
          mascot={mascot}
          title="Tuần này chưa ai lên bảng"
          message="Thuộc từ mới trong tuần để là người đầu tiên."
          action={
            <Button size="sm" onClick={() => navigate('/academy')}>
              Học ngay
            </Button>
          }
        />
      )}
      {board && board.entries.length > 0 && (
        <>
          <p className="-mt-3 mb-3 text-caption text-muted">Số từ mới thuộc trong tuần</p>
          <ol className="flex flex-col gap-2.5">
            {board.entries.map((e) => (
              <Row key={e.username} rank={e.rank} name={e.display_name} score={e.score} me={e.username === username} mascot={byId[e.avatar_mascot_id] ?? FALLBACK_MASCOT} />
            ))}
          </ol>
          {me && !meInTop && (
            <p className="mt-3 rounded-[14px] border-2 border-dashed border-line/40 px-3 py-2 text-caption">
              {me.rank != null ? (
                <>
                  Hạng của bạn: <span className="font-num">#{me.rank}</span> · <span className="font-num">+{formatNumber(me.score)}</span> từ
                </>
              ) : (
                'Bạn chưa có từ mới thuộc trong tuần này.'
              )}
            </p>
          )}
        </>
      )}
      {board && (
        <div className="mt-auto pt-4">
          <Button variant="secondary" size="sm" icon={Crown} fullWidth onClick={() => navigate('/leaderboard')}>
            Xem bảng xếp hạng
          </Button>
        </div>
      )}
    </Card>
  )
}
