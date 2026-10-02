/*
 * A1 · Đèo Mã Pí Lèng – Hà Giang: con đường uốn cua tay áo khoét vào vách đá xám dốc đứng; hẻm vực sâu có dòng sông
 * xanh ngọc mảnh (sông Nho Quế); điểm ngắm cảnh trên cao có chiếc xe máy nhỏ; hoa tam giác mạch hồng ven đường.
 */

import { c, LandmarkSvg, S, T } from '../shared/parts'

const ROAD = 'M22 206 L120 186 L46 158 L150 134 L84 106 L176 84'

export default function MaPiLeng({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Vách đá bên trái có đường đèo, vách bên phải, hẻm vực ở giữa */}
      <path d="M8 222 L14 120 L52 70 L108 56 L196 66 L202 104 L150 120 L132 222 Z" fill={c('map-rock')} {...S} />
      <path d="M150 120 L132 222 H118 L128 132 Z" fill={c('map-rock-deep')} {...T} />
      <path d="M152 222 L170 128 L214 112 L232 150 L232 222 Z" fill={c('map-rock-deep')} {...S} />
      <path d="M214 112 L232 150 V222 H206 Z" fill={c('vn-stone')} opacity="0.5" />
      {/* Sông Nho Quế dưới đáy vực */}
      <path d="M132 222 Q140 196 150 186 Q160 196 152 222 Z" fill={c('nessie')} {...T} />
      {/* Đường đèo cua tay áo */}
      <path d={ROAD} fill="none" stroke={c('ink')} strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
      <path d={ROAD} fill="none" stroke={c('map-road')} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      <path d={ROAD} fill="none" stroke={c('ink')} strokeWidth="1.4" strokeDasharray="4 6" opacity="0.5" />
      {/* Điểm ngắm cảnh và xe máy */}
      <path d="M166 84 H214 L210 74 H170 Z" fill={c('map-stone-deep')} {...S} />
      <g transform="translate(192 70)">
        <circle cx="-8" cy="0" r="5" fill={c('ink')} />
        <circle cx="10" cy="0" r="5" fill={c('ink')} />
        <path d="M-8 0 L-2 -8 H8 L10 0 M8 -8 l2 -6 h4" fill="none" stroke={c('vn-tile')} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Hoa tam giác mạch */}
      {[[30, 198], [40, 192], [110, 180], [60, 150], [70, 156], [140, 128], [100, 102], [110, 98]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3.5" fill={c('danger')} {...T} strokeWidth="1.4" />
      ))}
    </LandmarkSvg>
  )
}
