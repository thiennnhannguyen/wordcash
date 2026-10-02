/*
 * Tủ huy hiệu thành tích: lưới huy hiệu tròn viền mực. Đã đạt thì đầy màu kèm ngày đạt;
 * chưa đạt thì xám và có thanh tiến độ nhỏ. Tiến độ do server tính.
 */

import { BookOpenText, Cards, Crown, Door, Fire, Lightning, ShieldCheck, Sword, Medal } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import cx from '../../utils/cx'
import { formatDate, formatNumber } from '../../utils/format'
import { StatCard } from './LearningStats'

const ICONS = { ko: Sword, fire: Fire, lightning: Lightning, book: BookOpenText, crown: Crown, cards: Cards, shield: ShieldCheck, gate: Door }

export default function Achievements({ achievements }) {
  const done = achievements.filter((a) => a.done).length
  return (
    <StatCard
      title="Tủ huy hiệu"
      icon={Medal}
      iconBg="gold"
      aside={
        <span className="font-display text-sm font-bold uppercase text-muted">
          <span className="font-num text-ink">{done}</span>/{achievements.length}
        </span>
      }
    >
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {achievements.map((a) => (
          <li key={a.key} className="flex flex-col items-center gap-2 text-center" title={a.detail}>
            <span
              className={cx('relative grid size-20 place-items-center rounded-pill border-thick border-line md:size-[88px]', a.done ? 'shadow-hard' : 'shadow-none')}
              style={{ background: a.done ? `var(--color-${a.color})` : 'var(--color-neutral)' }}
            >
              {a.done && <span className="absolute inset-[6px] rounded-pill border-2 border-dashed border-white/70" aria-hidden="true" />}
              <Icon icon={ICONS[a.icon]} size={38} color={a.done ? (a.color === 'primary' ? 'white' : 'ink') : 'muted'} />
            </span>
            <span className={cx('font-heading text-[15px] font-extrabold leading-tight', !a.done && 'text-muted')}>{a.title}</span>
            {a.done ? (
              <span className="text-[13px] font-medium text-muted">{formatDate(a.date)}</span>
            ) : (
              <span className="flex w-full max-w-[120px] flex-col items-center gap-1">
                <span className="h-2.5 w-full overflow-hidden rounded-pill border-2 border-line bg-surface">
                  <span className="block h-full bg-primary" style={{ width: `${(a.progress / a.goal) * 100}%` }} />
                </span>
                <span className="font-num text-[13px] text-muted">
                  {formatNumber(a.progress)}/{formatNumber(a.goal)}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </StatCard>
  )
}
