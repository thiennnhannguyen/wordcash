/*
 * Bục vinh quang top 3 kiểu sân khấu: hạng 1 ở giữa và cao nhất, hạng 2 bên trái, hạng 3 bên phải.
 * Trên mỗi bục: linh vật đại diện, tên, huy hiệu rank và số liệu. Bục màu vàng / bạc / đồng với số khổng lồ ở mặt trước.
 * Hạng 1 có vương miện và tia sáng xoay phía sau. Mobile thu nhỏ nhưng vẫn giữ chiều cao so le. Ít hơn 3 người thì chỉ có
 * từng ấy bục.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Crown } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import RankEmblem from '../../components/ui/RankEmblem'
import MascotBlob from '../../components/collection/MascotBlob'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'

const STROKE = '[-webkit-text-stroke:var(--stroke)_var(--color-ink)] [paint-order:stroke_fill]'

const STEPS = {
  1: { color: 'var(--color-gold)', height: 'h-32 md:h-52', order: 'order-2', mascot: 'size-20 md:size-32', num: 'text-[64px] md:text-[120px]' },
  2: { color: 'var(--color-rank-bac)', height: 'h-24 md:h-40', order: 'order-1', mascot: 'size-16 md:size-24', num: 'text-[52px] md:text-[96px]' },
  3: { color: 'var(--color-rank-dong)', height: 'h-16 md:h-28', order: 'order-3', mascot: 'size-16 md:size-24', num: 'text-[44px] md:text-[80px]' },
}

function Rays() {
  const reduceMotion = useReducedMotion()
  return (
    <motion.svg
      viewBox="-100 -100 200 200"
      className="pointer-events-none absolute left-1/2 top-[38%] -z-10 size-[300px] -translate-x-1/2 -translate-y-1/2 md:size-[440px]"
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d="M0 0 L-9 -100 L9 -100 Z" transform={`rotate(${i * (360 / 14)})`} fill="var(--color-gold)" opacity="0.35" />
      ))}
    </motion.svg>
  )
}

function Step({ row, slot, unit }) {
  const s = STEPS[slot]
  const first = slot === 1
  return (
    <li className={cx('relative flex min-w-0 flex-1 flex-col items-center', s.order)}>
      {first && <Rays />}
      <div className="relative flex flex-col items-center">
        {first && (
          <motion.span className="absolute -top-7 z-10 md:-top-10" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, type: 'spring' }}>
            <Icon icon={Crown} size={44} color="gold" className="drop-shadow-[2px_2px_0_var(--color-ink)] md:size-14" />
          </motion.span>
        )}
        <MascotBlob color={row.mascot.color} shape={row.mascot.shape} traits={row.mascot.traits} size={128} className={s.mascot} />
      </div>
      <div className="mt-1 flex w-full flex-col items-center gap-1 px-1 text-center">
        <span className="flex max-w-full items-center gap-1.5">
          <RankEmblem rank={row.rank} className="size-5 shrink-0 md:size-7" />
          <span className={cx('truncate font-heading text-[15px] font-extrabold md:text-xl', row.isMe ? 'text-accent' : 'text-white')}>{row.isMe ? 'Bạn' : row.name}</span>
        </span>
        <span className="max-w-full truncate rounded-pill border-2 border-line bg-surface px-2 font-display text-[13px] font-bold uppercase leading-6 md:px-3 md:text-sm">
          <span className="md:hidden">
            {unit.plus ? '+' : ''}
            {formatNumber(row.value)} {unit.short}
          </span>
          <span className="max-md:hidden">{unit.label(formatNumber(row.value))}</span>
        </span>
      </div>
      {/* Bục */}
      <motion.div
        className={cx('relative mt-3 grid w-full place-items-center overflow-hidden rounded-t-[18px] border-thick border-b-0 border-line shadow-hard', s.height)}
        style={{ background: s.color }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: (3 - slot) * 0.12, ease: 'easeOut' }}
      >
        <span className="absolute inset-x-0 top-0 h-3 border-b-thick border-line bg-white/40 md:h-4" aria-hidden="true" />
        <span className={cx('font-display font-bold italic leading-none text-white', STROKE, s.num)} style={{ '--stroke': '7px', textShadow: '5px 5px 0 var(--color-ink)' }}>
          {row.place}
        </span>
      </motion.div>
    </li>
  )
}

export default function Podium({ rows, unit }) {
  const top = rows.slice(0, 3)
  return (
    <section aria-label="Top 3" className="relative isolate overflow-hidden rounded-panel border-thick border-line bg-primary px-3 pt-12 shadow-hard-lg md:px-10 md:pt-16">
      <ol className="relative mx-auto flex max-w-3xl items-end gap-2 md:gap-6">
        {/* Vị trí bục theo thứ tự trong danh sách; số trên bục là hạng thật (bằng điểm thì cùng hạng) */}
        {top.map((r, i) => (
          <Step key={r.id} row={r} slot={i + 1} unit={unit} />
        ))}
      </ol>
      {/* Sàn sân khấu */}
      <div className="-mx-3 h-4 border-t-thick border-line bg-ink md:-mx-10 md:h-5" aria-hidden="true" />
    </section>
  )
}
