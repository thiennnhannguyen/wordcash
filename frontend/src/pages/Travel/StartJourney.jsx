/*
 * Biến thể màn đầu tiên cho người dùng mới (bắt đầu A1): linh vật nhà du hành đứng trước nhà mình, cạnh tấm biển gỗ
 * "HÀNH TRÌNH 10.000 TỪ BẮT ĐẦU TỪ ĐÂY"; mini-map toàn bộ 6 vùng đất với đường bay nối các vùng; nút "LÊN ĐƯỜNG".
 * Danh sách vùng đất và tổng số từ do server trả (travelMock.fetchJourneyStart).
 */

import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Flag from '../../components/academy/Flag'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'
import { CONTINENTS, Traveler } from '../Academy/map/MapPieces'
import { Cloud } from '../Academy/map/Props'
import { Pin } from '../../components/academy/LevelHeader'
import { STROKE } from './TravelScenes'

const INK = 'var(--color-ink)'
const c = (t) => `var(--color-${t})`
const L = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' }

// Điểm dừng của 6 vùng đất trên lưới 200×100 (A1 Hà Nội, A2 TP.HCM, B1 London, B2 Bắc Mỹ, C1 Úc, C2 Thế giới)
const STOPS = [
  { x: 158.8, y: 38.3, dy: -5 },
  { x: 159.3, y: 44, dy: 8 },
  { x: 99, y: 20, dy: -5 },
  { x: 46, y: 28, dy: -5 },
  { x: 174, y: 64, dy: 9 },
  { x: 100, y: 86, dy: 9 },
]

function JourneyMap({ regions }) {
  return (
    <svg viewBox="0 0 200 100" className="block w-full rounded-[16px] border-thick border-line bg-map-water" role="img" aria-label={`Hành trình: ${regions.map((r) => `${r.code} ${r.region.name}`).join(' → ')}`}>
      <path d="M0 33 H200 M0 66 H200 M50 0 V100 M100 0 V100 M150 0 V100" stroke={c('white')} strokeWidth="0.6" opacity="0.7" />
      {CONTINENTS.map((d) => (
        <path key={d} d={d} fill={c('map-grass-deep')} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      ))}
      {STOPS.slice(1).map((s, i) => {
        const a = STOPS[i]
        const mx = (a.x + s.x) / 2
        const my = Math.min(a.y, s.y) - (Math.abs(a.x - s.x) > 20 ? 16 : 4)
        return (
          <motion.path
            key={i}
            d={`M${a.x} ${a.y} Q${mx} ${my} ${s.x} ${s.y}`}
            fill="none"
            stroke={c('primary')}
            strokeWidth="1"
            strokeDasharray="2.4 1.8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.25 }}
          />
        )
      })}
      {STOPS.map((s, i) => (
        <g key={i}>
          {i === 0 && <circle cx={s.x} cy={s.y} r="5" fill="none" stroke={c('danger')} strokeWidth="1.4" className="anim-ping" style={{ transformOrigin: 'center', transformBox: 'fill-box' }} />}
          <circle cx={s.x} cy={s.y} r={i === 0 ? 3 : 2.3} fill={i === 0 ? c('danger') : c('surface')} stroke={INK} strokeWidth="1" />
          <g transform={`translate(${s.x + (i === 1 ? 9 : 0)} ${s.y + s.dy})`}>
            <rect x="-6" y="-3.6" width="12" height="7" rx="3.5" fill={c(i === 0 ? 'gold' : 'surface')} stroke={INK} strokeWidth="0.8" />
            <text y="1.6" textAnchor="middle" fontFamily="Chakra Petch, sans-serif" fontWeight="700" fontSize="4.6" fill={INK}>
              {regions[i]?.code}
            </text>
          </g>
        </g>
      ))}
    </svg>
  )
}

