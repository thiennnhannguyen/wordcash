/*
 * HUD màn đấu: thanh máu hai phe, đồng hồ combo, khiên số câu và đồng hồ đếm ngược.
 *
 * Thanh máu dày 28px viền đen, cạn từ phía giữa màn ra mép ngoài (người chơi neo trái, đối thủ neo phải).
 * Máu tụt ngay lập tức; phần "máu trễ" màu trắng rút dần sau 400ms như game fighting. Dưới 30 HP nhấp nháy hồng.
 * Mọi con số (máu, combo, số câu, mốc hết giờ) do server gửi.
 */

import { useEffect } from 'react'
import { useAnimate } from 'framer-motion'
import MascotBlob from '../../../components/collection/MascotBlob'
import ComboMeter from '../components/ComboMeter'
import CountdownTimer from '../components/CountdownTimer'
import RankBadge from '../../../components/ui/RankBadge'
import cx from '../../../utils/cx'
import { ARENA } from '../../../utils/constants'

function HpBar({ hp, color, anchor, height = 'h-7' }) {
  const percent = Math.max(0, Math.min(100, (hp / ARENA.MAX_HP) * 100))
  const low = hp > 0 && hp < ARENA.LOW_HP
  const side = anchor === 'left' ? 'left-0' : 'right-0'

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={ARENA.MAX_HP}
      aria-valuenow={hp}
      className={cx('relative w-full overflow-hidden rounded-[10px] border-thick border-line bg-ink shadow-hard-sm', height)}
    >
      {/* Máu trễ: rút sau 400ms */}
      <span className={cx('absolute inset-y-0 bg-white transition-[width] delay-[400ms] duration-[350ms] ease-out', side)} style={{ width: `${percent}%` }} />
      {/* Máu thật: tụt ngay */}
      <span
        className={cx('absolute inset-y-0', side, low && 'anim-lowhp', percent > 0 && percent < 100 && (anchor === 'left' ? 'border-r-thick border-line' : 'border-l-thick border-line'))}
        style={{ width: `${percent}%`, '--fill': `var(--color-${color})`, background: 'var(--fill)' }}
      />
      {/* Vệt bóng và vạch chia mỗi 10 HP */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-white/25" />
      <span
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 calc(10% - 2px), color-mix(in srgb, var(--color-ink) 30%, transparent) calc(10% - 2px) 10%)' }}
      />
    </div>
  )
}

export function HpPanel({ side, fighter, hp, combo, shatter, hitKey, compact = false }) {
  const isMe = side === 'me'
  const color = isMe ? 'primary' : 'orange'
  const mirrored = !isMe && !compact
  const [scope, animate] = useAnimate()

  // Bảng máu giật nhẹ khi trúng đòn
  useEffect(() => {
    if (hitKey && scope.current) animate(scope.current, { x: [0, -6, 6, -3, 0] }, { duration: 0.25 })
  }, [hitKey, animate, scope])

  return (
    <div
      ref={scope}
      className={cx('flex w-full flex-col', compact ? 'gap-0' : 'gap-2', mirrored && 'items-end')}
      aria-label={`${isMe ? 'Bạn' : 'Đối thủ'} ${fighter.name}: ${hp} trên ${ARENA.MAX_HP} máu`}
    >
      <div className={cx('flex w-full items-center gap-3', mirrored && 'flex-row-reverse')}>
        <span
          className={cx('grid shrink-0 place-items-center overflow-hidden rounded-[14px] border-thick border-line shadow-hard-sm', compact ? 'size-11' : 'size-16')}
          style={{ background: `var(--color-${color})` }}
        >
          <MascotBlob color={fighter.mascot.color} shape={fighter.mascot.shape} size={80} shadow={false} className={cx('translate-y-2', compact ? 'size-12' : 'size-[72px]', !isMe && '-scale-x-100')} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className={cx('flex items-center gap-2', mirrored && 'flex-row-reverse')}>
            <span
              className={cx(
                'truncate font-display font-bold uppercase italic leading-none text-white [-webkit-text-stroke:1.5px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:2px_2px_0_var(--color-ink)]',
                compact ? 'text-lg' : 'text-2xl',
              )}
            >
              {fighter.name}
            </span>
            <RankBadge rank={fighter.rank} size="sm" showName={false} className="[&>div]:size-6 [&>div]:rounded-[7px] [&>div]:border-2 [&>div]:shadow-none [&_svg]:size-3.5" />
            {compact && <ComboMeter value={combo} shatterKey={shatter?.key} shatterCount={shatter?.count} compact showLabel={false} />}
            <span className={cx('font-num leading-none text-ink', compact ? 'text-base' : 'text-xl', mirrored ? 'mr-auto' : 'ml-auto')}>
              {hp}
              <span className="text-ink/60">/{ARENA.MAX_HP}</span>
            </span>
          </div>
          <HpBar hp={hp} color={color} anchor={isMe || compact ? 'left' : 'right'} height={compact ? 'h-5' : 'h-7'} />
        </div>
      </div>
      {!compact && (
        <div className={cx(mirrored ? 'pr-[76px]' : 'pl-[76px]')}>
          <ComboMeter value={combo} shatterKey={shatter?.key} shatterCount={shatter?.count} mirrored={mirrored} />
        </div>
      )}
    </div>
  )
}

/** Khiên số câu + đồng hồ đếm ngược. `row` xếp ngang (mobile, nằm trên đường giữa hai phe). */
export function RoundCenter({ round, total, endsAt, running, frozenSeconds, row = false }) {
  return (
    <div className={cx('flex items-center', row ? 'gap-3' : 'flex-col gap-2')}>
      <div className={cx('relative grid place-items-center', row ? 'h-14 w-[70px]' : 'h-[92px] w-[108px]')}>
        <svg viewBox="0 0 108 92" className="absolute inset-0 size-full" aria-hidden="true">
          <path d="M58 8 L102 18 V46 C102 68 82 82 58 90 C34 82 14 68 14 46 V18 Z" fill="var(--color-ink)" />
          <path d="M54 4 L98 14 V42 C98 64 78 78 54 86 C30 78 10 64 10 42 V14 Z" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round" />
        </svg>
        <span className="relative -mt-1 flex flex-col items-center leading-none">
          <span className={cx('font-display font-bold uppercase', row ? 'text-[10px]' : 'text-xs')}>Câu</span>
          <span className={cx('font-num', row ? 'text-lg' : 'text-[26px]')}>
            {round}/{total}
          </span>
        </span>
      </div>
      <CountdownTimer endsAt={endsAt} running={running} frozenSeconds={frozenSeconds} size={row ? 48 : 64} />
    </div>
  )
}
