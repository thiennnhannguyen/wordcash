/*
 * A2 · Đại Nội Huế – Ngọ Môn: đế đá lớn xám kem có 3 cửa vòm (cửa giữa lớn nhất); trên đế là lầu gỗ dài 2 tầng
 * (Lầu Ngũ Phụng) mái ngói lưu ly vàng rực, cột sơn son đỏ, bờ nóc cong; hào nước có sen và cầu đá dẫn vào.
 */

import { Arch, c, CurvedRoof, LandmarkSvg, LotusLeaf, S, T } from '../shared/parts'

export default function DaiNoiHue({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Hào nước có sen, cầu đá */}
      <path d="M6 206 H234 V222 H6 Z" fill={c('vn-water')} {...S} />
      <LotusLeaf x={30} y={214} r={8} bud />
      <LotusLeaf x={200} y={214} r={8} bud />
      <path d="M96 222 V204 H144 V222" fill={c('vn-stone')} {...S} />
      {/* Đế đá ba cửa vòm */}
      <path d="M14 204 L22 126 H218 L226 204 Z" fill={c('map-stone-deep')} {...S} />
      <path d="M22 146 H218" {...T} opacity="0.4" />
      <Arch x={102} y={158} w={36} h={46} />
      <Arch x={48} y={170} w={26} h={34} />
      <Arch x={166} y={170} w={26} h={34} />
      {/* Lầu dưới: cột son, mái vàng */}
      <rect x="40" y="104" width="160" height="22" fill={c('white')} {...S} />
      {[48, 72, 96, 120, 144, 168, 192].map((x) => (
        <rect key={x} x={x - 3} y="104" width="6" height="22" fill={c('vn-tile')} {...T} />
      ))}
      <CurvedRoof x={28} y={104} w={184} h={18} fill="gold" tips={10} />
      {/* Lầu trên */}
      <rect x="78" y="70" width="84" height="18" fill={c('white')} {...S} />
      {[86, 104, 120, 136, 154].map((x) => (
        <rect key={x} x={x - 3} y="70" width="6" height="18" fill={c('vn-tile')} {...T} />
      ))}
      <CurvedRoof x={68} y={70} w={104} h={18} fill="gold" tips={10} />
      <path d="M120 52 v-6" {...S} />
      <circle cx="120" cy="44" r="4" fill={c('vn-tile')} {...T} />
    </LandmarkSvg>
  )
}
