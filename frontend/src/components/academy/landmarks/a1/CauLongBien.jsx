/*
 * A1 · Cầu Long Biên: đoạn cầu sắt dàn thép cũ nâu gỉ xen xám, dầm đan zigzag, trụ đá to, bắc qua sông nước nâu cam;
 * đoàn tàu nhỏ đỏ-kem chạy trên cầu; bãi chuối và thuyền nhỏ dưới chân cầu.
 */

import { c, LandmarkSvg, S, Sampan, T } from '../shared/parts'

function Banana({ x, y }) {
  return (
    <g>
      <path d={`M${x} ${y} v-24`} stroke={c('vn-wood')} strokeWidth="4" strokeLinecap="round" />
      <path d={`M${x} ${y - 22} q-18 -6 -20 6 q10 -6 20 -6 q16 -10 20 4 q-10 -6 -20 -4 q-4 -16 6 -20 q-4 10 -6 20 Z`} fill={c('map-grass-shade')} {...T} />
    </g>
  )
}

export default function CauLongBien({ size }) {
  // Dầm zigzag giữa hai thanh ngang
  const zig = Array.from({ length: 10 }, (_, i) => `${i ? 'L' : 'M'}${14 + i * 23} ${i % 2 ? 104 : 148}`).join(' ')
  return (
    <LandmarkSvg size={size}>
      {/* Sông nâu cam */}
      <path d="M2 196 Q60 188 120 194 Q180 200 238 192 V222 H2 Z" fill={c('vn-river')} {...S} />
      <path d="M40 208 h20 M150 212 h24" stroke={c('white')} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* Trụ đá */}
      {[52, 168].map((x) => (
        <path key={x} d={`M${x - 14} 150 H${x + 14} L${x + 18} 206 H${x - 18} Z`} fill={c('vn-stone')} {...S} />
      ))}
      {/* Đoàn tàu đỏ-kem chạy trong dàn cầu */}
      <g>
        {[40, 92, 144].map((x, i) => (
          <g key={x}>
            <rect x={x} y="124" width="48" height="22" rx="5" fill={c(i === 0 ? 'vn-tile' : 'map-stone')} {...T} />
            <path d={`M${x} 136 h48`} stroke={c(i === 0 ? 'map-stone' : 'vn-tile')} strokeWidth="4" />
            <rect x={x + 8} y="128" width="9" height="6" fill={c('sky')} {...T} strokeWidth="1.5" />
            <rect x={x + 26} y="128" width="9" height="6" fill={c('sky')} {...T} strokeWidth="1.5" />
          </g>
        ))}
      </g>
      {/* Dàn thép */}
      <path d="M8 104 Q120 88 232 104" fill="none" stroke={c('ink')} strokeWidth="9" strokeLinecap="round" />
      <path d="M8 104 Q120 88 232 104" fill="none" stroke={c('vn-wood')} strokeWidth="5" strokeLinecap="round" />
      <path d={zig} fill="none" stroke={c('ink')} strokeWidth="7" strokeLinejoin="round" />
      <path d={zig} fill="none" stroke={c('map-rock-deep')} strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="4" y="146" width="232" height="9" rx="2" fill={c('vn-wood')} {...S} />
      {/* Bãi chuối, thuyền */}
      <Banana x={18} y={196} />
      <Banana x={222} y={194} />
      <Sampan x={118} y={212} s={0.9} />
    </LandmarkSvg>
  )
}
