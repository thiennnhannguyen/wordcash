/*
 * Huy hiệu rank theo màu.
 *
 * `shaky` bật trạng thái "lung lay" khi người dùng đang ở vùng đệm 3 ngày trước khi tụt rank.
 */

import { ShieldStar } from '@phosphor-icons/react'
import Icon from './Icon'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'

const SIZES = {
  sm: { box: 'size-10 rounded-[12px]', icon: 22, text: 'text-sm' },
  md: { box: 'size-13 rounded-[16px]', icon: 30, text: 'text-base' },
  lg: { box: 'size-18 rounded-[20px]', icon: 42, text: 'text-lg' },
}

export default function RankBadge({ rank = 'tan_binh', size = 'md', showName = true, shaky = false, className }) {
  const info = RANK_BY_KEY[rank] ?? RANK_BY_KEY.tan_binh
  const s = SIZES[size]
  const isLegend = rank === 'huyen_thoai'

  return (
    <div className={cx('inline-flex items-center gap-3', className)}>
      <div
        className={cx(
          'grid shrink-0 place-items-center border-thick border-line shadow-hard-sm',
          s.box,
          isLegend && 'bg-legend',
          shaky && 'anim-wobble',
        )}
        style={isLegend ? undefined : { background: info.color }}
        title={shaky ? `${info.name} (đang lung lay)` : info.name}
      >
        <Icon icon={ShieldStar} size={s.icon} color="ink" />
      </div>
      {showName && (
        <div className="leading-tight">
          <div className={cx('font-display font-bold uppercase tracking-wider text-ink', s.text)}>{info.name}</div>
          {shaky && <div className="text-caption font-semibold text-danger-deep">Lung lay</div>}
        </div>
      )}
    </div>
  )
}
