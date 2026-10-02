/*
 * A1 · Chùa Một Cột: ngôi chùa gỗ vuông nhỏ mái ngói cong có đầu đao, đặt trên đúng một cột đá tròn to giữa hồ vuông
 * đầy hoa sen; lan can gạch thấp quanh hồ; bậc thang dẫn lên chùa.
 */

import { c, CurvedRoof, LandmarkSvg, LotusLeaf, S, T } from '../shared/parts'

export default function ChuaMotCot({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Hồ vuông nhìn chéo, lan can gạch */}
      <path d="M24 196 L64 170 H176 L216 196 L184 222 H56 Z" fill={c('map-brick')} {...S} />
      <path d="M36 196 L70 176 H170 L204 196 L178 216 H62 Z" fill={c('vn-water')} {...S} />
      {[[60, 204, true], [88, 210, false], [160, 208, true], [184, 198, false], [80, 186, false], [168, 184, true]].map(([x, y, bud]) => (
        <LotusLeaf key={`${x}${y}`} x={x} y={y} r={9} bud={bud} />
      ))}
      {/* Cột đá duy nhất */}
      <path d="M108 130 V200 Q120 206 132 200 V130 Z" fill={c('vn-stone')} {...S} />
      <ellipse cx="120" cy="200" rx="12" ry="4" fill={c('vn-stone')} {...T} />
      <path d="M114 140 V194" stroke={c('white')} strokeWidth="3" opacity="0.6" strokeLinecap="round" />
      {/* Bậc thang */}
      <path d="M44 198 L96 132 H104 L54 200 Z" fill={c('map-stone-deep')} {...S} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${52 + i * 10} ${188 - i * 13} h8`} {...T} />
      ))}
      {/* Chùa gỗ */}
      <rect x="80" y="122" width="80" height="10" fill={c('vn-wood')} {...S} />
      <rect x="90" y="88" width="60" height="34" fill={c('vn-tile')} {...S} />
      <rect x="104" y="96" width="14" height="26" fill={c('gold')} {...T} />
      <rect x="122" y="96" width="14" height="26" fill={c('gold')} {...T} />
      <path d="M90 104 H150" {...T} opacity="0.4" />
      <CurvedRoof x={78} y={88} w={84} h={28} fill="map-slate" tips={12} />
      <path d="M120 60 v-10" {...S} />
      <circle cx="120" cy="48" r="4.5" fill={c('gold')} {...T} />
    </LandmarkSvg>
  )
}
