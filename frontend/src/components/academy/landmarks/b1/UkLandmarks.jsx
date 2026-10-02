/*
 * Địa danh cuối mỗi chặng, vẽ hoạt hình phẳng cách điệu (viewBox 200×200, chân công trình chạm y = 188).
 * B1 · Vương quốc Anh: Tower Bridge, London Eye, Big Ben (đồng hồ chỉ đúng giờ hiện tại), cung điện Buckingham có lính gác
 * mũ lông gấu, Đại học Oxford, Stonehenge, nhà tắm La Mã ở Bath, lâu đài Edinburgh, cao nguyên Scotland.
 * Cấp chưa có tranh riêng dùng cột mốc chung (`milestone`). Bệ đảo nằm ở LandmarkIsland; registry gọi các tranh này qua `LandmarkArt`.
 * Không dùng ảnh chụp, không vẽ logo hay thương hiệu.
 */

import { useEffect, useState } from 'react'

const INK = 'var(--color-ink)'
const c = (token) => `var(--color-${token})`
const L = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round' }
const thin = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' }

function useNow(interval = 20000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), interval)
    return () => clearInterval(t)
  }, [interval])
  return now
}

// Ô cửa sổ vòm nhỏ
function ArchWindow({ x, y, w = 6, h = 10, fill = 'map-slate' }) {
  return <path d={`M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`} fill={c(fill)} {...thin} />
}

function TowerBridge() {
  const tower = (x) => (
    <g>
      <rect x={x} y="44" width="30" height="134" fill={c('map-stone')} {...L} />
      <path d={`M${x} 44 L${x + 15} 12 L${x + 30} 44 Z`} fill={c('map-slate')} {...L} />
      <path d={`M${x - 2} 44 V30 L${x + 3} 22 L${x + 8} 30 V44 M${x + 22} 44 V30 L${x + 27} 22 L${x + 32} 30 V44`} fill={c('map-slate')} {...thin} />
      <circle cx={x + 15} cy="10" r="2.5" fill={c('gold')} {...thin} />
      <ArchWindow x={x + 11} y={56} w={8} h={14} />
      <ArchWindow x={x + 11} y={84} w={8} h={14} />
      <ArchWindow x={x + 11} y={112} w={8} h={14} />
      <path d={`M${x} 136 H${x + 30}`} {...thin} />
      <rect x={x - 5} y="168" width="40" height="14" rx="3" fill={c('map-stone-deep')} {...L} />
    </g>
  )
  const chain = (d) => (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d={d} fill="none" stroke={c('sky')} strokeWidth="3.5" strokeLinecap="round" />
    </>
  )
  return (
    <>
      <rect x="4" y="160" width="192" height="28" rx="10" fill={c('map-water')} {...L} />
      <path d="M16 174 q6 -4 12 0 M150 178 q6 -4 12 0 M96 182 q6 -4 12 0" fill="none" stroke={c('white')} strokeWidth="2.5" strokeLinecap="round" />
      {chain('M6 142 Q30 136 50 80')}
      {chain('M194 142 Q170 136 150 80')}
      <rect x="4" y="138" width="192" height="12" rx="3" fill={c('map-stone-deep')} {...L} />
      <path d="M100 138 V150" {...thin} />
      {tower(50)}
      {tower(120)}
      <rect x="80" y="54" width="40" height="9" fill={c('sky')} {...L} />
      <rect x="80" y="68" width="40" height="7" fill={c('sky')} {...L} />
      <path d="M86 54 l5 9 l5 -9 l5 9 l5 -9 l5 9 l5 -9" fill="none" {...thin} />
    </>
  )
}

function LondonEye() {
  const capsules = Array.from({ length: 16 }, (_, i) => (i * Math.PI * 2) / 16)
  return (
    <>
      <path d="M100 84 L62 186 M100 84 L138 186" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d="M100 84 L62 186 M100 84 L138 186" stroke={c('white')} strokeWidth="5" strokeLinecap="round" />
      <g className="anim-wheel" style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
        {capsules.map((a) => (
          <path key={a} d={`M100 84 L${100 + Math.cos(a) * 64} ${84 + Math.sin(a) * 64}`} stroke={INK} strokeWidth="1.4" opacity="0.6" />
        ))}
        <circle cx="100" cy="84" r="68" fill="none" stroke={INK} strokeWidth="8" />
        <circle cx="100" cy="84" r="68" fill="none" stroke={c('white')} strokeWidth="4" />
        <circle cx="100" cy="84" r="60" fill="none" stroke={INK} strokeWidth="1.6" />
        {capsules.map((a) => (
          <ellipse key={a} cx={100 + Math.cos(a) * 72} cy={84 + Math.sin(a) * 72} rx="6" ry="5" fill={c('sky')} {...thin} />
        ))}
      </g>
      <circle cx="100" cy="84" r="10" fill={c('danger')} {...L} />
      <circle cx="100" cy="84" r="3.5" fill={c('white')} />
      <rect x="44" y="178" width="112" height="10" rx="3" fill={c('map-stone-deep')} {...L} />
    </>
  )
}

