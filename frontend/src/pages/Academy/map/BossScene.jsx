/*
 * Đỉnh bản đồ: Trận Boss và sân bay sang cấp kế tiếp.
 *
 * B1: Hồ Loch Ness giữa núi đồi Scotland. Quái vật hồ là khối tròn xanh ngọc cổ dài, đeo kính râm, thò lên rồi lặn
 * xuống mỗi 6 giây. Trạm Boss (vẽ ở lớp trạm) nổi trên bè gỗ giữa hồ, có cầu tàu nối với con đường.
 * Cấp có tranh đảo Boss riêng (A1 Vịnh Hạ Long có Rồng Vịnh, A2 Cầu Vàng có Bàn Tay Núi) vẽ đảo lớn gấp 1.5 lần
 * ngay sau trạm Boss (StageLandmark size="boss"). Cấp còn lại dùng hồ chung với linh vật quái vật.
 * Trên cùng là sân bay nhỏ, máy bay tím chờ sẵn và biển
 * "CỬA RA MÁY BAY → cấp kế tiếp" (khóa cho tới khi thắng Boss).
 * Cảnh có nền đục phủ kín bề ngang để che lớp sương mù phía dưới.
 */

import { LockSimple, AirplaneTakeoff } from '@phosphor-icons/react'
import Icon from '../../../components/ui/Icon'
import MascotBlob from '../../../components/collection/MascotBlob'
import cx from '../../../utils/cx'
import { seeded } from './layout'
import { Puffs, puffBand } from './Fog'
import StageLandmark, { stageLandmarkMetrics } from '../../../components/academy/landmarks/StageLandmark'

const INK = 'var(--color-ink)'
const c = (token) => `var(--color-${token})`
const L = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' }

// Đường cong khép kín mềm đi qua các điểm (dùng trung điểm và đường cong bậc hai)
function smoothClosed(points) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const n = points.length
  const start = mid(points[n - 1], points[0])
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`
  points.forEach((p, i) => {
    const m = mid(p, points[(i + 1) % n])
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`
  })
  return `${d}Z`
}

function lakePath(lake, rng) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    const k = 0.9 + rng() * 0.16
    return [lake.cx + Math.cos(a) * lake.rx * k, lake.y + Math.sin(a) * lake.ry * k]
  })
  return smoothClosed(pts)
}

function Mountains({ width, baseY, height, rng }) {
  const peaks = []
  const count = Math.max(4, Math.round(width / 150))
  for (let i = -1; i <= count; i++) {
    const w = (width / count) * (1.3 + rng() * 0.5)
    const x = (i + 0.5) * (width / count) + (rng() - 0.5) * 40
    const h = height * (0.65 + rng() * 0.35)
    peaks.push({ x, w, h })
  }
  return peaks.map((p, i) => {
    const top = baseY - p.h
    const snow = p.h * 0.28
    return (
      <g key={i}>
        <path d={`M${p.x - p.w / 2} ${baseY} L${p.x} ${top} L${p.x + p.w / 2} ${baseY} Z`} fill={c(i % 2 ? 'map-heather' : 'map-rock')} {...L} />
        <path d={`M${p.x} ${top} L${p.x + p.w / 2} ${baseY} L${p.x + p.w * 0.12} ${baseY} Z`} fill={INK} opacity="0.08" />
        <path
          d={`M${p.x} ${top} L${p.x + (p.w / 2) * (snow / p.h)} ${top + snow} L${p.x + 4} ${top + snow - 6} L${p.x - 6} ${top + snow} L${p.x - (p.w / 2) * (snow / p.h)} ${top + snow} Z`}
          fill={c('map-snow')}
          {...L}
        />
      </g>
    )
  })
}

