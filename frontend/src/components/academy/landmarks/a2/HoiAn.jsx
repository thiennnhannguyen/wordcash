/*
 * A2 · Phố cổ Hội An – Chùa Cầu: cây cầu gỗ ngắn mái ngói nâu cong, gian thờ nhỏ ở giữa, bắc qua con kênh; nhà cổ 2 tầng
 * tường vàng nghệ, cửa chớp gỗ nâu, mái ngói âm dương; đèn lồng lụa tròn nhiều màu; thuyền gỗ thả đèn hoa đăng.
 */

import { c, CurvedRoof, LandmarkSvg, Lantern, S, Sampan, T } from '../shared/parts'

function OldHouse({ x, w }) {
  return (
    <g>
      <rect x={x} y="130" width={w} height="70" fill={c('gold')} {...S} />
      <path d={`M${x} 164 H${x + w}`} {...T} />
      <rect x={x + 8} y="140" width={w - 16} height="14" fill={c('vn-wood')} {...T} />
      <rect x={x + 8} y="172" width={w - 16} height="28" fill={c('vn-wood')} {...T} />
      <path d={`M${x - 4} 130 L${x + 6} 116 H${x + w - 6} L${x + w + 4} 130 Z`} fill={c('vn-tile')} {...S} />
      <path d={`M${x + 10} 120 q4 6 8 0 q4 6 8 0 q4 6 8 0`} fill="none" {...T} opacity="0.5" />
    </g>
  )
}

export default function HoiAn({ size }) {
  return (
    <LandmarkSvg size={size}>
      <OldHouse x={8} w={50} />
      <OldHouse x={182} w={50} />
      {/* Kênh nước */}
      <path d="M2 200 H238 V222 H2 Z" fill={c('vn-water')} {...S} />
      {/* Chùa Cầu */}
      <path d="M58 196 Q120 176 182 196 V204 Q120 186 58 204 Z" fill={c('vn-wood')} {...S} />
      <rect x="68" y="148" width="104" height="38" fill={c('map-wood-light')} {...S} />
      {[80, 100, 140, 160].map((x) => (
        <path key={x} d={`M${x} 152 V184`} {...T} />
      ))}
      <rect x="108" y="154" width="24" height="26" fill={c('vn-tile')} {...T} />
      <CurvedRoof x={60} y={148} w={120} h={22} fill="vn-wood" tips={8} />
      <rect x="102" y="104" width="36" height="20" fill={c('map-wood-light')} {...S} />
      <CurvedRoof x={94} y={104} w={52} h={18} fill="vn-wood" tips={7} />
      {/* Dây đèn lồng */}
      <path d="M8 96 Q60 112 102 98 M138 98 Q180 112 232 96" fill="none" {...T} />
      {[[30, 112, 'danger'], [52, 116, 'gold'], [76, 112, 'primary'], [164, 112, 'danger'], [188, 116, 'gold'], [212, 112, 'primary']].map(([x, y, col]) => (
        <Lantern key={x} x={x} y={y} fill={col} line={8} />
      ))}
      {/* Thuyền thả đèn hoa đăng */}
      <Sampan x={190} y={216} s={0.85}>
        <circle cx="-8" cy="-10" r="4" fill={c('gold')} {...T} />
      </Sampan>
      <circle cx="40" cy="212" r="4" fill={c('danger')} {...T} />
      <circle cx="58" cy="216" r="4" fill={c('gold')} {...T} />
    </LandmarkSvg>
  )
}