function BigBen() {
  const now = useNow()
  const minutes = now.getMinutes()
  const hourAngle = ((now.getHours() % 12) + minutes / 60) * 30
  const minuteAngle = minutes * 6
  return (
    <>
      {/* Tòa nhà Quốc hội hai bên */}
      <rect x="18" y="140" width="66" height="48" fill={c('map-stone')} {...L} />
      <rect x="116" y="132" width="72" height="56" fill={c('map-stone')} {...L} />
      <path d="M18 140 l6 -10 l6 10 M36 140 l6 -10 l6 10 M54 140 l6 -10 l6 10 M116 132 l6 -10 l6 10 M136 132 l6 -10 l6 10 M156 132 l6 -10 l6 10 M176 132 l6 -10 l6 10" fill={c('map-slate')} {...thin} />
      {[26, 42, 58].map((x) => <ArchWindow key={x} x={x} y={154} w={8} h={14} />)}
      {[126, 144, 162].map((x) => <ArchWindow key={x} x={x} y={146} w={8} h={14} />)}
      {/* Thân tháp */}
      <rect x="80" y="96" width="40" height="92" fill={c('map-stone')} {...L} />
      <path d="M90 102 V184 M100 102 V184 M110 102 V184" stroke={INK} strokeWidth="1.2" opacity="0.3" />
      <ArchWindow x={85} y={120} w={7} h={12} />
      <ArchWindow x={108} y={120} w={7} h={12} />
      <ArchWindow x={85} y={150} w={7} h={12} />
      <ArchWindow x={108} y={150} w={7} h={12} />
      {/* Khối đồng hồ */}
      <rect x="74" y="50" width="52" height="50" fill={c('map-stone-deep')} {...L} />
      <circle cx="100" cy="75" r="19" fill={c('white')} {...L} />
      <circle cx="100" cy="75" r="15" fill="none" stroke={c('gold')} strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M100 59 V62.5" stroke={INK} strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${i * 30} 100 75)`} />
      ))}
      <path d="M100 75 V65" stroke={INK} strokeWidth="3" strokeLinecap="round" transform={`rotate(${hourAngle} 100 75)`} />
      <path d="M100 75 V61" stroke={INK} strokeWidth="2" strokeLinecap="round" transform={`rotate(${minuteAngle} 100 75)`} />
      <circle cx="100" cy="75" r="2.4" fill={INK} />
      {/* Tầng chuông và chóp */}
      <rect x="80" y="32" width="40" height="18" fill={c('map-stone')} {...L} />
      {[84, 95, 106].map((x) => <ArchWindow key={x} x={x} y={35} w={9} h={13} />)}
      <path d="M78 32 L100 2 L122 32 Z" fill={c('map-slate')} {...L} />
      <path d="M86 22 H114 M92 13 H108" stroke={c('gold')} strokeWidth="2.2" />
      <circle cx="100" cy="2" r="3" fill={c('gold')} {...thin} />
    </>
  )
}

