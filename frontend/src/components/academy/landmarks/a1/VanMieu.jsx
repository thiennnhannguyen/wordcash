/*
 * A1 · Văn Miếu – Khuê Văn Các: gác vuông 2 tầng mái ngói đỏ cong vút, tầng trên có cửa sổ tròn nan tia mặt trời,
 * đứng trên 4 trụ gạch trắng; phía trước là hồ nước chữ nhật và 2 chậu bonsai.
 */

import { c, CurvedRoof, LandmarkSvg, S, T } from '../shared/parts'

function Bonsai({ x }) {
  return (
    <g>
      <path d={`M${x - 14} 204 h28 l-4 16 h-20 Z`} fill={c('vn-tile')} {...S} />
      <path d={`M${x} 204 q-4 -10 2 -18`} fill="none" stroke={c('vn-wood')} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx={x - 6} cy={186} rx="12" ry="8" fill={c('map-pine')} {...T} />
      <ellipse cx={x + 8} cy={178} rx="10" ry="7" fill={c('map-pine')} {...T} />
    </g>
  )
}

export default function VanMieu({ size }) {
  const sun = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6)
  return (
    <LandmarkSvg size={size}>
      {/* Hồ nước chữ nhật */}
      <path d="M56 208 H184 L196 222 H44 Z" fill={c('vn-water')} {...S} />
      <path d="M78 214 h18 M140 216 h16" stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
      {/* 4 trụ gạch trắng */}
      {[70, 98, 132, 160].map((x) => (
        <g key={x}>
          <rect x={x} y="150" width="14" height="56" fill={c('white')} {...S} />
          <path d={`M${x} 166 h14 M${x} 182 h14`} {...T} opacity="0.4" />
        </g>
      ))}
      <rect x="62" y="142" width="118" height="10" fill={c('vn-wood')} {...S} />
      <CurvedRoof x={60} y={142} w={122} h={24} fill="vn-tile" tips={10} />
      {/* Gác trên với cửa sổ tròn hình tia mặt trời */}
      <rect x="88" y="84" width="66" height="36" fill={c('vn-wood')} {...S} />
      <circle cx="121" cy="102" r="15" fill={c('gold')} {...S} />
      {sun.map((a) => (
        <path key={a} d={`M121 102 L${121 + Math.cos(a) * 14} ${102 + Math.sin(a) * 14}`} {...T} />
      ))}
      <circle cx="121" cy="102" r="4" fill={c('vn-tile')} {...T} />
      <CurvedRoof x={78} y={84} w={86} h={26} fill="vn-tile" tips={10} />
      <path d="M121 58 v-8" {...S} />
      <circle cx="121" cy="48" r="4" fill={c('gold')} {...T} />
      <Bonsai x={30} />
      <Bonsai x={210} />
    </LandmarkSvg>
  )
}
