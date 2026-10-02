/*
 * Thẻ linh vật theo độ hiếm.
 *
 * Khung dùng thống nhất ở mọi nơi (tỉ lệ 3:4, bo góc 20px, có số thứ tự, tên và nhãn độ hiếm):
 * Thường (nền kem, dải nhãn xám) · Hiếm (nền xanh trời, 1 sao) · Sử Thi (nền tím điện, 2 sao, quầng sáng nhẹ)
 * · Huyền Thoại (nền vàng có tia sáng, 3 sao, viền kép, hạt lấp lánh, ánh kim khi rê chuột).
 * Thẻ chưa sở hữu: hình bóng trên nền xám kẻ sọc chéo, dấu "?"; riêng Huyền Thoại giữ viền vàng mờ.
 * `interactive` bật nghiêng 3D theo con trỏ (tắt khi giảm chuyển động). `isNew` gắn nhãn "MỚI", `count` > 1 gắn huy hiệu "x3".
 * Linh vật chỉ để trang trí, không có chỉ số sức mạnh. `compact` ẩn số thứ tự và sao cho thẻ cỡ nhỏ.
 */

import { useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import cx from '../../utils/cx'
import { RARITIES } from '../../utils/constants'
import { formatMascotNumber } from '../../utils/format'

const BACKGROUNDS = {
  common: 'var(--color-bg)',
  rare: 'var(--color-rarity-rare)',
  epic: 'var(--color-rarity-epic)',
  // Họa tiết tia sáng tỏa từ giữa ô tranh
  legendary:
    'repeating-conic-gradient(from 0deg at 50% 42%, color-mix(in srgb, var(--color-white) 38%, transparent) 0deg 9deg, transparent 9deg 22.5deg), var(--color-rarity-legendary)',
}

const LOCKED_BG =
  'repeating-linear-gradient(135deg, var(--color-raised) 0 7px, color-mix(in srgb, var(--color-neutral) 60%, var(--color-surface)) 7px 14px)'
// Huyền Thoại chưa có: sọc pha vàng nhạt
const LOCKED_LEGEND_BG =
  'repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-gold) 22%, var(--color-surface)) 0 7px, color-mix(in srgb, var(--color-gold) 40%, var(--color-neutral)) 7px 14px)'

// Ô tranh sáng hơn nền thẻ để linh vật cùng màu vẫn nổi
const WINDOWS = {
  common: 'var(--color-surface)',
  rare: 'color-mix(in srgb, var(--color-rarity-rare) 22%, var(--color-surface))',
  epic: 'color-mix(in srgb, var(--color-rarity-epic) 18%, var(--color-surface))',
  legendary: 'color-mix(in srgb, var(--color-surface) 55%, transparent)',
}

const SHADOWS = {
  common: 'shadow-hard',
  rare: 'shadow-hard',
  epic: 'shadow-glow-epic anim-glow',
  legendary: 'shadow-glow-legendary anim-glow',
}

// Vị trí và độ trễ của các hạt lấp lánh trên thẻ Huyền Thoại
const SPARKLES = [
  { top: '14%', left: '8%', size: 20, delay: '0s', color: 'white' },
  { top: '20%', left: '80%', size: 24, delay: '0.6s', color: 'orange' },
  { top: '50%', left: '5%', size: 16, delay: '1.1s', color: 'orange' },
  { top: '46%', left: '84%', size: 18, delay: '0.3s', color: 'white' },
  { top: '62%', left: '70%', size: 14, delay: '0.9s', color: 'primary' },
]

export function Stars({ count, size = 14, className }) {
  if (!count) return null
  return (
    <span className={cx('flex items-center gap-0.5', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size}>
          <path
            d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
            fill="var(--color-gold)"
            stroke="var(--color-ink)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

export default function MascotCard({
  rarity = 'common',
  name,
  number,
  art,
  owned = true,
  compact = false,
  isNew = false,
  count = 1,
  interactive = false,
  holo = false,
  className,
}) {
  const info = RARITIES[rarity]
  const reduceMotion = useReducedMotion()
  const ref = useRef(null)
  const legendary = rarity === 'legendary'
  const tilt = interactive && !reduceMotion

  const onMove = (event) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const px = (event.clientX - box.left) / box.width
    const py = (event.clientY - box.top) / box.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    if (!tilt) return
    el.dataset.tilting = ''
    el.style.setProperty('--rx', `${(0.5 - py) * 16}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * 18}deg`)
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    delete el.dataset.tilting
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  const pointer = interactive ? { onPointerMove: onMove, onPointerLeave: onLeave } : {}

  return (
    <div ref={ref} className={cx('relative', interactive && 'card-tilt', className)} {...pointer}>
      <figure
        className={cx(
          'relative m-0 flex aspect-[3/4] w-full flex-col overflow-hidden rounded-[20px] border-thick border-line @container',
          owned ? SHADOWS[rarity] : 'shadow-hard-sm',
        )}
        style={{
          background: owned ? BACKGROUNDS[rarity] : legendary ? LOCKED_LEGEND_BG : LOCKED_BG,
          // Huyền Thoại chưa có: viền vàng mờ bên ngoài để vẫn thấy đáng mơ ước
          boxShadow: !owned && legendary ? '0 0 0 4px color-mix(in srgb, var(--color-gold) 75%, transparent), 0 0 16px 4px color-mix(in srgb, var(--color-gold) 45%, transparent)' : undefined,
        }}
      >
        {/* Viền kép của Huyền Thoại */}
        {owned && legendary && <span className="pointer-events-none absolute inset-[5px] z-10 rounded-[14px] border-2 border-line" aria-hidden="true" />}

        {/* Hàng trên: số thứ tự và sao */}
        {!compact && (
          <div className="relative z-10 flex h-6 shrink-0 items-center justify-between px-2 @[150px]:h-8 @[150px]:px-3.5">
            <span className={cx('font-num text-[13px] leading-none @[150px]:text-sm', owned && rarity === 'epic' ? 'text-white' : 'text-ink')}>
              {formatMascotNumber(number)}
            </span>
            {owned && <Stars count={info.stars} size={13} />}
          </div>
        )}

        {/* Ô tranh */}
        <div
          className={cx(
            'relative mx-1.5 min-h-0 flex-1 rounded-[12px] @[150px]:mx-2.5 @[150px]:rounded-[14px]',
            compact && 'mt-2',
            owned ? 'border-2 border-line' : 'border-2 border-dashed border-muted/60',
          )}
          style={{ background: owned ? WINDOWS[rarity] : 'color-mix(in srgb, var(--color-surface) 45%, transparent)' }}
        >
          <div className="absolute inset-0 flex items-center justify-center [&>svg]:h-[92%] [&>svg]:w-auto">{art}</div>
          {!owned && (
            <span className="absolute inset-0 grid place-items-center font-heading text-[28px] font-black text-white @[150px]:text-[40px]" aria-hidden="true">
              ?
            </span>
          )}
          {owned &&
            legendary &&
            SPARKLES.map((s, i) => (
              <span key={i} aria-hidden="true" className="anim-sparkle absolute" style={{ top: s.top, left: s.left, animationDelay: s.delay }}>
                <Icon icon={Sparkle} size={s.size} color={s.color} />
              </span>
            ))}
        </div>

        {/* Tên */}
        <figcaption className="relative z-10 mx-1.5 mt-1 truncate rounded-[10px] border-2 border-line bg-surface px-1 text-center font-heading text-[13px] font-extrabold leading-5 text-ink @[150px]:mx-2.5 @[150px]:mt-1.5 @[150px]:text-[15px] @[150px]:leading-7">
          {owned ? name : '???'}
        </figcaption>

        {/* Dải nhãn độ hiếm */}
        <div
          className={cx(
            'relative mt-1 shrink-0 border-t-thick border-line text-center font-display text-[13px] font-bold uppercase leading-5 tracking-wide @[150px]:mt-1.5 @[150px]:leading-7 @[150px]:tracking-wider',
            !owned ? 'bg-neutral text-muted' : rarity === 'common' ? 'bg-rarity-common text-ink' : 'bg-ink text-white',
          )}
          style={owned && !legendary && rarity !== 'common' ? { color: rarity === 'rare' ? 'var(--color-sky)' : 'var(--color-white)' } : owned && legendary ? { color: 'var(--color-gold)' } : undefined}
        >
          {info.name}
        </div>

        {/* Ánh kim (holographic) */}
        {owned && legendary && <span className="card-holo absolute inset-0 z-20 rounded-[18px]" data-on={holo ? '' : undefined} aria-hidden="true" />}
      </figure>

      {isNew && owned && (
        <span
          className="absolute -left-3 -top-4 z-30 rounded-[10px] border-2 border-line bg-danger px-2 font-display text-[13px] font-bold uppercase leading-6 text-ink shadow-hard-sm"
          style={{ transform: 'rotate(-12deg)' }}
        >
          Mới
        </span>
      )}
      {count > 1 && owned && (
        <span className="absolute -right-2 -top-2 z-30 grid h-7 min-w-7 place-items-center rounded-pill border-2 border-line bg-gold px-1.5 font-num text-[13px] leading-none text-ink shadow-hard-sm">
          x{count}
        </span>
      )}
    </div>
  )
}
