/*
 * A1 · Trận Boss Vịnh Hạ Long: đảo boss (mặt đảo là nước) với các hòn đá vôi tròn cao, Hòn Trống Mái (hai hòn nghiêng
 * chụm vào nhau), thuyền buồm gỗ cánh buồm nâu cam có nan. Ở giữa là Boss "Rồng Vịnh": rồng đá tròn trịa xanh trời pha
 * xanh chanh phủ rêu, sừng nhỏ, cánh nhỏ, mắt to tự tin, nhô nửa người khỏi nước, khoanh tay canh vịnh; nháy mắt mỗi 5 giây.
 * Dễ thương, không đáng sợ.
 */

import { c, INK, LandmarkSvg, S, T } from '../shared/parts'

function Islet({ x, w, top, base = 214 }) {
  return (
    <g>
      <path d={`M${x} ${base} C${x} ${top + 20} ${x + w * 0.2} ${top} ${x + w / 2} ${top} C${x + w * 0.8} ${top} ${x + w} ${top + 20} ${x + w} ${base} Z`} fill={c('vn-stone')} {...S} />
      <path d={`M${x + 3} ${top + 18} C${x + 6} ${top + 4} ${x + w * 0.3} ${top - 1} ${x + w / 2} ${top - 1} C${x + w * 0.7} ${top - 1} ${x + w - 3} ${top + 6} ${x + w - 3} ${top + 16} Q${x + w / 2} ${top + 26} ${x + 3} ${top + 18} Z`} fill={c('map-grass-shade')} {...T} />
    </g>
  )
}

export default function BossHaLong({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Hòn Trống Mái */}
      <path d="M22 214 Q18 170 40 150 Q50 160 44 214 Z" fill={c('vn-stone')} {...S} />
      <path d="M48 214 Q44 168 42 154 Q66 166 64 214 Z" fill={c('vn-stone')} {...S} />
      <path d="M36 152 q4 -4 8 0 M42 156 q6 -2 10 2" fill={c('map-grass-shade')} {...T} />
      <Islet x={176} w={40} top={120} />
      <Islet x={150} w={30} top={150} />
      <Islet x={66} w={28} top={160} />
      {/* Thuyền buồm gỗ cánh buồm nâu cam có nan */}
      <g transform="translate(196 210)">
        <path d="M-2 -4 V-52" {...S} />
        <path d="M0 -52 Q20 -44 24 -10 H0 Z" fill={c('orange')} {...S} />
        <path d="M0 -40 H20 M0 -28 H23 M0 -18 H24" {...T} />
        <path d="M-22 -2 H28 L20 8 H-14 Z" fill={c('vn-wood')} {...S} />
      </g>
      {/* Rồng Vịnh */}
      <g transform="translate(120 206) scale(0.82) translate(-120 -206)">
        {/* Cánh nhỏ */}
        <path d="M80 110 Q60 92 64 76 Q76 88 88 92 Z" fill={c('accent')} {...S} />
        <path d="M160 110 Q180 92 176 76 Q164 88 152 92 Z" fill={c('accent')} {...S} />
        {/* Thân tròn nhô khỏi nước */}
        <path d="M78 206 Q70 128 92 104 Q120 80 148 104 Q170 128 162 206 Z" fill={c('sky')} {...S} />
        {/* Rêu phủ */}
        <path d="M94 110 q10 -8 18 -2 q8 -10 20 -2 q8 -4 14 4 q-10 4 -18 0 q-10 6 -18 0 q-8 6 -16 0 Z" fill={c('accent')} {...T} />
        <path d="M84 168 q6 -6 12 0 q-6 6 -12 0 Z M146 160 q6 -6 12 0 q-6 6 -12 0 Z" fill={c('accent')} {...T} />
        {/* Sừng nhỏ */}
        <path d="M100 94 L94 72 L110 88 Z M140 94 L146 72 L130 88 Z" fill={c('map-stone')} {...S} />
        {/* Mắt to tự tin, lông mày nhướng */}
        <path d="M96 116 L112 120 M144 116 L128 120" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="107" cy="132" rx="11" ry="12" fill={c('white')} {...S} />
        <circle cx="109" cy="134" r="5.5" fill={INK} />
        <circle cx="111" cy="131" r="2" fill={c('white')} />
        <g className="anim-wink-open">
          <ellipse cx="133" cy="132" rx="11" ry="12" fill={c('white')} {...S} />
          <circle cx="131" cy="134" r="5.5" fill={INK} />
          <circle cx="133" cy="131" r="2" fill={c('white')} />
        </g>
        <path className="anim-wink" d="M122 134 Q133 126 144 134" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="96" cy="148" rx="6" ry="3.5" fill={c('danger')} opacity="0.5" />
        <ellipse cx="144" cy="148" rx="6" ry="3.5" fill={c('danger')} opacity="0.5" />
        <path d="M110 152 Q122 160 132 150" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M128 152 l3 5 l3 -6" fill={c('white')} {...T} strokeWidth="1.5" />
        {/* Hai tay khoanh trước ngực */}
        <path d="M84 176 Q120 160 152 184 Q148 194 138 192 Q116 176 90 188 Q80 186 84 176 Z" fill={c('sky')} {...S} />
        <path d="M156 176 Q120 164 88 186 Q92 196 102 194 Q124 180 150 188 Q160 184 156 176 Z" fill={c('sky')} {...S} />
        <path d="M108 176 q4 4 0 8 M134 178 q-4 4 0 8" fill="none" {...T} />
      </g>
      {/* Mặt nước cắt ngang thân rồng */}
      <path d="M10 214 Q40 204 70 210 Q100 200 130 208 Q170 200 200 210 Q220 206 230 214 Q206 226 120 226 Q34 226 10 214 Z" fill={c('vn-water')} {...S} />
      <path d="M74 212 h18 M140 214 h20" stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
    </LandmarkSvg>
  )
}
