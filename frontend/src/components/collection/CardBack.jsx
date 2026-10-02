/*
 * Mặt sau thẻ linh vật: nền tím điện kẻ sọc chéo, viền nét đứt, huy hiệu chữ W và logo WORDCLASH.
 * `asBack` đặt sẵn xoay 180 độ và ẩn mặt sau, để ghép với mặt trước trong thẻ lật 3D.
 * `glow` (màu token) tô viền sáng lọt ra từ mép thẻ úp, dùng để gợi ý độ hiếm trước khi lật.
 * Cỡ chữ và huy hiệu co theo độ rộng thẻ (container query).
 */

import { Wordmark } from '../layout/NavBar'
import cx from '../../utils/cx'

export default function CardBack({ asBack = false, glow, className }) {
  return (
    <div
      className={cx(
        'absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[20px] border-thick border-line @container',
        asBack && '[backface-visibility:hidden] [transform:rotateY(180deg)]',
        !glow && 'shadow-hard',
        className,
      )}
      style={{
        background:
          'repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-white) 14%, transparent) 0 10px, transparent 10px 22px), var(--color-primary)',
        boxShadow: glow
          ? `0 0 0 4px var(--color-${glow}), 0 0 28px 10px color-mix(in srgb, var(--color-${glow}) 80%, transparent), 0 0 70px 20px color-mix(in srgb, var(--color-${glow}) 45%, transparent)`
          : undefined,
      }}
    >
      <span className="pointer-events-none absolute inset-[6px] rounded-[14px] border-2 border-dashed border-white/60" aria-hidden="true" />
      <span className="grid size-12 place-items-center rounded-pill border-thick border-line bg-gold font-heading text-[28px] font-black italic leading-none shadow-hard-sm @[180px]:size-24 @[180px]:text-[56px] @[180px]:shadow-hard">
        W
      </span>
      <span className="hidden rounded-pill border-thick border-line bg-surface px-4 py-1 shadow-hard-sm @[180px]:block">
        <Wordmark />
      </span>
    </div>
  )
}
