/*
 * Lớp hiệu ứng của màn đấu (nằm trên cùng, không bắt sự kiện chuột trừ các nút).
 *
 * - `DamagePopup`: số sát thương Chakra Petch viền đen bay lên 40px trong 700ms rồi mờ dần, kèm nhãn nhỏ
 *   ("NHANH! +5", "TỰ TRÚNG ĐÒN"); chí mạng to hơn, có hạt sao bắn quanh.
 * - `Banner`: chữ lớn giữa màn READY / FIGHT! / CHÍ MẠNG x1.5 / HÒA LƯỢT / K.O.! / HẾT GIỜ! (scale 2.2 → 1.0 trong 250ms kiểu nảy).
 * - `EdgeFlash`: viền màn hình lóe màu (vàng khi chí mạng, hồng phía người chơi khi bị bắn trúng). `WhiteFlash` khi K.O.
 * - `HpCompare`: hết 20 câu, hai thanh máu phóng to ra giữa màn để so.
 * - `OpponentOfflineBanner`, `ReconnectOverlay`: trạng thái mạng. `StickerPicker`: 6 sticker biểu cảm.
 * Không dùng blur ở bất kỳ đâu để giữ 60fps trên máy yếu. `hold` giữ hiệu ứng lại (dùng khi xem thử từng khung hình).
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Smiley, Sparkle, WifiSlash } from '@phosphor-icons/react'
import MascotBlob from '../../../components/collection/MascotBlob'
import Icon from '../../../components/ui/Icon'
import cx from '../../../utils/cx'
import { ARENA } from '../rules'

const STROKE = '[-webkit-text-stroke:var(--stroke)_var(--color-ink)] [paint-order:stroke_fill]'

// ---------- Số sát thương ----------

const STAR_ANGLES = [-150, -110, -70, -30, 10, 200]

export function DamagePopup({ at, amount, label, labelTone = 'gold', crit = false, hold = false }) {
  return (
    <motion.div className="pointer-events-none fixed left-0 top-0 z-40" style={{ x: at.x, y: at.y }} aria-live="polite">
      <motion.div
        className="flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
        initial={{ y: 0, scale: crit ? 1.7 : 1.35, opacity: 0 }}
        animate={{ y: -40, scale: 1, opacity: hold ? [0, 1, 1] : [0, 1, 1, 0] }}
        transition={{ duration: 0.7, ease: 'easeOut', times: hold ? [0, 0.15, 1] : [0, 0.15, 0.75, 1] }}
      >
        <span
          className={cx('font-num leading-none text-danger', STROKE, crit ? 'text-[92px]' : 'text-[60px]')}
          style={{ '--stroke': crit ? '8px' : '6px', textShadow: '4px 4px 0 var(--color-ink)' }}
        >
          −{amount}
        </span>
        {label && (
          <span
            className={cx(
              'whitespace-nowrap rounded-pill border-2 border-line px-2.5 font-display text-sm font-bold uppercase leading-7 shadow-hard-sm',
              labelTone === 'gold' ? 'bg-gold text-ink' : 'bg-danger text-ink',
            )}
          >
            {label}
          </span>
        )}
        {crit &&
          STAR_ANGLES.map((a, i) => {
            const rad = (a * Math.PI) / 180
            return (
              <motion.span
                key={a}
                className="absolute left-1/2 top-8"
                initial={{ x: 0, y: 0, scale: 0 }}
                animate={{ x: Math.cos(rad) * 110, y: Math.sin(rad) * 80, scale: [0, 1.2, 1], rotate: 90 }}
                transition={{ duration: 0.6, delay: i * 0.03 }}
              >
                <Icon icon={Sparkle} size={30} color="gold" />
              </motion.span>
            )
          })}
      </motion.div>
    </motion.div>
  )
}

// ---------- Chữ lớn giữa màn ----------

const BANNERS = {
  ready: { text: 'READY', color: 'white', size: 'text-[72px] md:text-[120px]', enter: { x: '-100vw', opacity: 1 } },
  fight: { text: 'FIGHT!', color: 'gold', size: 'text-[96px] md:text-[180px]', enter: { scale: 2.2, opacity: 0 } },
  crit: { text: 'CHÍ MẠNG x1.5', color: 'gold', size: 'text-[44px] md:text-[80px]', enter: { x: '60vw', opacity: 0 }, skew: true },
  draw: { text: 'HÒA LƯỢT', color: 'neutral', size: 'text-[56px] md:text-[96px]', enter: { scale: 1.6, opacity: 0 } },
  ko: { text: 'K.O.!', color: 'danger', size: 'text-[120px] md:text-[240px]', enter: { scale: 2.2, opacity: 0 } },
  timeup: { text: 'HẾT GIỜ!', color: 'gold', size: 'text-[72px] md:text-[140px]', enter: { scale: 2.2, opacity: 0 } },
}

export function Banner({ kind }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[45] grid place-items-center overflow-hidden" aria-live="assertive">
      <AnimatePresence>
        {kind && (
          <motion.span
            key={kind}
            initial={BANNERS[kind].enter}
            animate={{ x: 0, scale: 1, opacity: 1 }}
            exit={kind === 'ready' ? { x: '100vw' } : { opacity: 0, scale: 0.9 }}
            transition={kind === 'ready' ? { duration: 0.35, ease: 'easeOut' } : { type: 'spring', stiffness: 520, damping: 14, mass: 0.8 }}
            className={cx('whitespace-nowrap font-display font-bold italic leading-none', STROKE, BANNERS[kind].size, BANNERS[kind].skew && '-skew-x-12')}
            style={{ '--stroke': '10px', color: `var(--color-${BANNERS[kind].color})`, textShadow: '8px 8px 0 var(--color-ink)' }}
          >
            {BANNERS[kind].text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------- Lóe viền màn hình ----------

export function EdgeFlash({ flash, hold = false }) {
  if (!flash) return null
  const color = `var(--color-${flash.color})`
  const soft = `color-mix(in srgb, var(--color-${flash.color}) 55%, transparent)`
  const style =
    flash.side === 'all'
      ? { boxShadow: `inset 0 0 0 10px ${color}, inset 0 0 90px 18px ${soft}` }
      : { background: `linear-gradient(${flash.side === 'left' ? '90deg' : '0deg'}, ${soft}, transparent 28%)`, boxShadow: flash.side === 'left' ? `inset 10px 0 0 0 ${color}` : `inset 0 -10px 0 0 ${color}` }

  return (
    <motion.div
      key={flash.key}
      className="pointer-events-none fixed inset-0 z-30"
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: hold ? [0, 1, 0.8] : [0, 1, 0] }}
      transition={{ duration: 0.55 }}
      aria-hidden="true"
    />
  )
}

export function WhiteFlash({ flashKey, hold }) {
  if (!flashKey) return null
  return (
    <motion.div
      key={flashKey}
      className="pointer-events-none fixed inset-0 z-[44] bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: hold ? [0, 0.9, 0.25] : [0, 1, 0] }}
      transition={{ duration: 0.5 }}
      aria-hidden="true"
    />
  )
}

// ---------- So máu khi hết 20 câu ----------

export function HpCompare({ me, opp, hp, winner }) {
  const rows = [
    { key: 'me', fighter: me, color: 'primary', value: hp.me },
    { key: 'opp', fighter: opp, color: 'orange', value: hp.opp },
  ]
  return (
    <div className="pointer-events-none fixed inset-0 z-[46] grid place-items-center bg-ink/45 px-4">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="flex w-full max-w-3xl flex-col gap-5 rounded-panel border-thick border-line bg-surface p-5 shadow-hard-lg md:p-8"
      >
        <span className="text-center font-display text-lg font-bold uppercase tracking-wider">So máu còn lại</span>
        {rows.map((r, i) => (
          <div key={r.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-xl font-bold uppercase italic md:text-2xl">{r.fighter.name}</span>
              <span className="flex items-center gap-2">
                {winner === r.key && <span className="rounded-pill border-2 border-line bg-accent px-2.5 font-display text-sm font-bold uppercase leading-7">Thắng</span>}
                <span className="font-num text-3xl md:text-4xl">{r.value}</span>
              </span>
            </div>
            <div className="relative h-10 overflow-hidden rounded-[12px] border-thick border-line bg-ink md:h-12">
              <motion.span
                className="absolute inset-y-0 left-0 border-r-thick border-line"
                style={{ background: `var(--color-${r.color})` }}
                initial={{ width: 0 }}
                animate={{ width: `${(r.value / ARENA.MAX_HP) * 100}%` }}
                transition={{ delay: 0.3 + i * 0.25, duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ---------- Mạng ----------

export function OpponentOfflineBanner({ until }) {
  const [left, setLeft] = useState(() => Math.ceil((until - Date.now()) / 1000))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000))), 250)
    return () => clearInterval(t)
  }, [until])

  return (
    <motion.div
      initial={{ y: '-100%' }}
      animate={{ y: 0 }}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b-thick border-line bg-gold px-4 py-2.5 font-display text-base font-bold uppercase tracking-wide shadow-hard"
      role="status"
    >
      <Icon icon={WifiSlash} size={22} />
      Đối thủ mất kết nối · Chờ <span className="font-num inline-block min-w-10 rounded-pill border-2 border-line bg-surface text-center leading-7">{left}s</span>
    </motion.div>
  )
}

export function ReconnectOverlay({ mascot }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/65 px-4" role="alertdialog" aria-label="Đang kết nối lại">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-panel border-thick border-line bg-surface p-6 text-center shadow-hard-lg"
      >
        <div className="relative">
          <MascotBlob color={mascot.color} shape={mascot.shape} size={140} />
          {/* Ăng-ten cầm trên tay */}
          <svg viewBox="0 0 80 120" className="absolute -right-10 -top-6 h-28 w-20" aria-hidden="true">
            <line x1="20" y1="110" x2="46" y2="30" stroke="var(--color-ink)" strokeWidth="6" strokeLinecap="round" />
            <circle cx="46" cy="28" r="9" fill="var(--color-danger)" stroke="var(--color-ink)" strokeWidth="4" />
            {[18, 30, 42].map((r, i) => (
              <path
                key={r}
                d={`M${46 - r * 0.7} ${28 - r * 0.7} A${r} ${r} 0 0 1 ${46 + r * 0.7} ${28 - r * 0.7}`}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="4"
                strokeLinecap="round"
                className="anim-signal"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            ))}
          </svg>
        </div>
        <h2 className="text-h3">Đang kết nối lại…</h2>
        <p className="text-caption text-muted">Trận đấu tạm dừng. Máu và điểm vẫn được server giữ nguyên.</p>
      </motion.div>
    </div>
  )
}

// ---------- Sticker biểu cảm ----------

export function StickerPicker({ stickers, open, onToggle, enabled, onSend, className }) {
  return (
    <div className={cx('relative', className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.9 }}
            className="absolute bottom-full left-0 mb-3 w-64 rounded-card border-thick border-line bg-surface p-3 shadow-hard-lg"
          >
            <div className="grid grid-cols-2 gap-2">
              {stickers.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={!enabled}
                  onClick={() => onSend(s.id)}
                  className="pressable h-11 rounded-[14px] border-thick border-line bg-raised px-2 font-display text-sm font-bold uppercase shadow-hard-sm disabled:opacity-40"
                  style={{ rotate: `${i % 2 ? 2 : -2}deg` }}
                >
                  {s.text}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-muted">{enabled ? 'Hiện 2 giây trên đầu linh vật' : 'Chỉ gửi được giữa hai câu hỏi'}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Biểu cảm"
        aria-expanded={open}
        className="pressable grid size-14 place-items-center rounded-pill border-thick border-line bg-gold shadow-hard hover:-translate-y-0.5"
      >
        <Icon icon={Smiley} size={30} />
      </button>
    </div>
  )
}
