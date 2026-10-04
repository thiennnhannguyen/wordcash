/*
 * Icon tròn nhỏ của 6 vùng đất trên dải "Hành trình" ở Sảnh: Hồ Gươm (A1), Chùa Cầu (A2), Big Ben (B1),
 * Tượng Nữ thần Tự do (B2), Nhà hát Sydney (C1), quả địa cầu (C2). Vẽ tối giản để đọc được ở cỡ ~44px;
 * tranh địa danh đầy đủ nằm ở components/academy/landmarks/. `locked`: xám mờ.
 */

import cx from '../../utils/cx'

const INK = 'var(--color-ink)'
const c = (t) => `var(--color-${t})`
const S = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }

const ART = {
  ho_guom: (
    <>
      <rect x="0" y="30" width="48" height="18" fill={c('vn-water')} />
      <path d="M8 34 h6 M32 38 h7" {...S} stroke={c('white')} />
      <rect x="18" y="20" width="12" height="12" fill={c('map-stone')} {...S} />
      <rect x="20" y="13" width="8" height="8" fill={c('map-stone')} {...S} />
      <path d="M16 21 h16 M18 14 h12" {...S} />
      <path d="M17 13 Q24 6 31 13 Z" fill={c('vn-tile')} {...S} />
      <path d="M22 32 v-5 a2 2 0 0 1 4 0 v5" fill={c('ink')} />
    </>
  ),
  chua_cau: (
    <>
      <rect x="0" y="32" width="48" height="16" fill={c('vn-river')} />
      <path d="M4 34 Q24 20 44 34" fill="none" {...S} strokeWidth="4" />
      <path d="M4 34 Q24 20 44 34" fill="none" stroke={c('vn-wood')} strokeWidth="2" />
      <path d="M14 26 h20 v-4 h-20 Z" fill={c('vn-salmon')} {...S} />
      <path d="M11 22 Q24 12 37 22 Z" fill={c('vn-tile')} {...S} />
      <circle cx="36" cy="28" r="2.6" fill={c('danger')} {...S} strokeWidth="1.5" />
    </>
  ),
  big_ben: (
    <>
      <rect x="0" y="38" width="48" height="10" fill={c('map-grass')} />
      <rect x="18" y="16" width="12" height="24" fill={c('map-stone')} {...S} />
      <path d="M18 16 L24 4 L30 16 Z" fill={c('map-slate')} {...S} />
      <circle cx="24" cy="22" r="4.2" fill={c('white')} {...S} strokeWidth="1.6" />
      <path d="M24 22 v-2.5 M24 22 h2" {...S} strokeWidth="1.4" />
      <path d="M21 30 v7 M27 30 v7" {...S} strokeWidth="1.4" />
    </>
  ),
  liberty: (
    <>
      <rect x="0" y="38" width="48" height="10" fill={c('map-water')} />
      <path d="M17 40 L19 32 H29 L31 40 Z" fill={c('map-stone')} {...S} />
      <path d="M20 32 Q19 20 22 16 H26 Q29 20 28 32 Z" fill={c('liberty')} {...S} />
      <path d="M26 17 L30 7 L32.5 7.6 L28 18 Z" fill={c('liberty')} {...S} strokeWidth="1.6" />
      <path d="M31 6 Q29 3 31 1 Q33 3 31 6 Z" fill={c('orange')} {...S} strokeWidth="1.4" />
      <circle cx="24" cy="14" r="3.4" fill={c('liberty')} {...S} strokeWidth="1.6" />
      <path d="M21 11 l-1.5 -2.5 M24 10 v-3 M27 11 l1.5 -2.5" {...S} strokeWidth="1.4" />
    </>
  ),
  opera: (
    <>
      <rect x="0" y="34" width="48" height="14" fill={c('map-water')} />
      <rect x="6" y="31" width="36" height="4" fill={c('map-stone-deep')} {...S} />
      <path d="M10 31 Q12 18 22 14 Q18 22 20 31 Z" fill={c('white')} {...S} />
      <path d="M19 31 Q22 16 32 12 Q28 22 30 31 Z" fill={c('white')} {...S} />
      <path d="M29 31 Q32 22 40 20 Q37 25 38 31 Z" fill={c('white')} {...S} />
    </>
  ),
  globe: (
    <>
      <circle cx="24" cy="24" r="17" fill={c('map-water')} {...S} />
      <path d="M13 17 Q18 13 22 16 Q20 22 15 23 Q12 21 13 17 Z" fill={c('map-grass')} {...S} strokeWidth="1.6" />
      <path d="M26 12 Q33 13 36 19 Q33 23 29 21 Q25 17 26 12 Z" fill={c('map-grass')} {...S} strokeWidth="1.6" />
      <path d="M22 28 Q29 27 31 33 Q27 39 23 36 Q20 32 22 28 Z" fill={c('map-grass')} {...S} strokeWidth="1.6" />
      <path d="M7 24 h34" {...S} strokeWidth="1.2" opacity="0.4" />
    </>
  ),
}

export default function RegionIcon({ icon, size = 44, locked = false, className }) {
  return (
    <span
      className={cx('block overflow-hidden rounded-pill border-thick border-line bg-raised', locked && 'opacity-55 grayscale', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
        {ART[icon] ?? ART.globe}
      </svg>
    </span>
  )
}
