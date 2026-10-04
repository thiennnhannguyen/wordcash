/*
 * Các widget cột phải của Sảnh: tiến tới rank tiếp theo, lượt quay tiếp theo,
 * linh vật đang dùng (dữ liệu từ data/mascots.js), bảng xếp hạng bạn bè (top 3 theo số từ học trong tuần).
 */

import { useNavigate } from 'react-router-dom'
import { ArrowRight, Gift, UsersThree, WarningCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import ProgressBar from '../../components/ui/ProgressBar'
import ProgressRing from '../../components/ui/ProgressRing'
import RankBadge from '../../components/ui/RankBadge'
import MascotBlob from '../../components/collection/MascotBlob'
import MascotCard from '../../components/collection/MascotCard'
import cx from '../../utils/cx'
import { RANK_BY_KEY, RARITIES } from '../../utils/constants'
import { formatNumber } from '../../utils/format'

function WidgetTitle({ children }) {
  return <h2 className="mb-4 font-heading text-lg font-extrabold leading-tight tracking-tight">{children}</h2>
}

export function NextRankWidget({ nextRank, shaky }) {
  const navigate = useNavigate()
  const remaining = Math.max(0, nextRank.target - nextRank.current)

  return (
    <Card padding="sm" className={cx('lift p-5', shaky && 'border-danger')}>
      <WidgetTitle>Tiến tới rank tiếp theo</WidgetTitle>
      <div className="mb-4 flex items-center justify-between gap-2">
        <RankBadge rank={nextRank.from} size="sm" shaky={!!shaky} />
        <Icon icon={ArrowRight} size={20} color="muted" />
        <RankBadge rank={nextRank.to} size="sm" />
      </div>
      <ProgressBar value={nextRank.current} max={nextRank.target} tone="sky" showValue label="Từ đã thuộc" />
      <p className="mt-2 text-caption font-medium text-muted">
        Còn <span className="font-num text-ink">{formatNumber(remaining)}</span> từ để lên {RANK_BY_KEY[nextRank.to].name}
      </p>

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

export function NextSpinWidget({ nextSpin, spins }) {
  const navigate = useNavigate()

  return (
    <Card padding="sm" className="lift p-5">
      <WidgetTitle>Lượt quay tiếp theo</WidgetTitle>
      <div className="flex items-center gap-4">
        <ProgressRing value={nextSpin.current} max={nextSpin.target} size={104} stroke={14} tone="danger" label="Số từ tới lượt quay kế tiếp">
          <div className="leading-none">
            <div className="font-num text-2xl">{nextSpin.current}</div>
            <div className="font-num text-sm text-muted">/{nextSpin.target} từ</div>
          </div>
        </ProgressRing>
        <p className="min-w-0 flex-1 text-caption text-muted">
          Còn <span className="font-num text-ink">{nextSpin.left ?? Math.max(0, nextSpin.target - nextSpin.current)}</span> từ nữa là có thêm
          lượt. Cứ 50 từ thuộc được 1 lượt quay linh vật.
        </p>
      </div>
      <Button
        variant="danger"
        icon={Gift}
        fullWidth
        className="mt-4"
        disabled={spins === 0}
        onClick={() => navigate('/collection/spin')}
      >
        {spins > 0 ? `Quay ngay (${spins})` : 'Chưa có lượt quay'}
      </Button>
    </Card>
  )
}

export function MascotWidget({ mascot }) {
  const navigate = useNavigate()

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
          <p className="font-heading text-lg font-extrabold leading-tight">{mascot.name}</p>
          <p className="text-caption text-muted">
            {RARITIES[mascot.rarity].name} · Vùng {mascot.region}. Chỉ để trang trí, không ảnh hưởng tới trận đấu.
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/collection')}>
            Đổi
          </Button>
        </div>
      </div>
    </Card>
  )
}

const PODIUM = ['gold', 'rank-bac', 'rank-dong']

export function FriendsWidget({ friends, className }) {
  const navigate = useNavigate()
  const top = friends.slice(0, 3)
  const myIndex = top.findIndex((f) => f.isMe)
  const above = myIndex > 0 ? top[myIndex - 1] : null

  return (
    <Card padding="sm" className={cx('lift flex flex-col p-5', className)}>
      <WidgetTitle>Bảng xếp hạng bạn bè</WidgetTitle>
      {friends.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center">
          <span className="grid size-14 place-items-center rounded-pill border-thick border-line bg-raised">
            <Icon icon={UsersThree} size={28} color="muted" />
          </span>
          <p className="text-caption text-muted">Chưa có bạn bè. Rủ bạn vào để so tài vốn từ.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/profile')}>
            Mời bạn bè
          </Button>
        </div>
      ) : (
        <>
          <p className="-mt-3 mb-3 text-caption text-muted">Số từ học trong tuần này</p>
          <ol className="flex flex-col gap-2.5">
            {top.map((f, i) => (
              <li
                key={f.name}
                className={cx(
                  'flex items-center gap-3 rounded-[16px] border-thick px-2.5 py-2',
                  f.isMe ? 'border-line bg-accent' : 'border-transparent',
                )}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-pill border-2 border-line font-num text-sm"
                  style={{ background: `var(--color-${PODIUM[i]})` }}
                >
                  {i + 1}
                </span>
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-pill border-2 border-line bg-surface">
                  <MascotBlob color={f.mascot.color} shape={f.mascot.shape} traits={f.mascot.traits} size={36} className="translate-y-0.5" />
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{f.name}</span>
                <span className="whitespace-nowrap font-num text-sm">+{formatNumber(f.weekWords)}</span>
              </li>
            ))}
          </ol>
          {above && (
            <p className="mt-3 rounded-[14px] border-2 border-dashed border-line/40 px-3 py-2 text-caption">
              Học thêm <span className="font-num">{formatNumber(above.weekWords - top[myIndex].weekWords + 1)}</span> từ để vượt{' '}
              <b>{above.name}</b> tuần này.
            </p>
          )}
          <div className="mt-auto pt-4">
            <Button variant="secondary" size="sm" fullWidth onClick={() => navigate('/leaderboard?scope=friends')}>
              Xem bảng xếp hạng
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
