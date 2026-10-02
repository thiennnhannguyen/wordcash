/*
 * A2 · Trận Boss Cầu Vàng Bà Nà: đảo boss (mặt đảo là núi xanh mờ sương), cây cầu đi bộ cong vàng kim lan can bóng,
 * được nâng bởi 2 bàn tay đá khổng lồ xám phong hóa có rêu và vết nứt vươn lên từ núi. Boss "Bàn Tay Núi": lòng bàn tay
 * có gương mặt dễ thương (mắt to thân thiện mà thách thức, miệng cười nhếch), ngón tay khẽ động; mây trắng xoáy quanh chân;
 * đường cáp treo nhỏ phía xa. Dễ thương, không đáng sợ.
 */

import { c, Cloud, INK, LandmarkSvg, S, T } from '../shared/parts'

// Bàn tay đá: lòng bàn tay hướng lên, các ngón cong đỡ cầu
function Hand({ x, flip = false }) {
  const k = flip ? -1 : 1
  return (
    <g transform={`translate(${x} 0) scale(${k} 1)`}>
      {/* Cổ tay vươn lên từ núi */}
      <path d="M-18 210 Q-22 170 -16 146 H18 Q22 170 18 210 Z" fill={c('vn-stone')} {...S} />
      {/* Lòng bàn tay */}
      <path d="M-30 150 Q-34 110 -12 102 H22 Q36 108 32 150 Q20 160 0 160 Q-20 160 -30 150 Z" fill={c('vn-stone')} {...S} />
      {/* Ngón tay khẽ động */}
      {[-24, -12, 0, 12].map((fx, i) => (
        <path
          key={fx}
          className="anim-finger"
          style={{ animationDelay: `${-i * 0.3}s` }}
          d={`M${fx - 5} 106 Q${fx - 7} 82 ${fx} 78 Q${fx + 7} 82 ${fx + 5} 106 Z`}
          fill={c('vn-stone')}
          {...S}
        />
      ))}
      <path d="M26 124 Q42 116 40 102 Q34 98 28 110" fill={c('vn-stone')} {...S} />
      {/* Rêu và vết nứt */}
      <path d="M-26 146 q6 -6 12 0 q-6 6 -12 0 Z M8 196 q6 -6 12 0 q-6 6 -12 0 Z" fill={c('map-grass-shade')} {...T} />
      <path d="M-14 176 l6 6 l-4 8 M20 130 l-6 6" fill="none" {...T} />
      {/* Gương mặt trên lòng bàn tay */}
      <ellipse cx="-8" cy="128" rx="6" ry="7" fill={c('white')} {...T} />
      <ellipse cx="12" cy="128" rx="6" ry="7" fill={c('white')} {...T} />
      <circle cx="-6" cy="129" r="3" fill={INK} />
      <circle cx="14" cy="129" r="3" fill={INK} />
      <path d="M-14 118 l10 3 M18 118 l-10 3" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-4 142 Q6 146 14 138" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  )
}

export default function BossCauVang({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Núi mờ sương và cáp treo phía xa */}
      <path d="M2 210 L50 96 L94 150 L130 74 L178 140 L210 100 L238 210 Z" fill={c('map-grass-shade')} {...S} />
      <path d="M50 96 L94 150 L130 74 L178 140 L210 100" fill="none" stroke={c('white')} strokeWidth="2" opacity="0.6" />
      <path d="M150 40 L238 76" {...T} />
      <rect x="186" y="54" width="14" height="11" rx="3" fill={c('danger')} {...T} />
      <path d="M193 50 v4" {...T} />
      <Hand x={64} />
      <Hand x={176} flip />
      {/* Cầu Vàng cong, lan can vàng bóng */}
      <path d="M18 100 Q120 66 222 100" fill="none" stroke={INK} strokeWidth="16" strokeLinecap="round" />
      <path d="M18 100 Q120 66 222 100" fill="none" stroke={c('gold')} strokeWidth="11" strokeLinecap="round" />
      <path d="M18 90 Q120 56 222 90" fill="none" stroke={INK} strokeWidth="2.4" />
      {[30, 54, 78, 102, 126, 150, 174, 198, 214].map((x) => {
        const t = (x - 18) / 204
        const y = 100 * (1 - t) ** 2 + 2 * (1 - t) * t * 66 + t * t * 100
        return <path key={x} d={`M${x} ${y - 4} V${y - 13}`} stroke={c('gold')} strokeWidth="3" strokeLinecap="round" />
      })}
      <path d="M40 96 Q120 66 200 96" fill="none" stroke={c('white')} strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
      {/* Mây xoáy quanh chân */}
      <Cloud x={34} y={206} s={1.1} />
      <Cloud x={120} y={212} s={1.2} />
      <Cloud x={206} y={206} s={1.1} />
    </LandmarkSvg>
  )
}
