/*
 * Thanh trạng thái trên cùng: các "viên" chỉ số bo tròn có viền mực
 * (streak, số từ đã thuộc, rank, lượt quay, avatar linh vật). Mobile: một hàng cuộn ngang.
 * Mọi con số do server trả về; component chỉ hiển thị.
 */

import { BookOpenText, Fire, Gift, ShieldStar } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import MascotBlob from '../collection/MascotBlob'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { formatNumber } from '../../utils/format'

function Pill({ bg, icon, children, className, style, title }) {
  return (
    <div
      title={title}
      className={cx(
        'relative inline-flex h-12 shrink-0 items-center gap-2 rounded-pill border-thick border-line pl-2 pr-4 shadow-hard-sm',
        className,
      )}
      style={{ background: bg, ...style }}
    >
      <span className="grid size-8 place-items-center rounded-pill border-2 border-line bg-surface">
        <Icon icon={icon} size={18} color="ink" />
      </span>
      <span className="whitespace-nowrap font-display text-sm font-bold uppercase tracking-wide text-ink">{children}</span>
    </div>
  )
}

export default function StatusBar({ stats, mascot, className }) {
  const rank = RANK_BY_KEY[stats.rank] ?? RANK_BY_KEY.tan_binh

  return (
    <div className={cx('-mx-4 overflow-x-auto px-4 py-2 md:mx-0 md:overflow-visible md:px-0', className)}>
      <div className="flex items-center gap-2.5 md:flex-wrap md:justify-end md:gap-3">
        <Pill bg="var(--color-gold)" icon={Fire} title="Chuỗi ngày học">
          {stats.streak} ngày
        </Pill>
        <Pill bg="var(--color-accent)" icon={BookOpenText} title="Số từ đã thuộc">
          {formatNumber(stats.masteredWords)} từ đã thuộc
        </Pill>
        <Pill
          bg={rank.key === 'huyen_thoai' ? undefined : rank.color}
          icon={ShieldStar}
          title={stats.rankShaky ? `${rank.name} · đang lung lay` : rank.name}
          className={cx(rank.key === 'huyen_thoai' && 'bg-legend', stats.rankShaky && 'anim-alert border-danger')}
        >
          {rank.name}
        </Pill>
        <Pill bg="var(--color-danger)" icon={Gift} title="Lượt quay còn lại">
          {stats.spins} lượt quay
          {stats.spins > 0 && (
            <span
              aria-label="Có lượt quay mới"
              className="absolute -right-1 -top-1 size-4 rounded-pill border-2 border-surface bg-danger-deep"
            />
          )}
        </Pill>
        <span
          className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-pill border-thick border-line shadow-hard-sm"
          style={{ background: `var(--color-${mascot.bg})` }}
          title={`Linh vật: ${mascot.name}`}
        >
          <MascotBlob color={mascot.color} shape={mascot.shape} size={44} className="translate-y-1" />
        </span>
      </div>
    </div>
  )
}