function Home() {
  return (
    <svg viewBox="0 0 220 200" className="w-[180px] md:w-[260px]" aria-hidden="true">
      <ellipse cx="116" cy="194" rx="104" ry="8" fill={INK} opacity="0.15" />
      <rect x="30" y="92" width="150" height="100" fill={c('map-stone')} {...L} />
      <path d="M180 92 L206 108 V180 L180 192 Z" fill={c('map-stone-deep')} {...L} />
      <path d="M14 96 L105 30 L196 96 Z" fill={c('vn-tile')} {...L} />
      <path d="M105 30 L196 96 L214 106 L126 34 Z" fill={c('map-roof')} {...L} />
      <rect x="140" y="40" width="18" height="30" fill={c('map-brick')} {...L} />
      <rect x="86" y="130" width="38" height="62" rx="4" fill={c('primary')} {...L} />
      <circle cx="116" cy="162" r="3" fill={c('gold')} />
      <rect x="44" y="114" width="28" height="26" fill={c('sky')} {...L} />
      <path d="M58 114 v26 M44 127 h28" {...L} strokeWidth="2" />
      <rect x="140" y="114" width="28" height="26" fill={c('sky')} {...L} />
      <path d="M154 114 v26 M140 127 h28" {...L} strokeWidth="2" />
      <path d="M40 192 q8 -10 16 0 M156 192 q8 -10 16 0" fill={c('map-grass-shade')} {...L} strokeWidth="2" />
      <circle cx="48" cy="184" r="4" fill={c('danger')} {...L} strokeWidth="1.5" />
      <circle cx="164" cy="184" r="4" fill={c('gold')} {...L} strokeWidth="1.5" />
    </svg>
  )
}

export default function StartJourney({ data, mascot, onStart }) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-map-water" role="dialog" aria-modal="true" aria-label="Hành trình bắt đầu">
      <Cloud width={150} className="anim-drift absolute left-[6%] top-[6%]" />
      <Cloud width={110} className="anim-drift absolute right-[10%] top-[14%] max-md:hidden" style={{ animationDelay: '-6s' }} />
      <div className="absolute inset-x-0 bottom-0 h-[42%] border-t-thick border-line bg-map-grass max-md:h-[64%]" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center gap-6 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-10 md:flex-row md:gap-10 md:px-10">
        {/* Nhà, linh vật, tấm biển */}
        <div className="flex flex-col items-center">
          <motion.div
            className="relative z-10 -mb-3 flex flex-col items-center"
            initial={{ y: -80, rotate: -8, opacity: 0 }}
            animate={{ y: 0, rotate: -3, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.2 }}
          >
            <div className="max-w-[300px] rounded-[12px] border-thick border-line bg-map-wood-light px-5 py-3 text-center shadow-hard md:max-w-[360px]">
              <p className="font-display text-[13px] font-bold uppercase tracking-wide text-ink/70">Hành trình</p>
              <p className="font-display text-[26px] font-bold uppercase leading-tight text-ink md:text-[32px]">{formatNumber(data.totalWords)} từ</p>
              <p className="font-display text-base font-bold uppercase text-ink md:text-lg">bắt đầu từ đây</p>
            </div>
            <span className="h-8 w-3 border-x-thick border-b-thick border-line bg-map-wood" aria-hidden="true" />
          </motion.div>
          <div className="flex items-end">
            <Home />
            <div className="-ml-10 mb-1 md:-ml-14">
              <Traveler mascot={mascot} size={96} />
            </div>
          </div>
        </div>

        {/* Mini-map 6 vùng đất */}
        <motion.section
          className="relative w-full max-w-[520px] rounded-panel border-thick border-line bg-surface p-4 shadow-hard-lg md:p-6"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 240, damping: 22 }}
        >
          <Pin className="-top-2 left-1/2 -translate-x-1/2" />
          <h1 className={cx('mb-1 font-display text-[26px] font-bold uppercase italic leading-none text-gold md:text-[34px]', STROKE)} style={{ '--stroke': '6px', textShadow: '3px 3px 0 var(--color-ink)' }}>
            Vòng quanh thế giới
          </h1>
          <p className="mb-3 text-caption text-muted">6 vùng đất, mỗi cấp một chuyến bay. Thắng Trận Boss cuối mỗi vùng để bay tiếp.</p>
          <JourneyMap regions={data.regions} />
          <ol className="mt-3 grid grid-cols-2 gap-2">
            {data.regions.map((r, i) => (
              <li key={r.code} className={cx('flex min-w-0 items-center gap-2 rounded-[12px] border-2 border-line px-2 py-1.5', i === 0 ? 'bg-gold' : 'bg-raised')}>
                <span className="font-num text-sm">{r.code}</span>
                <Flag code={r.region.flag} width={22} className="shrink-0" />
                <span className="text-[13px] font-semibold leading-tight">{r.region.name}</span>
              </li>
            ))}
          </ol>
          <Button size="lg" iconRight={ArrowRight} fullWidth className="mt-4" onClick={onStart}>
            Lên đường
          </Button>
        </motion.section>
      </div>
    </div>
  )
}
