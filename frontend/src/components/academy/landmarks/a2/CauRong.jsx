/*
 * A2 · Cầu Rồng – Đà Nẵng: cầu thép vàng óng hình con rồng thân uốn lượn nhiều khúc vắt qua sông Hàn xanh; đầu rồng dễ
 * thương ở một đầu cầu phun đốm lửa cam nhỏ; vài tòa nhà hiện đại màu pastel phía sau; ô dù bãi biển trên bờ.
 */

import { c, INK, LandmarkSvg, S, T } from '../shared/parts'

const BODY = 'M18 170 Q40 112 64 150 Q86 186 108 140 Q130 98 152 140 Q170 172 188 128'

export default function CauRong({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Nhà cao tầng pastel phía sau */}
      {[[34, 86, 30, 'sky'], [70, 70, 26, 'map-heather'], [150, 80, 28, 'raised'], [182, 96, 34, 'map-grass-deep']].map(([x, top, w, col]) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={180 - top} fill={c(col)} {...S} />
          <path d={`M${x + 7} ${top + 12} h${w - 14} M${x + 7} ${top + 26} h${w - 14} M${x + 7} ${top + 40} h${w - 14}`} {...T} opacity="0.4" />
        </g>
      ))}
      {/* Sông Hàn */}
      <path d="M2 176 H238 V222 H2 Z" fill={c('sky')} {...S} />
      <path d="M30 196 h22 M150 204 h26" stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
      {/* Mặt cầu và trụ */}
      <rect x="4" y="170" width="200" height="9" rx="2" fill={c('vn-stone')} {...S} />
      {[50, 120, 180].map((x) => (
        <rect key={x} x={x - 7} y="179" width="14" height="30" fill={c('vn-stone')} {...S} />
      ))}
      {/* Thân rồng thép vàng */}
      <path d={BODY} fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d={BODY} fill="none" stroke={c('gold')} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d={BODY} fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="3 7" opacity="0.6" />
      {/* Đầu rồng và đốm lửa */}
      <g transform="translate(196 118)">
        <path d="M-14 8 Q-18 -14 2 -16 Q22 -16 24 0 Q24 12 8 14 Q-8 16 -14 8 Z" fill={c('gold')} {...S} />
        <path d="M-6 -14 L-12 -28 L2 -16 Z M8 -16 L10 -30 L16 -14 Z" fill={c('vn-tile')} {...T} />
        <circle cx="6" cy="-4" r="5" fill={c('white')} {...T} />
        <circle cx="7" cy="-4" r="2.4" fill={INK} />
        <path d="M14 8 Q20 10 24 6" fill="none" {...T} />
        <path d="M26 2 Q40 -6 38 4 Q46 6 36 12 Q30 10 26 6 Z" fill={c('orange')} {...S} />
      </g>
      {/* Ô dù bãi biển */}
      <g transform="translate(222 186)">
        <path d="M0 0 V-24" {...T} />
        <path d="M-16 -22 Q0 -40 16 -22 Z" fill={c('danger')} {...S} />
        <path d="M-6 -22 Q0 -40 6 -22" fill={c('white')} {...T} />
      </g>
    </LandmarkSvg>
  )
}
