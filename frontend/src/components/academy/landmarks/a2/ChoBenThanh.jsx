/*
 * A2 · Chợ Bến Thành – Sài Gòn: tòa chợ màu kem với tháp đồng hồ ở giữa, mặt đồng hồ tròn phía trước, 3 cổng vòm ở chân
 * tháp, trán tường trang trí nhỏ; sạp trái cây (thanh long, xoài) phía trước; vài xe máy nhỏ; mái bạt sọc.
 */

import { Arch, c, INK, LandmarkSvg, S, T } from '../shared/parts'

export default function ChoBenThanh({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Hai cánh nhà chợ */}
      <rect x="14" y="140" width="212" height="64" fill={c('map-stone')} {...S} />
      {[28, 52, 166, 190].map((x) => (
        <rect key={x} x={x} y="154" width="16" height="20" rx="3" fill={c('sky')} {...T} />
      ))}
      <path d="M10 140 H230" {...S} strokeWidth="4" />
      {/* Tháp đồng hồ */}
      <rect x="92" y="70" width="56" height="134" fill={c('map-stone')} {...S} />
      <path d="M86 70 L120 44 L154 70 Z" fill={c('map-stone-deep')} {...S} />
      <circle cx="120" cy="60" r="4" fill={c('gold')} {...T} />
      <circle cx="120" cy="98" r="17" fill={c('white')} {...S} />
      <path d="M120 98 V88 M120 98 L128 102" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M92 126 H148" {...T} />
      <Arch x={108} y={150} w={24} h={54} />
      <Arch x={96} y={168} w={10} h={36} />
      <Arch x={134} y={168} w={10} h={36} />
      {/* Sạp trái cây */}
      <g>
        <path d="M16 194 h56 l-6 -12 h-44 Z" fill={c('accent')} {...S} />
        <path d="M30 182 l-2 12 M44 182 v12 M58 182 l2 12" stroke={c('white')} strokeWidth="4" />
        <path d="M16 194 h56 l-6 -12 h-44 Z" fill="none" {...S} />
        <rect x="20" y="194" width="48" height="24" fill={c('vn-wood')} {...S} />
        <ellipse cx="32" cy="194" rx="7" ry="6" fill={c('danger')} {...T} />
        <path d="M27 189 l-3 -3 M37 189 l3 -3" stroke={c('accent')} strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="48" cy="194" rx="6" ry="5" fill={c('gold')} {...T} />
        <ellipse cx="60" cy="194" rx="6" ry="5" fill={c('orange')} {...T} />
      </g>
      {/* Xe máy nhỏ */}
      {[176, 208].map((x, i) => (
        <g key={x} transform={`translate(${x} 214)`}>
          <circle cx="-9" cy="0" r="5" fill={INK} />
          <circle cx="9" cy="0" r="5" fill={INK} />
          <path d="M-9 0 L-3 -8 H7 L9 0 M7 -8 l2 -6 h4" fill="none" stroke={c(i ? 'sky' : 'danger')} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </LandmarkSvg>
  )
}