function Buckingham() {
  return (
    <>
      {/* Mặt tiền */}
      <rect x="12" y="96" width="176" height="82" fill={c('map-stone')} {...L} />
      <rect x="10" y="90" width="180" height="9" fill={c('map-stone-deep')} {...L} />
      {[0, 1, 2].flatMap((row) =>
        [20, 36, 52, 132, 148, 164].map((x) => <rect key={`${row}-${x}`} x={x} y={106 + row * 22} width="9" height="12" fill={c('map-slate')} {...thin} />),
      )}
      {/* Cổng chính có hàng cột */}
      <path d="M68 92 L100 68 L132 92 Z" fill={c('map-stone')} {...L} />
      <rect x="70" y="92" width="60" height="86" fill={c('map-stone-deep')} {...L} />
      {[76, 90, 104, 118].map((x) => (
        <rect key={x} x={x} y="96" width="6" height="82" fill={c('white')} {...thin} />
      ))}
      {/* Cột cờ */}
      <path d="M100 68 V36" {...L} />
      <rect x="100" y="36" width="24" height="15" fill={c('gold')} {...thin} />
      <path d="M100 36 H112 V51 H100 Z" fill={c('uk-red')} {...thin} />
      {/* Hàng rào mạ vàng */}
      <path d="M6 186 H194 M6 172 H194" {...L} />
      {Array.from({ length: 24 }, (_, i) => (
        <g key={i}>
          <path d={`M${10 + i * 7.8} 170 V186`} {...thin} />
          <circle cx={10 + i * 7.8} cy="169" r="1.8" fill={c('gold')} stroke={INK} strokeWidth="1" />
        </g>
      ))}
      <circle cx="100" cy="176" r="6" fill={c('gold')} {...thin} />
      {/* Chòi gác sọc và lính gác mũ lông gấu */}
      <path d="M146 188 V150 L156 142 L166 150 V188 Z" fill={c('white')} {...L} />
      <path d="M146 160 H166 M146 170 H166 M146 180 H166" stroke={c('uk-red')} strokeWidth="3" />
      <path d="M146 188 V150 L156 142 L166 150 V188 Z" fill="none" {...L} />
      <ellipse cx="180" cy="146" rx="8" ry="13" fill={INK} />
      <circle cx="180" cy="161" r="5.5" fill={c('map-stone')} {...thin} />
      <rect x="173" y="166" width="14" height="14" rx="3" fill={c('uk-red')} {...thin} />
      <path d="M175 180 V188 M185 180 V188" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M173 170 H187" stroke={c('gold')} strokeWidth="1.5" />
      <path d="M190 152 V178" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </>
  )
}

function Oxford() {
  return (
    <>
      {/* Tháp nhọn hai bên ("thành phố của những ngọn tháp mơ màng") */}
      <rect x="156" y="84" width="22" height="104" fill={c('map-stone')} {...L} />
      <path d="M154 84 L167 26 L180 84 Z" fill={c('map-stone-deep')} {...L} />
      <path d="M154 84 V74 M180 84 V74" {...L} />
      <ArchWindow x={163} y={100} w={8} h={16} />
      <rect x="22" y="110" width="20" height="78" fill={c('map-stone')} {...L} />
      <path d="M20 110 L32 64 L44 110 Z" fill={c('map-stone-deep')} {...L} />
      {/* Radcliffe Camera: thân trụ tròn, mái vòm */}
      <rect x="48" y="126" width="104" height="62" fill={c('map-stone')} {...L} />
      {[56, 76, 96, 116, 136].map((x) => <ArchWindow key={x} x={x} y={140} w={9} h={18} />)}
      <path d="M48 162 H152" {...thin} />
      <rect x="44" y="120" width="112" height="8" fill={c('map-stone-deep')} {...L} />
      <rect x="58" y="94" width="84" height="26" fill={c('map-stone')} {...L} />
      {[66, 80, 94, 108, 122, 134].map((x) => (
        <path key={x} d={`M${x} 96 V118`} {...thin} />
      ))}
      <path d="M56 94 Q56 50 100 48 Q144 50 144 94 Z" fill={c('map-slate')} {...L} />
      <path d="M78 92 Q78 58 100 50 M122 92 Q122 58 100 50" fill="none" {...thin} />
      <rect x="91" y="30" width="18" height="18" fill={c('map-stone')} {...L} />
      <path d="M89 30 Q100 16 111 30 Z" fill={c('map-slate')} {...L} />
      <path d="M100 18 V8" {...L} />
      <circle cx="100" cy="7" r="2.6" fill={c('gold')} {...thin} />
    </>
  )
}

function Stonehenge() {
  const upright = (x, base, h, w) => <rect x={x} y={base - h} width={w} height={h} rx="3" fill={c('map-rock')} {...L} />
  const lintel = (x0, x1, y, h) => <rect x={x0} y={y} width={x1 - x0} height={h} rx="2" fill={c('map-rock-deep')} {...L} />
  return (
    <>
      <ellipse cx="100" cy="166" rx="94" ry="24" fill={c('map-grass-deep')} {...L} />
      {/* Hàng sau */}
      {upright(38, 150, 46, 14)}
      {upright(62, 150, 46, 14)}
      {lintel(34, 80, 100, 9)}
      {upright(90, 146, 50, 14)}
      {upright(114, 146, 50, 14)}
      {lintel(86, 132, 92, 9)}
      {upright(142, 150, 46, 14)}
      {upright(166, 150, 46, 14)}
      {lintel(138, 184, 100, 9)}
      {/* Hàng trước */}
      {upright(18, 184, 58, 18)}
      {upright(48, 184, 58, 18)}
      {lintel(12, 72, 118, 11)}
      <rect x="86" y="168" width="36" height="14" rx="4" fill={c('map-rock')} {...L} transform="rotate(-8 104 175)" />
      {upright(134, 184, 58, 18)}
      {upright(164, 184, 58, 18)}
      {lintel(128, 188, 118, 11)}
      <path d="M24 136 H30 M140 140 H146 M54 150 H60" stroke={INK} strokeWidth="1.4" opacity="0.4" />
    </>
  )
}