/** Quái vật hồ Loch Ness: cổ dài, kính râm, vẻ thách thức. */
function Nessie({ size }) {
  return (
    <svg viewBox="0 0 140 130" width={size} height={(size * 130) / 140} overflow="visible" aria-hidden="true">
      <defs>
        <clipPath id="nessie-water">
          <rect x="-20" y="-40" width="180" height="140" />
        </clipPath>
      </defs>
      {/* Gợn sóng quanh chỗ nhô lên */}
      <ellipse className="anim-ripple" cx="52" cy="100" rx="40" ry="8" fill="none" stroke={c('white')} strokeWidth="3" />
      <g clipPath="url(#nessie-water)">
        <g className="anim-nessie">
          {/* Bướu lưng */}
          <path d="M84 100 Q96 76 108 100 Z" fill={c('nessie')} {...L} />
          <path d="M110 100 Q118 86 126 100 Z" fill={c('nessie')} {...L} />
          {/* Cổ và đầu */}
          <path d="M34 100 C30 70 36 44 52 32 C60 26 74 26 80 34 C86 42 80 52 70 52 C60 52 56 60 58 100 Z" fill={c('nessie')} {...L} />
          <path d="M44 96 C42 76 44 60 50 50" fill="none" stroke={c('white')} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
          <circle cx="50" cy="30" r="4" fill={c('nessie')} {...L} />
          <circle cx="62" cy="26" r="4" fill={c('nessie')} {...L} />
          {/* Kính râm */}
          <path d="M50 38 H84" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M56 37 H68 Q68 47 61 47 Q55 47 56 37 Z M72 37 H84 Q84 47 77 47 Q71 47 72 37 Z" fill={INK} />
          <path d="M59 40 l3 -2 M75 40 l3 -2" stroke={c('white')} strokeWidth="2" strokeLinecap="round" />
          {/* Nhếch mép */}
          <path d="M70 50 Q76 51 80 46" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="54" cy="46" rx="4" ry="2.5" fill={c('danger')} opacity="0.5" />
        </g>
      </g>
      <path d="M8 100 Q24 94 40 100 M68 100 Q84 94 100 100 M110 101 Q120 97 132 101" fill="none" stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Plane({ width }) {
  return (
    <svg viewBox="0 0 160 70" width={width} height={(width * 70) / 160} overflow="visible" aria-hidden="true">
      <ellipse cx="84" cy="66" rx="64" ry="4" fill={INK} opacity="0.16" />
      <path d="M40 40 L76 40 L60 62 L48 62 Z" fill={c('primary')} {...L} />
      <path d="M22 36 L10 12 L24 12 L44 34 Z" fill={c('primary')} {...L} />
      <path d="M14 34 H130 Q152 34 152 44 Q152 52 130 52 H24 Q10 52 12 42 Z" fill={c('white')} {...L} />
      <path d="M130 34 Q152 34 152 44 H134 Z" fill={c('primary')} {...L} />
      {[42, 56, 70, 84, 98, 112].map((x) => (
        <circle key={x} cx={x} cy="42" r="3.2" fill={c('sky')} {...L} strokeWidth="1.6" />
      ))}
      <path d="M14 47 H140" stroke={c('primary')} strokeWidth="4" />
      <path d="M70 46 L96 46 L84 26 L76 26 Z" fill={c('primary')} {...L} />
      <path d="M40 52 V60 M120 52 V60" {...L} />
      <circle cx="40" cy="62" r="3.5" fill={INK} />
      <circle cx="120" cy="62" r="3.5" fill={INK} />
    </svg>
  )
}

export default function BossScene({ layout, map }) {
  const { width, lake, pier, airport, bossZoneY, mobile, bossIsland } = layout
  const rng = seeded(`${map.level.code}-lake`)
  const path = lake ? lakePath(lake, rng) : null
  const mountainBase = lake ? lake.y - lake.ry * 0.55 : bossIsland.y - bossIsland.art * 0.55
  const runwayW = Math.min(width * (mobile ? 0.8 : 0.55), 520)
  const locked = map.boss.status === 'locked'
  const nessieSize = mobile ? 96 : 140
  const nessieX = lake ? lake.cx + (mobile ? 0.52 : 0.55) * lake.rx : 0
  const bossState = map.boss.status === 'done' ? 'done' : map.boss.status === 'current' ? 'current' : 'done'
  const raftW = mobile ? 150 : 196
  const bossY = layout.nodes.find((n) => n.kind === 'boss').y

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: bossZoneY + 40 }} aria-hidden="true">
      <svg width={width} height={bossZoneY + 40} className="absolute inset-0" overflow="visible">
        {/* Nền đục: đồng cỏ cao nguyên, mép dưới là dải mây nối với sương mù */}
        <rect width={width} height={bossZoneY} fill={c('map-grass')} />
        <Mountains width={width} baseY={mountainBase} height={mobile ? 120 : 170} rng={rng} />
        <rect y={mountainBase} width={width} height={bossZoneY - mountainBase} fill={c('map-grass-deep')} />
        <path d={`M0 ${mountainBase} H${width}`} {...L} />

        {/* Sân bay */}
        <g transform={`translate(${airport.x} ${airport.y})`}>
          <rect x={-runwayW / 2 + 5} y={-18} width={runwayW} height={44} rx="10" fill={INK} opacity="0.15" />
          <rect x={-runwayW / 2} y={-22} width={runwayW} height={44} rx="10" fill={c('map-runway')} {...L} />
          <path d={`M${-runwayW / 2 + 22} 0 H${runwayW / 2 - 22}`} stroke={c('white')} strokeWidth="4" strokeDasharray="16 12" />
          <g transform={`translate(${-runwayW / 2 + (mobile ? 22 : 34)} -26)`}>
            <rect x="-9" y="-44" width="18" height="46" fill={c('map-stone')} {...L} />
            <path d="M-16 -44 H16 L12 -62 H-12 Z" fill={c('sky')} {...L} />
            <path d="M-14 -66 H14" {...L} />
          </g>
        </g>

        {/* Hồ */}
        {lake && (
          <>
        <path d={path} fill={INK} opacity="0.14" transform="translate(6 6)" />
        <path d={path} fill={c('map-water-deep')} {...L} strokeWidth="2.6" />
        <path
          className="anim-shimmer"
          d={`M${lake.cx - lake.rx * 0.6} ${lake.y - lake.ry * 0.35} h60 M${lake.cx + lake.rx * 0.1} ${lake.y - lake.ry * 0.55} h44 M${lake.cx - lake.rx * 0.45} ${lake.y + lake.ry * 0.45} h52 M${lake.cx + lake.rx * 0.35} ${lake.y + lake.ry * 0.3} h40`}
          stroke={c('white')}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="18 10"
        />
          </>
        )}

        {/* Lâu đài đổ nát bên bờ hồ */}
        {!mobile && lake && (
          <g transform={`translate(${lake.cx - lake.rx - 10} ${lake.y - lake.ry * 0.2})`}>
            <path d="M-26 0 V-34 H-20 V-40 H-14 V-34 H-8 V-40 H-2 V-34 H4 V0 Z" fill={c('map-rock')} {...L} />
            <path d="M4 0 V-18 H22 V-12 H30 V0 Z" fill={c('map-rock-deep')} {...L} />
            <rect x="-16" y="-24" width="6" height="10" rx="3" fill={INK} />
          </g>
        )}

        {/* Cầu tàu và bè gỗ */}
        <g>
          <rect x={pier.x - 16} y={bossY + (mobile ? 48 : 62)} width="32" height={pier.y - bossY - (mobile ? 40 : 56)} fill={c('map-wood-light')} {...L} />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M${pier.x - 16} ${bossY + (mobile ? 58 : 74) + i * 12} h32`} stroke={INK} strokeWidth="1.4" opacity="0.5" />
          ))}
          {lake && <g transform={`translate(${pier.x} ${bossY + (mobile ? 30 : 40)})`}>
            <rect x={-raftW / 2 + 5} y="-18" width={raftW} height="44" rx="8" fill={INK} opacity="0.18" />
            <rect x={-raftW / 2} y="-22" width={raftW} height="44" rx="8" fill={c('map-wood')} {...L} />
            {[-0.3, 0, 0.3].map((k) => (
              <path key={k} d={`M${(k * raftW)} -22 V22`} stroke={INK} strokeWidth="1.6" />
            ))}
          </g>}
        </g>

        {/* Dải mây dưới chân cao nguyên, nối vào lớp sương phía dưới */}
        <g transform={`translate(0 ${bossZoneY + 6})`}>
          <Puffs puffs={puffBand(width, seeded(`${map.level.code}-boss-band`), 14)} />
        </g>
      </svg>

      {/* Đảo Boss (Hạ Long, Cầu Vàng): luôn hiện đầy màu để người học thấy đích đến */}
      {bossIsland && (
        <div className="absolute" style={{ left: bossIsland.x - stageLandmarkMetrics({ landmarkKey: map.boss.landmark_key, px: bossIsland.px, size: 'boss' }).w / 2, top: bossIsland.y - stageLandmarkMetrics({ landmarkKey: map.boss.landmark_key, px: bossIsland.px, size: 'boss' }).anchorY }}>
          <StageLandmark landmarkKey={map.boss.landmark_key} image={map.boss.landmark_image} name={map.boss.landmark_name} px={bossIsland.px} size="boss" state={bossState} />
        </div>
      )}

      {/* Quái vật hồ */}
      {lake && (
      <div className={cx('absolute', locked && 'saturate-[0.85]')} style={{ left: nessieX - nessieSize * 0.37, top: lake.y - nessieSize * 0.62 }}>
        {map.boss.scene === 'loch_ness' ? (
          <Nessie size={nessieSize} />
        ) : (
          <MascotBlob color="danger" shape="round" size={nessieSize * 0.7} monster className="anim-float" />
        )}
      </div>
      )}

      {/* Máy bay và biển cửa ra máy bay */}
      <div className="absolute" style={{ left: airport.x + runwayW / 2 - (mobile ? 128 : 190), top: airport.y - (mobile ? 50 : 72) }}>
        <Plane width={mobile ? 120 : 176} />
      </div>
      {map.nextLevel && (
        <div
          className="absolute flex -translate-x-1/2 flex-col items-center"
          style={{ left: mobile ? airport.x + 50 : airport.x - 60, top: airport.y - (mobile ? 128 : 92) }}
        >
          <div
            className={cx(
              'flex items-center gap-2 rounded-[10px] border-thick border-line px-3 py-1.5 font-display text-[13px] font-bold uppercase leading-tight shadow-hard-sm md:text-sm',
              locked ? 'bg-gold text-ink' : 'bg-accent text-ink',
            )}
          >
            <Icon icon={locked ? LockSimple : AirplaneTakeoff} size={18} />
            <span className="whitespace-nowrap">
              Cửa ra máy bay
              <br />→ {map.nextLevel.code} · {map.nextLevel.region.short}
            </span>
          </div>
          <div className="flex w-16 justify-between">
            <span className="h-5 w-1.5 border-x-2 border-b-2 border-line bg-map-wood" />
            <span className="h-5 w-1.5 border-x-2 border-b-2 border-line bg-map-wood" />
          </div>
        </div>
      )}
    </div>
  )
}
