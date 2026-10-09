/*
 * Màn giới thiệu "VS" trước trận (~2,5 giây), như màn chọn nhân vật của game đối kháng.
 *
 * Màn hình bị chém chéo bởi một đường răng cưa: người chơi (tím) bên trái, đối thủ (cam) bên phải trên desktop;
 * trên mobile đối thủ ở trên, người chơi ở dưới. Mỗi nửa có linh vật lớn trượt vào từ mép, tên chữ to nghiêng,
 * rank và thông số. Chữ "VS" vàng khổng lồ đập xuống, rung nhẹ, tia sét tỏa quanh. Thanh thông tin trận ở dưới.
 *
 * Các khung hình chính: (a) hai nửa trượt vào → (b) VS đập xuống (scale 2 → 1, rung màn hình) →
 * (c) giữ nguyên → (d) vệt trắng chéo quét qua để vào sân đấu, rồi gọi `onDone`.
 * `frame` = "a" | "b" | "c" | "d" dừng hình ở một khung để xem thiết kế (không gọi `onDone`).
 * Linh vật chỉ để trang trí; thông số là lịch sử của người chơi, không ảnh hưởng trận đấu.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MascotBlob from '../../components/collection/MascotBlob'
import RankBadge from '../../components/ui/RankBadge'
import useMediaQuery from '../../hooks/useMediaQuery'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { formatDecimal } from '../../utils/format'

const ORDER = ['enter', 'slam', 'hold', 'wipe']
const FRAME_PHASE = { a: 'enter', b: 'slam', c: 'hold', d: 'wipe' }
const TIMELINE = { slam: 550, hold: 950, wipe: 2300 }

// Đường răng cưa chéo: desktop đi từ trên xuống (x giảm dần), mobile đi từ trái sang phải (y tăng dần)
const STEPS = 14
function edgePoints(desktop) {
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS
    const jag = i === 0 || i === STEPS ? 0 : i % 2 ? 2.4 : -2.4
    return desktop ? [56 - 12 * t + jag, t * 100] : [t * 100, 43 + 14 * t + jag]
  })
}

const toPoly = (pts) => `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(', ')})`

function clips(desktop) {
  const edge = edgePoints(desktop)
  if (desktop) {
    return {
      player: toPoly([[0, 0], ...edge, [0, 100]]),
      opponent: toPoly([[100, 0], [100, 100], ...[...edge].reverse()]),
      edge,
    }
  }
  return {
    opponent: toPoly([[0, 0], [100, 0], ...[...edge].reverse()]),
    player: toPoly([[0, 100], ...edge, [100, 100]]),
    edge,
  }
}

const SPEED_LINES = {
  backgroundImage:
    'repeating-linear-gradient(115deg, transparent 0 46px, color-mix(in srgb, var(--color-white) 14%, transparent) 46px 54px)',
}

function Fighter({ fighter, side, desktop, enterFrom, partial, frozen }) {
  const isPlayer = side === 'player'
  const offset = isPlayer ? -1 : 1
  const mirrored = !desktop && !isPlayer

  return (
    <motion.div
      className={cx('flex items-center gap-4 md:flex-col md:gap-5', mirrored && 'flex-row-reverse')}
      initial={frozen ? false : { x: offset * enterFrom, opacity: 0 }}
      animate={{ x: partial ? offset * enterFrom * 0.45 : 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.2, 0.9, 0.3, 1] }}
    >
      <MascotBlob color={fighter.mascot.color} shape={fighter.mascot.shape} size={280} className={cx('size-32 shrink-0 md:size-[260px]', !isPlayer && '-scale-x-100')} />
      <div className={cx('flex min-w-0 flex-col gap-2 md:items-center', mirrored ? 'items-end text-right' : 'items-start')}>
        <span
          className={cx(
            'max-w-full -skew-x-6 break-words px-2 font-heading text-[40px] font-black uppercase italic leading-none text-white md:text-[76px]',
            '[-webkit-text-stroke:3px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:5px_5px_0_var(--color-ink)]',
          )}
        >
          {fighter.name}
        </span>
        <span className="inline-flex items-center gap-2 rounded-pill border-thick border-line bg-surface py-0.5 pl-0.5 pr-3 shadow-hard-sm">
          <RankBadge rank={fighter.rank} size="sm" showName={false} className="[&>div]:size-8 [&>div]:shadow-none [&_svg]:size-5" />
          <span className="font-display text-sm font-bold uppercase tracking-wider">{RANK_BY_KEY[fighter.rank].name}</span>
        </span>
        <span className="whitespace-nowrap rounded-pill border-thick border-line bg-ink px-3 font-display text-xs font-bold uppercase leading-7 tracking-wide text-white md:text-sm">
          Chính xác {fighter.accuracy}% · Tốc độ {formatDecimal(fighter.avgSeconds)}s
        </span>
      </div>
    </motion.div>
  )
}

function Bolt({ angle, radius, delay }) {
  return (
    <span className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${angle}deg) translateY(-${radius}px)` }}>
      <motion.svg
        viewBox="0 0 24 30"
        className="anim-flicker -ml-4 -mt-5 block h-10 w-8 md:h-14 md:w-11"
        style={{ animationDelay: `${delay}s` }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 12, delay }}
        aria-hidden="true"
      >
        <path d="M14 1 L3 17 H11 L7 29 L21 11 H13 L17 1 Z" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinejoin="round" />
      </motion.svg>
    </span>
  )
}

const BOLT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

export default function VersusIntro({ player, opponent, match, onDone, frame }) {
  const frozen = !!FRAME_PHASE[frame]
  const [phase, setPhase] = useState(frozen ? FRAME_PHASE[frame] : 'enter')
  const desktop = useMediaQuery('(min-width: 768px)')
  const { player: playerClip, opponent: opponentClip, edge } = clips(desktop)

  useEffect(() => {
    if (frozen) return undefined
    const timers = Object.entries(TIMELINE).map(([p, ms]) => setTimeout(() => setPhase(p), ms))
    return () => timers.forEach(clearTimeout)
  }, [frozen])

  const reached = (p) => ORDER.indexOf(phase) >= ORDER.indexOf(p)
  const partial = frame === 'a'
  const axis = desktop ? 'x' : 'y'
  // Nửa của người chơi vào từ trái (desktop) hoặc từ dưới (mobile); đối thủ vào từ phải hoặc từ trên
  const playerFrom = desktop ? '-100%' : '100%'
  const opponentFrom = desktop ? '100%' : '-100%'
  const halfAnimate = (from) => ({ [axis]: partial ? `${parseFloat(from) * 0.35}%` : '0%' })
  const halfTransition = { duration: 0.45, ease: [0.2, 0.9, 0.3, 1] }

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-ink" role="dialog" aria-modal="true" aria-label={`${player.name} đối đầu ${opponent.name}`}>
      <div key={reached('slam') ? 'shake' : 'still'} className={cx('absolute inset-0', phase === 'slam' && !frozen && 'anim-shake')}>
        {/* Nửa người chơi (tím) */}
        <motion.div
          className="absolute inset-0 bg-primary"
          style={{ clipPath: playerClip, ...SPEED_LINES }}
          initial={frozen ? false : { [axis]: playerFrom }}
          animate={halfAnimate(playerFrom)}
          transition={halfTransition}
        >
          <div className={cx('absolute flex', desktop ? 'inset-y-0 left-0 w-[46%] items-center justify-center pr-10' : 'inset-x-0 bottom-0 h-[43%] items-center justify-start px-5 pb-24')}>
            <Fighter fighter={player} side="player" desktop={desktop} enterFrom={desktop ? 320 : 200} partial={partial} frozen={frozen} />
          </div>
        </motion.div>

        {/* Nửa đối thủ (cam) */}
        <motion.div
          className="absolute inset-0 bg-orange"
          style={{ clipPath: opponentClip, ...SPEED_LINES }}
          initial={frozen ? false : { [axis]: opponentFrom }}
          animate={halfAnimate(opponentFrom)}
          transition={halfTransition}
        >
          <div className={cx('absolute flex', desktop ? 'inset-y-0 right-0 w-[46%] items-center justify-center pl-10' : 'inset-x-0 top-0 h-[43%] items-center justify-end px-5 pt-6')}>
            <Fighter fighter={opponent} side="opponent" desktop={desktop} enterFrom={desktop ? 320 : 200} partial={partial} frozen={frozen} />
          </div>
        </motion.div>

        {/* Đường răng cưa: viền mực dày, lõi vàng */}
        {reached('slam') || !partial ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
            <polyline points={edge.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-ink)" strokeWidth="16" vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
            <polyline points={edge.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-gold)" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
          </svg>
        ) : null}

        {/* Chữ VS + tia sét */}
        {reached('slam') && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {BOLT_ANGLES.map((a, i) => (
              <Bolt key={a} angle={a + 22} radius={desktop ? 150 : 96} delay={frozen && phase !== 'slam' ? 0 : 0.05 + i * 0.03} />
            ))}
            <motion.div
              initial={frozen && phase !== 'slam' ? false : { scale: 2, opacity: 0 }}
              animate={{ scale: frame === 'b' ? 1.45 : 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 620, damping: 17 }}
            >
              <span
                className={cx(
                  'block font-display text-[112px] font-bold italic leading-none text-gold md:text-[200px]',
                  '[-webkit-text-stroke:8px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:8px_8px_0_var(--color-ink)]',
                  reached('hold') && 'anim-jitter',
                )}
                style={{ transform: 'rotate(-4deg)' }}
              >
                VS
              </span>
            </motion.div>
          </div>
        )}

        {/* Lóe trắng khi VS đập xuống */}
        <AnimatePresence>
          {phase === 'slam' && (
            <motion.span
              className="pointer-events-none absolute inset-0 bg-white"
              initial={{ opacity: frame === 'b' ? 0.35 : 0.8 }}
              animate={{ opacity: frame === 'b' ? 0.35 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Thanh thông tin trận */}
        {reached('slam') && (
          <motion.div
            className="absolute inset-x-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] flex justify-center md:bottom-8"
            initial={frozen ? false : { y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <span className="rounded-pill border-thick border-line bg-surface px-4 py-2 text-center font-display text-sm font-bold uppercase tracking-wide shadow-hard md:px-6 md:text-base">
              Từ vựng {match.pool} · {match.questions} câu · Sân: {match.arenaName}
            </span>
          </motion.div>
        )}
      </div>

      {/* Vệt trắng chéo quét qua để vào sân đấu */}
      {phase === 'wipe' && (
        <motion.span
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[300vmax] w-[180vmax] border-x-[14px] border-ink bg-white"
          style={{ translateY: '-50%', rotate: 20 }}
          initial={frozen ? false : { x: '-260vmax' }}
          // Dừng khi vệt trắng phủ kín màn hình rồi mới chuyển trang; màn sân đấu tự làm phần lộ ra
          animate={{ x: frozen ? '-175vmax' : '-90vmax' }}
          transition={{ duration: 0.5, ease: [0.6, 0, 0.4, 1] }}
          onAnimationComplete={() => !frozen && onDone?.()}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