function Bath() {
  return (
    <>
      {/* Tu viện phía sau */}
      <rect x="28" y="64" width="144" height="58" fill={c('map-stone')} {...L} />
      <path d="M28 64 l8 -10 l8 10 M156 64 l8 -10 l8 10" fill={c('map-stone-deep')} {...thin} />
      <rect x="84" y="22" width="32" height="44" fill={c('map-stone')} {...L} />
      <path d="M84 22 V12 M116 22 V12 M100 22 V14" {...L} />
      <ArchWindow x={92} y={32} w={16} h={26} />
      <ArchWindow x={40} y={76} w={12} h={22} />
      <ArchWindow x={148} y={76} w={12} h={22} />
      {/* Hàng cột quanh hồ, tượng nhỏ trên lan can */}
      <rect x="16" y="112" width="168" height="8" fill={c('map-stone-deep')} {...L} />
      {[26, 48, 70, 92, 114, 136, 158].map((x) => (
        <g key={x}>
          <rect x={x} y="120" width="8" height="24" fill={c('white')} {...thin} />
          <circle cx={x + 4} cy="106" r="3.5" fill={c('map-stone-deep')} {...thin} />
        </g>
      ))}
      <rect x="12" y="142" width="176" height="46" rx="8" fill={c('map-stone-deep')} {...L} />
      <rect x="22" y="148" width="156" height="34" rx="5" fill={c('nessie')} {...L} />
      <path d="M36 162 q6 -4 12 0 M112 170 q6 -4 12 0 M150 158 q6 -4 12 0" fill="none" stroke={c('white')} strokeWidth="2.5" strokeLinecap="round" />
      {/* Hơi nước từ suối nóng */}
      <g className="anim-steam" fill="none" stroke={c('white')} strokeWidth="3.5" strokeLinecap="round">
        <path d="M60 146 q-6 -8 0 -16 q6 -8 0 -16" />
        <path d="M100 146 q-6 -8 0 -16 q6 -8 0 -16" style={{ animationDelay: '-1s' }} />
        <path d="M140 146 q-6 -8 0 -16 q6 -8 0 -16" style={{ animationDelay: '-2s' }} />
      </g>
    </>
  )
}

function Edinburgh() {
  return (
    <>
      {/* Khối núi đá (núi lửa đã tắt) */}
      <path d="M2 188 L18 140 L40 118 L70 110 L130 108 L166 116 L186 146 L198 188 Z" fill={c('map-rock-deep')} {...L} />
      <path d="M30 150 L52 128 M150 136 L172 160 M84 150 L96 126 M120 170 L132 144" {...thin} opacity="0.55" />
      {/* Tường thành có lỗ châu mai */}
      <path d="M36 112 V84 H44 V78 H52 V84 H60 V78 H68 V84 H76 V78 H84 V84 H130 V78 H138 V84 H146 V78 H154 V84 H164 V112 Z" fill={c('map-stone-deep')} {...L} />
      {[46, 64, 140, 152].map((x) => (
        <rect key={x} x={x} y="92" width="6" height="10" fill={c('map-slate')} {...thin} />
      ))}
      {/* Pháo đài tròn */}
      <path d="M24 114 V70 H30 V64 H38 V70 H46 V64 H54 V70 H60 V114 Z" fill={c('map-stone')} {...L} />
      {/* Tháp chính */}
      <path d="M86 84 V38 H92 V32 H100 V38 H108 V32 H116 V38 H122 V84 Z" fill={c('map-stone')} {...L} />
      <ArchWindow x={98} y={50} w={10} h={16} />
      <path d="M104 32 V10" {...L} />
      <rect x="104" y="10" width="22" height="14" fill={c('flag-blue')} {...thin} />
      <path d="M104 10 L126 24 M126 10 L104 24" stroke={c('white')} strokeWidth="2.2" />
      <rect x="104" y="10" width="22" height="14" fill="none" {...thin} />
    </>
  )
}

