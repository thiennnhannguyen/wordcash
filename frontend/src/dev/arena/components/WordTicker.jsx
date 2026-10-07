/*
 * Từ vựng chạy phía trên màn đấu.
 *
 * Băng chạy ngang như banner điện tử: các từ đã qua (tô theo phe thắng lượt), từ hiện tại trượt vào giữa rồi dừng,
 * các từ sắp tới bị che (chỉ hiện ô vuông theo độ dài, không lộ chữ). Câu nghe và câu điền không hiện từ hiện tại
 * vì đó chính là đáp án. Dữ liệu `items` do server gửi kèm `round_start`.
 */

import { motion } from 'framer-motion'
import { Headphones, PencilSimpleLine } from '@phosphor-icons/react'
import Icon from '../../../components/ui/Icon'
import cx from '../../../utils/cx'

const CHIP_W = 132
const GAP = 8

function Chip({ item }) {
  if (item.state === 'upcoming') {
    return (
      <span className="flex items-center justify-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: Math.min(item.length, 8) }, (_, i) => (
          <span key={i} className="h-3 w-2 rounded-[2px] bg-white/25" />
        ))}
      </span>
    )
  }
  if (item.state === 'done') {
    const tone = item.winner === 'me' ? 'text-accent' : item.winner === 'opp' ? 'text-orange' : 'text-white/50'
    return <span className={cx('truncate text-sm', tone)}>{item.word}</span>
  }
  // Từ hiện tại
  if (item.word) return <span className="truncate text-base text-ink">{item.word}</span>
  return (
    <span className="flex items-center gap-1.5 text-sm text-ink">
      <Icon icon={item.type === 2 ? Headphones : PencilSimpleLine} size={16} />
      {item.type === 2 ? 'Nghe' : 'Điền từ'}
    </span>
  )
}

export default function WordTicker({ items, className }) {
  const current = Math.max(0, items.findIndex((it) => it.state === 'current'))

  return (
    <div
      className={cx('relative h-11 overflow-hidden rounded-pill border-thick border-line bg-ink shadow-hard-sm', className)}
      aria-label={`Từ thứ ${current + 1} trên ${items.length}`}
      role="img"
      style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--color-white) 10%, transparent) 1px, transparent 1.5px)', backgroundSize: '6px 6px' }}
    >
      <motion.div
        className="absolute left-1/2 top-1/2 flex -translate-y-1/2 items-center"
        style={{ gap: GAP }}
        initial={false}
        animate={{ x: -(current * (CHIP_W + GAP) + CHIP_W / 2) }}
        transition={{ type: 'spring', stiffness: 170, damping: 22 }}
      >
        {items.map((item) => (
          <span
            key={item.round}
            className={cx(
              'flex h-8 shrink-0 items-center justify-center rounded-pill px-3 font-display font-bold uppercase tracking-wider',
              item.state === 'current' ? 'border-2 border-line bg-gold' : 'bg-white/5',
            )}
            style={{ width: CHIP_W }}
          >
            <Chip item={item} />
          </span>
        ))}
      </motion.div>
      {/* Hai mép tối dần để tạo cảm giác banner */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-[linear-gradient(90deg,var(--color-ink),transparent)]" aria-hidden="true" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-[linear-gradient(270deg,var(--color-ink),transparent)]" aria-hidden="true" />
    </div>
  )
}
