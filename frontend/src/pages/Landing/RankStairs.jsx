/*
 * Thang rank: 8 huy hiệu xếp theo bậc thang đi lên, dưới mỗi huy hiệu là số từ cần thuộc.
 * Mobile: cuộn ngang.
 */

import { ShieldStar } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import cx from '../../utils/cx'
import { RANKS } from '../../utils/constants'
import { formatNumber } from '../../utils/format'

const STEP_BASE = 36
const STEP_RISE = 26

export default function RankStairs() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 pt-2 md:mx-0 md:overflow-visible md:px-0">
      <ol className="flex min-w-[760px] items-end gap-2 md:min-w-0 md:gap-3">
        {RANKS.map((rank, i) => {
          const isLegend = rank.key === 'huyen_thoai'
          return (
            <li key={rank.key} className="flex flex-1 flex-col items-center gap-2">
              {/* Huy hiệu; Huyền Thoại có viền cầu vồng */}
              <div className={cx('rounded-[22px] p-[3px]', isLegend && 'bg-legend')}>
                <div
                  className={cx(
                    'grid size-16 place-items-center rounded-[19px] border-thick border-line shadow-hard-sm md:size-18',
                    isLegend && 'bg-legend',
                  )}
                  style={isLegend ? undefined : { background: rank.color }}
                >
                  <Icon icon={ShieldStar} size={36} color="ink" />
                </div>
              </div>
              <div className="text-center font-display text-sm font-bold uppercase leading-tight tracking-wide">{rank.name}</div>
              {/* Bậc thang */}
              <div
                className="flex w-full flex-col items-center justify-start rounded-t-[16px] border-thick border-b-0 border-line bg-surface pt-2"
                style={{ height: STEP_BASE + i * STEP_RISE }}
              >
                <span className="font-num text-lg leading-none">{formatNumber(rank.min)}</span>
                <span className="text-xs font-medium text-muted">từ</span>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="h-[3px] min-w-[760px] rounded-pill bg-line md:min-w-0" />
    </div>
  )
}