function Highlands() {
  return (
    <>
      <path d="M40 150 L100 22 L170 150 Z" fill={c('map-heather')} {...L} />
      <path d="M100 22 L118 60 L106 56 L96 66 L86 54 Z" fill={c('map-snow')} {...L} />
      <path d="M0 170 L52 66 L112 170 Z" fill={c('map-heather')} {...L} />
      <path d="M52 66 L66 94 L56 90 L48 98 L40 90 Z" fill={c('map-snow')} {...L} />
      <path d="M92 170 L156 52 L200 150 L200 170 Z" fill={c('map-heather')} {...L} />
      <path d="M156 52 L170 80 L160 76 L152 84 L144 76 Z" fill={c('map-snow')} {...L} />
      <path d="M52 66 L80 170 M156 52 L140 170" stroke={INK} strokeWidth="1.2" opacity="0.25" />
      {/* Thác nước */}
      <path d="M168 96 Q164 130 170 168" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <path d="M168 96 Q164 130 170 168" fill="none" stroke={c('sky')} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M0 188 V168 Q60 156 100 164 Q150 172 200 160 V188 Z" fill={c('map-grass-shade')} {...L} />
      {[20, 42, 128, 150, 184].map((x, i) => (
        <circle key={x} cx={x} cy={176 + (i % 2) * 5} r="3" fill={c('primary')} opacity="0.45" />
      ))}
      {/* Bò lông dài vùng cao nguyên */}
      <g transform="translate(64 150)">
        <ellipse cx="4" cy="37" rx="26" ry="3" fill={INK} opacity="0.15" />
        <path d="M-14 24 V36 M-4 26 V36 M12 26 V36 M22 24 V36" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M-20 10 Q-18 -2 0 0 Q22 -2 26 10 Q30 24 20 28 Q2 32 -14 28 Q-24 24 -20 10 Z" fill={c('orange')} {...L} />
        <path d="M-30 0 Q-38 -6 -36 -14 M-14 0 Q-6 -6 -8 -14" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M-30 0 Q-38 -6 -36 -14 M-14 0 Q-6 -6 -8 -14" fill="none" stroke={c('map-stone')} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M-32 6 Q-32 -6 -22 -4 Q-12 -6 -12 6 Q-12 18 -22 18 Q-32 18 -32 6 Z" fill={c('orange')} {...L} />
        <path d="M-30 2 Q-26 8 -22 2 Q-18 8 -14 2" fill={c('map-wood')} {...thin} />
        <ellipse cx="-22" cy="13" rx="5" ry="3.5" fill={c('map-stone')} {...thin} />
      </g>
    </>
  )
}

function Milestone({ number = 1 }) {
  return (
    <>
      <rect x="62" y="176" width="76" height="12" rx="3" fill={c('map-stone-deep')} {...L} />
      <path d="M72 176 V76 Q72 50 100 50 Q128 50 128 76 V176 Z" fill={c('white')} {...L} />
      <path d="M72 88 V76 Q72 50 100 50 Q128 50 128 76 V88 Z" fill={c('flag-red')} {...L} />
      <text x="100" y="140" textAnchor="middle" fontFamily="Chakra Petch, sans-serif" fontWeight="700" fontSize="40" fill={INK}>
        {number}
      </text>
      <path d="M58 188 q4 -8 8 0 M134 188 q4 -8 8 0" fill={c('map-grass-shade')} {...thin} />
    </>
  )
}

const ART = {
  tower_bridge: TowerBridge,
  london_eye: LondonEye,
  big_ben: BigBen,
  buckingham: Buckingham,
  oxford: Oxford,
  stonehenge: Stonehenge,
  bath: Bath,
  edinburgh: Edinburgh,
  highlands: Highlands,
  milestone: Milestone,
}

// Vị trí đỉnh để cắm cờ tím khi đã chinh phục (theo viewBox 200×200)
export const FLAG_TOPS = {
  tower_bridge: [65, 10],
  london_eye: [100, 12],
  big_ben: [122, 132],
  buckingham: [36, 90],
  oxford: [32, 64],
  stonehenge: [100, 92],
  bath: [100, 12],
  edinburgh: [42, 64],
  highlands: [100, 22],
  milestone: [128, 60],
}

export function LandmarkArt({ kind, size, number }) {
  const Art = ART[kind] ?? Milestone
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} overflow="visible" aria-hidden="true">
      <Art number={number} />
    </svg>
  )
}
