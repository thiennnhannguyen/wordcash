/*
 * Phần tử dùng chung cho tranh địa danh (viewBox 240×240, chân công trình chạm y = 222):
 * khung `LandmarkSvg` tự thêm bóng đổ cứng (bản sao hình lệch 4px xuống dưới-phải, màu mực, mờ 20%, không blur),
 * cây tròn, cọ, liễu, thông, người đội nón lá (không vẽ mặt), thuyền nan, mây, mặt nước, lá sen, đèn lồng.
 * Màu lấy từ tokens.css. Viền mực 3px, bo góc khớp với cột mốc km và các địa danh B1.
 */

export const INK = 'var(--color-ink)'
export const c = (token) => `var(--color-${token})`
// Nét chính 3px và nét chi tiết 2px
export const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' }
export const T = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }

/** Khung SVG của một địa danh: vẽ hình hai lần, lần đầu thành bóng đổ cứng. */
export function LandmarkSvg({ children, size, className, label }) {
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} overflow="visible" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <filter id="lm-ink" x="-5%" y="-5%" width="115%" height="115%">
          <feFlood style={{ floodColor: 'var(--color-ink)' }} />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <g transform="translate(4 4)" filter="url(#lm-ink)" opacity="0.2">
        {children}
      </g>
      {children}
    </svg>
  )
}

/** Cửa vòm: `fill` mặc định màu mực. */
export function Arch({ x, y, w, h, fill = 'ink', ...rest }) {
  return <path d={`M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`} fill={c(fill)} {...T} {...rest} />
}

/** Mái cong vút kiểu Á Đông: đáy rộng `w`, đỉnh cao `h`, hai đầu đao hếch lên. */
export function CurvedRoof({ x, y, w, h, fill = 'vn-tile', tips = 7 }) {
  const l = x
  const r = x + w
  return (
    <g>
      <path d={`M${l - tips} ${y - tips} Q${l + 6} ${y + 2} ${l + w * 0.18} ${y - h * 0.45} L${l + w * 0.3} ${y - h} H${r - w * 0.3} L${r - w * 0.18} ${y - h * 0.45} Q${r - 6} ${y + 2} ${r + tips} ${y - tips} Q${r - 4} ${y + 4} ${r - 10} ${y + 4} H${l + 10} Q${l + 4} ${y + 4} ${l - tips} ${y - tips} Z`} fill={c(fill)} {...S} />
      <path d={`M${l + w * 0.3} ${y - h} H${r - w * 0.3}`} {...S} strokeWidth="4" />
    </g>
  )
}

export function Water({ cx, cy, rx, ry, fill = 'vn-water' }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c(fill)} {...S} />
      <path d={`M${cx - rx * 0.6} ${cy - ry * 0.2} h${rx * 0.22} M${cx + rx * 0.25} ${cy + ry * 0.3} h${rx * 0.2} M${cx - rx * 0.1} ${cy + ry * 0.55} h${rx * 0.14}`} stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

export function RoundTree({ x, y, r = 15, fill = 'map-grass-shade' }) {
  return (
    <g>
      <rect x={x - 3.5} y={y - r - 2} width="7" height={r + 2} rx="2" fill={c('vn-wood')} {...T} />
      <circle cx={x} cy={y - r * 1.7} r={r} fill={c(fill)} {...S} />
      <circle cx={x - r * 0.35} cy={y - r * 2} r={r * 0.25} fill={c('white')} opacity="0.5" />
    </g>
  )
}

export function Pine({ x, y, s = 1, fill = 'map-pine' }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -46 L11 -26 L6 -26 L15 -10 L3 -10 V0 H-3 V-10 L-15 -10 L-6 -26 L-11 -26 Z"
      fill={c(fill)}
      {...S}
    />
  )
}

export function Palm({ x, y, s = 1, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 Q-4 -22 6 -44" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <path d="M0 0 Q-4 -22 6 -44" fill="none" stroke={c('map-wood-light')} strokeWidth="4" strokeLinecap="round" />
      <path d="M6 -44 Q-12 -54 -22 -38 Q-8 -44 6 -44 Q0 -62 16 -62 Q8 -52 6 -44 Q24 -56 30 -40 Q18 -46 6 -44 Z" fill={c('map-pine')} {...S} />
    </g>
  )
}

export function Willow({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 Q2 -18 -2 -34" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M0 0 Q2 -18 -2 -34" fill="none" stroke={c('vn-wood')} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M-22 -14 Q-26 -40 -6 -48 Q14 -52 22 -36 Q26 -24 22 -10 Q18 -24 14 -14 Q10 -28 4 -12 Q0 -28 -6 -12 Q-10 -26 -14 -12 Q-18 -24 -22 -14 Z" fill={c('map-grass-shade')} {...S} />
    </g>
  )
}

/** Người nhỏ đội nón lá (không vẽ chi tiết khuôn mặt). */
export function HatPerson({ x, y, s = 1, shirt = 'sky' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-7 0 V-14 Q-7 -20 0 -20 Q7 -20 7 -14 V0 Z" fill={c(shirt)} {...T} />
      <circle cx="0" cy="-24" r="5" fill={c('map-stone')} {...T} />
      <path d="M-13 -25 L0 -38 L13 -25 Z" fill={c('map-field')} {...T} />
    </g>
  )
}

/** Thuyền nan gỗ nhỏ. */
export function Sampan({ x, y, s = 1, flip = false, children }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {children}
      <path d="M-26 -8 Q0 -4 26 -10 Q22 4 0 4 Q-20 4 -26 -8 Z" fill={c('vn-wood')} {...S} />
      <path d="M-14 -4 H14" {...T} opacity="0.5" />
    </g>
  )
}

export function Cloud({ x, y, s = 1, fill = 'white' }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-24 8 H24 A10 10 0 0 0 22 -10 A13 13 0 0 0 0 -16 A12 12 0 0 0 -20 -6 A8 8 0 0 0 -24 8 Z"
      fill={c(fill)}
      {...S}
    />
  )
}

export function LotusLeaf({ x, y, r = 8, bud = false }) {
  return (
    <g>
      <path d={`M${x} ${y} L${x + r} ${y - 2} A${r} ${r * 0.55} 0 1 0 ${x + r} ${y + 2} Z`} fill={c('map-pine')} {...T} />
      {bud && <path d={`M${x - 4} ${y - 2} Q${x} ${y - 14} ${x + 4} ${y - 2} Z`} fill={c('danger')} {...T} />}
    </g>
  )
}

export function Lantern({ x, y, fill = 'danger', line = 10 }) {
  return (
    <g>
      <path d={`M${x} ${y - line} V${y - 6}`} {...T} />
      <ellipse cx={x} cy={y} rx="6" ry="7" fill={c(fill)} {...T} />
      <path d={`M${x - 3} ${y + 7} h6`} {...T} />
    </g>
  )
}

export function Flowers({ x, y, colors = ['danger', 'gold', 'white'] }) {
  return (
    <g>
      {colors.map((col, i) => (
        <circle key={i} cx={x + i * 8 - 8} cy={y - (i % 2) * 5} r="3.5" fill={c(col)} {...T} strokeWidth="1.5" />
      ))}
    </g>
  )
}
