/*
 * Bộ đếm combo.
 *
 * "Đồng hồ combo" 3 ô tròn: mỗi câu đúng liên tiếp sáng thêm một ô (xanh chanh). Đủ 3 ô thì cả cụm rực vàng và
 * hiện nhãn "CHÍ MẠNG SẴN SÀNG" (phát bắn kế tiếp x1.5). Đổi `shatterKey` để phát hiệu ứng vỡ vụn khi trả lời sai.
 * Số combo do server trả về; component chỉ hiển thị. `mirrored` đảo chiều cho phe đối thủ.
 * `showLabel` = false ẩn nhãn chữ (thanh máu gọn trên mobile), cụm vẫn rực vàng khi sẵn sàng.
 */

import { AnimatePresence, motion } from 'framer-motion'
import cx from '../../../utils/cx'
import { ARENA } from '../rules'

const SHARDS = [
  { x: -18, y: -16, r: -60 },
  { x: 16, y: -18, r: 70 },
  { x: -14, y: 16, r: 40 },
  { x: 18, y: 14, r: -80 },
]

export default function ComboMeter({ value, shatterKey, shatterCount = 0, mirrored = false, compact = false, showLabel = true }) {
  const max = ARENA.CRIT_STREAK
  const ready = value >= max

  return (
    <div className={cx('flex items-center gap-2', mirrored && 'flex-row-reverse')} aria-label={ready ? 'Chí mạng sẵn sàng' : `Combo ${value} trên ${max}`} role="img">
      <div
        className={cx(
          'relative flex gap-1.5 rounded-pill border-thick border-line px-1.5 py-1 shadow-hard-sm transition-colors',
          ready ? 'bg-gold shadow-[0_0_0_3px_var(--color-ink),0_0_22px_6px_color-mix(in_srgb,var(--color-gold)_70%,transparent)]' : 'bg-surface',
          mirrored && 'flex-row-reverse',
        )}
      >
        {Array.from({ length: max }, (_, i) => {
          const lit = i < value
          return (
            <span key={i} className="relative">
              <motion.span
                className={cx('block rounded-pill border-2 border-line', compact ? 'size-4' : 'size-5', lit ? (ready ? 'bg-orange' : 'bg-accent') : 'bg-raised')}
                animate={lit ? { scale: [1.5, 1] } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              />
              {/* Vỡ vụn thành mảnh */}
              <AnimatePresence>
                {shatterKey && i < shatterCount && (
                  <motion.span key={`${shatterKey}-${i}`} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
                    {SHARDS.map((s, k) => (
                      <motion.span
                        key={k}
                        className="absolute left-1/2 top-1/2 size-2 bg-accent"
                        style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
                        initial={{ x: -4, y: -4, rotate: 0 }}
                        animate={{ x: s.x, y: s.y, rotate: s.r }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    ))}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          )
        })}
      </div>
      <AnimatePresence>
        {ready && showLabel && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1.15, 1], opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className={cx(
              'whitespace-nowrap rounded-pill border-2 border-line bg-ink px-2 font-display font-bold uppercase leading-6 text-gold',
              compact ? 'text-[11px]' : 'text-xs',
            )}
          >
            Chí mạng sẵn sàng
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
