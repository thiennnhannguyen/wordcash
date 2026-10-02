/*
 * A2 · Nhà thờ Đức Bà Sài Gòn: nhà thờ gạch đỏ, 2 tháp chuông vuông giống hệt nhau, đỉnh tháp nhọn xám đậm có thánh giá
 * nhỏ; cửa sổ hoa hồng tròn lớn giữa mặt tiền; 3 cửa vòm; quảng trường cỏ nhỏ và cây nhiệt đới phía trước.
 */

import { Arch, c, LandmarkSvg, Palm, S, T } from '../shared/parts'

function Tower({ x }) {
  return (
    <g>
      <rect x={x} y="78" width="40" height="126" fill={c('map-brick')} {...S} />
      <Arch x={x + 13} y={90} w={14} h={24} />
      <Arch x={x + 13} y={124} w={14} h={22} fill="vn-tile" />
      <path d={`M${x} 118 h40 M${x} 152 h40`} {...T} opacity="0.5" />
      <path d={`M${x - 3} 78 L${x + 20} 22 L${x + 43} 78 Z`} fill={c('map-slate')} {...S} />
      <path d={`M${x + 20} 22 L${x + 43} 78 H${x + 26} Z`} fill={c('ink')} opacity="0.15" />
      <path d={`M${x + 20} 22 V10 M${x + 15} 15 h10`} {...T} />
    </g>
  )
}

export default function NhaThoDucBa({ size }) {
  const petals = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4)
  return (
    <LandmarkSvg size={size}>
      <rect x="84" y="104" width="72" height="100" fill={c('map-brick')} {...S} />
      <path d="M80 104 L120 82 L160 104 Z" fill={c('map-brick')} {...S} />
      <Tower x={44} />
      <Tower x={156} />
      {/* Cửa sổ hoa hồng */}
      <circle cx="120" cy="132" r="18" fill={c('sky')} {...S} />
      {petals.map((a) => (
        <circle key={a} cx={120 + Math.cos(a) * 10} cy={132 + Math.sin(a) * 10} r="5" fill={c('primary')} {...T} strokeWidth="1.4" />
      ))}
      <circle cx="120" cy="132" r="5" fill={c('gold')} {...T} />
      {/* 3 cửa vòm */}
      <Arch x={106} y={166} w={28} h={38} />
      <Arch x={52} y={176} w={24} h={28} />
      <Arch x={164} y={176} w={24} h={28} />
      {/* Quảng trường cỏ, cây nhiệt đới */}
      <path d="M8 204 H232 L226 222 H14 Z" fill={c('map-grass-deep')} {...S} />
      <Palm x={22} y={214} s={0.85} />
      <Palm x={218} y={214} s={0.85} flip />
    </LandmarkSvg>
  )
}
