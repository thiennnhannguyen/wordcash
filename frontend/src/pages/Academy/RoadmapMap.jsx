/*
 * Bản đồ lộ trình A1–C2 dạng các trạm, chọn nhánh Nền tảng/IELTS/TOEIC.
 *
 * Chủ đề "Hộ chiếu vòng quanh thế giới": mỗi cấp là một vùng đất vẽ minh họa (B1 · Vương quốc Anh), cuộn dọc và
 * đi từ DƯỚI LÊN TRÊN; mỗi chặng kết thúc ở một địa danh, Trận Boss ở đỉnh bản đồ. Vùng chưa mở bị sương mù che.
 * Thanh tab cấp, card tóm tắt và cột widget nổi trên bản đồ như giấy ghim; mobile thu thành một thanh trên cùng và
 * hai nút tròn ở góc dưới. Tọa độ tính theo bề rộng thật của khung (xem map/layout.js).
 * Dữ liệu từ GET /academy/roadmap + GET /me/stats (useAcademyMap.js); mở/khóa, điểm, con dấu, Hộ chiếu luôn do server quyết định.
 * Đang tải: nền bản đồ trống; lỗi: thông báo + Thử lại.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { animate } from 'framer-motion'
import {
  Article,
  BookOpenText,
  CaretDown,
  Clock,
  Lightbulb,
  LockSimple,
  Play,
  ShieldStar,
  Stamp,
  SpeakerHigh,
  Sword,
  Target,
  AirplaneTilt,
  Compass as CompassIcon,
} from '@phosphor-icons/react'
import NavBar from '../../components/layout/NavBar'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import ProgressBar from '../../components/ui/ProgressBar'
import ProgressRing from '../../components/ui/ProgressRing'
import Sticker from '../../components/ui/Sticker'
import RoadmapNode from '../../components/academy/RoadmapNode'
import Flag from '../../components/academy/Flag'
import { BranchSwitch, LevelSummary, LevelTabs, Pin } from '../../components/academy/LevelHeader'
import useMediaQuery from '../../hooks/useMediaQuery'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { formatDayMonth, formatNumber } from '../../utils/format'
import { speak } from '../../utils/speech'
import { goalMessage } from '../../utils/dailyGoal'
import { percent, useRules } from '../../store/rulesStore'
import { useAuthStore } from '../../store/authStore'
import { useMascot } from '../../store/mascotStore'
import { BRANCHES } from './map/decor'
import useAcademyMap from './useAcademyMap'
import { ErrorState } from '../../components/ui/DataState'
import { buildLayout, pointAt, travelerSpot } from './map/layout'
import Terrain from './map/Terrain'
import Fog from './map/Fog'
import BossScene from './map/BossScene'
import { FLAG_TOPS } from '../../components/academy/landmarks/b1/UkLandmarks'
import StageLandmark, { stageLandmarkMetrics } from '../../components/academy/landmarks/StageLandmark'
import { getLandmark } from '../../components/academy/landmarks/landmarkRegistry'
import { Cloud } from './map/Props'
import Passport from './map/Passport'
import { Compass, PlantedFlag, Signpost, SpeechBubble, StageRibbon, Traveler, VisitedStamp, WorldMiniMap } from './map/MapPieces'

/** Ngưỡng qua bài / Trận Boss (%) theo luật server; chưa tải xong thì null (câu chữ bỏ con số). */
function usePassPercents() {
  const { rules } = useRules()
  return rules ? { lesson: percent(rules.unit_pass_rate), boss: percent(rules.boss_pass_rate) } : { lesson: null, boss: null }
}
const WALK_MS = 1200
const LOCKED_CLOUDS = [
  [4, 8, 150],
  [58, 4, 190],
  [30, 26, 120],
  [76, 30, 160],
  [2, 52, 180],
  [44, 70, 150],
  [80, 64, 130],
  [18, 84, 170],
  [64, 88, 140],
]

function stageStatus(stage) {
  if (stage.visit.status === 'visited') return 'done'
  if (stage.visit.status === 'target') return 'current'
  return 'locked'
}

function Rays({ size }) {
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} className="anim-spin-slow pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0 L-10 -100 L10 -100 Z" transform={`rotate(${i * 30})`} fill="var(--color-gold)" opacity="0.35" />
      ))}
    </svg>
  )
}

/**
 * Địa danh cuối chặng: tranh trên bệ đảo (StageLandmark), băng rôn chặng; cờ tím và con dấu "ĐÃ ĐẾN" khi đã chinh phục.
 * Tranh B1 có tia sáng xoay khi đang hướng tới; tranh mới có quầng sáng và nhún nhẹ (trong LandmarkIsland).
 */
function Landmark({ lm, mobile, ribbonWidth }) {
  const { stage, size } = lm
  const visit = stage.visit.status
  const state = visit === 'visited' ? 'done' : visit === 'target' ? 'current' : 'locked'
  const entry = getLandmark(stage.landmark_key)
  const legacy = !stage.landmark_image && (!entry || entry.legacy)
  const m = stageLandmarkMetrics({ landmarkKey: stage.landmark_key, px: size })
  const flagTop = FLAG_TOPS[entry ? stage.landmark_key : 'milestone'] ?? [100, 20]
  const flagH = mobile ? 30 : 38
  return (
    <div
      className={cx('pointer-events-none absolute', state === 'locked' ? 'z-10' : 'z-30')}
      style={{ left: lm.x, top: lm.y }}
      role="img"
      aria-label={`${stage.landmark_name} · chặng ${stage.number} ${stage.title} · ${visit === 'visited' ? 'đã đến' : visit === 'target' ? 'đang hướng tới' : 'chưa khám phá'}`}
    >
      {state === 'current' && legacy && (
        <div className="absolute" style={{ left: 0, top: -size * 0.5 }}>
          <Rays size={size * 1.5} />
        </div>
      )}
      <div className="absolute" style={{ left: -m.w / 2, top: -m.anchorY }}>
        <StageLandmark landmarkKey={stage.landmark_key} image={stage.landmark_image} name={stage.landmark_name} number={stage.number} px={size} state={state} />
      </div>
      {state === 'done' && (
        // Tranh cũ: cờ cắm trên nóc; tranh mới: cờ cắm cạnh địa danh, trên mặt đảo phía ngoài
        <div
          className="absolute"
          style={
            legacy
              ? { left: -size / 2 + (flagTop[0] / 200) * size - 3, top: -size * 0.94 + (flagTop[1] / 200) * size - flagH + 2 }
              : { left: lm.side * m.w * 0.4 - 4, top: -flagH + 4 }
          }
        >
          <PlantedFlag height={flagH} />
        </div>
      )}
      {state === 'done' && (
        <div className="absolute" style={{ left: -lm.side * size * 0.52 - (mobile ? 35 : 39), top: -size * 0.98 }}>
          <VisitedStamp date={formatDayMonth(stage.visit.visited_at)} size={mobile ? 70 : 78} tilt={lm.side > 0 ? -14 : 12} />
        </div>
      )}
      <div className="absolute" style={{ left: -ribbonWidth / 2 + lm.side * 6, top: lm.ribbonY - lm.y, opacity: state === 'locked' ? 0.55 : 1 }}>
        <StageRibbon stage={stage} status={stageStatus(stage)} width={ribbonWidth} mobile={mobile} />
      </div>
    </div>
  )
}

function StationPopup({ row, level, nextLevel, onClose }) {
  const pass = usePassPercents()
  const navigate = useNavigate()
  if (!row) return null

  const locked = row.status === 'locked'
  let title
  let meta
  let requirement
  let primary
  let secondary = null

  if (row.kind === 'lesson') {
    title = `Bài ${row.item.number} · ${row.item.title}`
    meta = `Chặng ${row.stage.number} · ${row.stage.title} · ${row.item.words} từ${row.item.phrases != null ? ` · ${row.item.phrases} cụm từ` : ''}`
    requirement = pass.lesson == null
      ? (locked ? 'Hoàn thành bài trước để mở bài này.' : 'Qua bài kiểm tra cuối bài để mở bài tiếp.')
      : locked ? `Hoàn thành bài trước với ít nhất ${pass.lesson}% để mở bài này.` : `Cần ${pass.lesson}% ở bài kiểm tra cuối bài để mở bài tiếp.`
    primary = { label: row.status === 'done' ? 'Học lại' : 'Học', icon: Play, to: `/academy/lesson?unit=${row.item.id}` }
    secondary = { label: 'Kiểm tra cuối bài', icon: ShieldStar, to: `/academy/unit-test?unit=${row.item.id}` }
  } else if (row.kind === 'checkpoint') {
    title = `Kiểm tra chặng ${row.stage.number} · ${row.stage.title}`
    meta = `Tổng hợp mọi bài trong chặng · Qua bài để đặt chân tới ${row.stage.landmark_name}`
    requirement = locked ? 'Hoàn thành mọi bài trong chặng để mở bài kiểm tra.' : 'Đạt bài kiểm tra để mở chặng tiếp theo.'
    primary = { label: 'Làm bài kiểm tra', icon: ShieldStar, to: `/academy/unit-test?topic=${row.stage.topicId ?? row.stage.id}` }
  } else {
    title = `Trận Boss ${level.code} · ${row.item.landmark_name}`
    meta = `Khoảng ${row.item.questions} câu trộn từ cả cấp`
    requirement = locked ? 'Vượt mọi chặng của cấp để mở Trận Boss.' : `${pass.boss != null ? `Cần ${pass.boss}%` : 'Thắng'} để bay tới ${nextLevel ? `${nextLevel.code} · ${nextLevel.region.short}` : 'cấp tiếp theo'}.`
    if (row.item.cooldown?.retry_at) requirement = `Luyện các chặng yếu hoặc chờ tới ${new Date(row.item.cooldown.retry_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} để đánh lại.`
    primary = { label: 'Vào Trận Boss', icon: Sword, to: `/academy/boss?level=${level.code}` }
  }

  const best = row.item?.best

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          {secondary && (
            <Button variant="secondary" icon={secondary.icon} disabled={secondary.disabled || locked} onClick={() => navigate(secondary.to)}>
              {secondary.label}
            </Button>
          )}
          <Button icon={locked ? LockSimple : primary.icon} disabled={locked} onClick={() => navigate(primary.to)}>
            {locked ? 'Đang khóa' : primary.label}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-ink">
        <p className="font-medium text-muted">{meta}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[16px] border-thick border-line bg-raised p-3">
            <div className="hud-label">Điểm cao nhất</div>
            <div className="font-num text-2xl">{best != null ? `${best}%` : '—'}</div>
          </div>
          <div className="rounded-[16px] border-thick border-line bg-raised p-3">
            <div className="hud-label">Trạng thái</div>
            <div className="font-display text-lg font-bold uppercase">{row.status === 'done' ? 'Đã xong' : row.status === 'current' ? 'Đang mở' : 'Đang khóa'}</div>
          </div>
        </div>
        <p className={cx('flex items-start gap-2 text-caption font-semibold', locked ? 'text-danger-deep' : 'text-ink')}>
          <Icon icon={locked ? LockSimple : Target} size={18} className="mt-0.5 shrink-0" />
          {requirement}
        </p>
        {row.kind === 'lesson' && (
          // Chế độ "Trong ngữ cảnh" (đoạn đọc + câu hỏi hiểu bài) chưa có backend: chỉ giữ nút, vô hiệu
          <div className="relative">
            <Button variant="secondary" icon={Article} fullWidth disabled>
              Học trong ngữ cảnh
            </Button>
            <span className="absolute -right-2 -top-3 rotate-6 rounded-pill border-2 border-line bg-gold px-2 py-0.5 font-display text-[13px] font-bold uppercase shadow-hard-sm">
              Sắp ra mắt
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ---------------- Card nổi (widget) ----------------

function PaperCard({ children, className, pin = 'danger' }) {
  return (
    <section className={cx('pointer-events-auto relative rounded-card border-thick border-line bg-surface p-4 shadow-hard', className)}>
      <Pin className="-top-2 left-6" color={pin} />
      {children}
    </section>
  )
}

function FactCard({ fact, tip, className }) {
  if (!fact) {
    return (
      <PaperCard className={cx('flex flex-col gap-2 bg-raised pt-5', className)} pin="sky">
        <Sticker bg="gold" tilt={5} size="sm" icon={Lightbulb} className="absolute -top-4 right-4">
          Bí kíp
        </Sticker>
        <h2 className="font-heading text-lg font-extrabold leading-tight">Mẹo học nhanh</h2>
        <p className="text-caption font-medium text-ink/80">{tip}</p>
      </PaperCard>
    )
  }
  return (
    <PaperCard className={cx('flex flex-col gap-2.5 pt-5', className)} pin="sky">
      <Sticker bg="gold" tilt={5} size="sm" icon={Lightbulb} className="absolute -top-4 right-4">
        Bạn có biết?
      </Sticker>
      <p className="text-caption font-medium text-ink">{fact.text}</p>
      <div className="flex flex-wrap gap-2">
        {fact.words.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => speak(w)}
            aria-label={`Nghe phát âm ${w}`}
            className="pressable inline-flex h-11 items-center gap-1.5 rounded-pill border-thick border-line bg-raised px-3 font-display text-sm font-bold shadow-hard-sm"
          >
            <Icon icon={SpeakerHigh} size={16} color="primary" />
            {w}
          </button>
        ))}
      </div>
    </PaperCard>
  )
}

function SideWidgets({ data, map }) {
  const navigate = useNavigate()
  return (
    <>
      <PaperCard className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IconBadge icon={Clock} bg="sky" size="md" shape="square" />
          <div>
            <h2 className="font-heading text-lg font-extrabold leading-tight">Đến hạn ôn</h2>
            <p className="font-num text-2xl leading-none">{data.dueReviews} từ</p>
          </div>
        </div>
        <Button variant="sky" icon={BookOpenText} fullWidth onClick={() => navigate('/academy/review')}>
          Ôn ngay
        </Button>
      </PaperCard>

      <PaperCard className="flex items-center gap-4" pin="accent">
        <ProgressRing value={Math.min(data.dailyGoal.learned, data.dailyGoal.target)} max={data.dailyGoal.target} size={80} stroke={11} tone="accent" label="Mục tiêu từ mới hôm nay">
          <div className="leading-none">
            <div className="font-num text-xl">{data.dailyGoal.learned}</div>
            <div className="font-num text-[13px] text-muted">/{data.dailyGoal.target}</div>
          </div>
        </ProgressRing>
        <div>
          <h2 className="font-heading text-lg font-extrabold leading-tight">Mục tiêu hôm nay</h2>
          <p className="text-caption text-muted">
            {goalMessage({ learned: data.dailyGoal.learned, goal: data.dailyGoal.target })}
          </p>
        </div>
      </PaperCard>

      <PaperCard pin="gold">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
          <Icon icon={Stamp} size={20} color="primary" />
          Hộ chiếu
        </h2>
        <Passport map={map} />
      </PaperCard>

      <FactCard fact={map.fact} tip={data.tip} />
    </>
  )
}

function MobileBar({ map, levels, levelCode, branch, onSelectLevel, onBranch }) {
  const [open, setOpen] = useState(false)
  const { level, region, summary } = map
  return (
    <div className="pointer-events-auto relative rounded-[20px] border-thick border-line bg-surface shadow-hard">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 p-2.5 pr-3 text-left">
        <span
          className={cx('grid size-12 shrink-0 place-items-center rounded-[14px] border-thick border-line font-num text-lg', ['C1', 'C2'].includes(level.code) ? 'text-white' : 'text-ink')}
          style={{ background: `var(--color-level-${level.code.toLowerCase()})` }}
        >
          {level.code}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-heading text-base font-extrabold uppercase leading-tight">{region.name}</span>
            <Flag code={region.flag} width={24} className="shrink-0" />
          </span>
          {map.locked ? (
            <span className="block font-num text-[13px] uppercase text-muted">Đang khóa</span>
          ) : (
            <>
              <span className="block font-num text-[13px] uppercase text-muted">
                Chặng {summary.stageCurrent}/{summary.stageTotal} · {formatNumber(summary.mastered)}/{formatNumber(summary.total)} từ đã qua bài
              </span>
              <ProgressBar value={summary.mastered} max={Math.max(summary.total, 1)} size="sm" label="Từ trong các bài đã qua" className="mt-1 [&>div]:h-2.5" />
            </>
          )}
        </span>
        <span className={cx('grid size-11 shrink-0 place-items-center rounded-pill border-thick border-line bg-raised transition-transform', open && 'rotate-180')}>
          <Icon icon={CaretDown} size={20} />
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t-thick border-line px-3 pb-3 pt-1">
          <LevelTabs
            levels={levels}
            size="sm"
            selected={levelCode}
            onSelect={(l) => {
              onSelectLevel(l)
              if (l.status !== 'locked') setOpen(false)
            }}
          />
          <BranchSwitch branches={BRANCHES} value={branch} onChange={onBranch} className="w-full" />
        </div>
      )}
    </div>
  )
}

function Fab({ icon, label, bg, badge, onClick }) {
  return (
    <button type="button" onClick={onClick} className="pointer-events-auto flex flex-col items-center gap-1" aria-label={label}>
      <span className="pressable relative grid size-16 place-items-center rounded-pill border-thick border-line shadow-hard" style={{ background: `var(--color-${bg})` }}>
        <Icon icon={icon} size={30} color={bg === 'primary' ? 'white' : 'ink'} />
        {badge != null && (
          <span className="font-num absolute -right-1.5 -top-1.5 grid h-7 min-w-7 place-items-center rounded-pill border-2 border-line bg-danger px-1 text-[13px] text-white">{badge}</span>
        )}
      </span>
      <span className="whitespace-nowrap rounded-pill border-2 border-line bg-surface px-2 font-display text-[13px] font-bold uppercase leading-6">{label}</span>
    </button>
  )
}

// ---------------- Tấm bản đồ ----------------

function World({ map, layout, onOpen, cloudRef, walk }) {
  const pass = usePassPercents()
  const myMascot = useMascot(useAuthStore((st) => st.user?.avatar_mascot_id))
  const { nodes, landmarks, signs, mobile, sizes, clouds } = layout
  const current = layout.current
  const target = walk?.to
  const walkedLen = walk ? target.len : current?.len ?? layout.road.length
  const openLen = current?.len ?? layout.road.length

  // Vị trí nhà du hành: đứng yên cạnh trạm hiện tại, hoặc bước dọc con đường khi đang đi
  const travelerRef = useRef(null)
  const spot = current ? travelerSpot(current, layout.cx) : null
  useEffect(() => {
    if (!walk || !travelerRef.current) return undefined
    const from = travelerSpot(walk.from, layout.cx)
    const to = travelerSpot(walk.to, layout.cx)
    const el = travelerRef.current
    const controls = animate(0, 1, {
      duration: WALK_MS / 1000,
      ease: 'easeInOut',
      onUpdate: (t) => {
        const p = pointAt(layout.road, from.len + (to.len - from.len) * t)
        const dir = from.dir + (to.dir - from.dir) * t
        const off = walk.from.size / 2 + 40
        el.style.left = `${p.x + dir * off * (t < 0.15 || t > 0.85 ? 1 : 0.35)}px`
        el.style.top = `${p.y + walk.from.size / 2 - 2}px`
      },
    })
    return () => controls.stop()
  }, [walk, layout])

  return (
    <div className="relative" style={{ width: layout.width, height: layout.height }}>
      <Terrain layout={layout} walkedLen={walkedLen} openLen={openLen} animateWalk={Boolean(walk)} />

      {/* Biển chỉ đường (desktop) */}
      {signs.map((sg) => {
        const locked = sg.node.status === 'locked'
        return (
          <div
            key={sg.node.item.id}
            className={cx('pointer-events-none absolute', locked ? 'z-10' : 'z-30')}
            style={{ left: sg.x, top: sg.y - 22, transform: sg.dir < 0 ? 'translateX(-100%)' : undefined }}
          >
            <Signpost text={`Bài ${sg.node.item.number} · ${sg.node.item.title}`} dir={sg.dir} dim={locked} />
          </div>
        )
      })}

      {landmarks.map((lm) => (
        <Landmark key={lm.stage.id} lm={lm} mobile={mobile} ribbonWidth={sizes.ribbon} />
      ))}

      {/* Trạm bị khóa nằm dưới lớp sương */}
      {nodes
        .filter((n) => n.kind !== 'boss')
        .map((n) => (
          <div
            key={`${n.kind}-${n.stage.id}-${n.item.id ?? 'cp'}`}
            className={cx('absolute flex flex-col items-center', n.status === 'locked' ? 'z-10' : 'z-30')}
            style={{ left: n.x - n.size / 2, top: n.y - n.size / 2, width: n.size }}
          >
            <RoadmapNode
              kind={n.kind}
              status={n.status}
              score={n.item.best}
              compact={mobile}
              label={n.kind === 'checkpoint' ? `Kiểm tra chặng ${n.stage.number} · ${n.stage.title}` : `Bài ${n.item.number} · ${n.item.title}`}
              onClick={() => onOpen(n)}
            />
          </div>
        ))}

      <div className="pointer-events-none absolute inset-0 z-20">
        <Fog width={layout.width} height={layout.height} fogY={walk ? (target.y + (layout.nodes[layout.nodes.indexOf(target) + 1] ?? target).y) / 2 : layout.fogY} levelCode={map.level.code} />
      </div>

      <div className="absolute inset-x-0 top-0 z-[25]">
        <BossScene layout={layout} map={map} />
      </div>
      {nodes
        .filter((n) => n.kind === 'boss')
        .map((n) => (
          <div key="boss" className="absolute z-30 flex flex-col items-center gap-2" style={{ left: n.x - n.size / 2, top: n.y - n.size / 2, width: n.size }}>
            <RoadmapNode kind="boss" status={n.status} compact={mobile} label={`Trận Boss ${map.level.code} · ${map.boss.landmark_name}`} onClick={() => onOpen(n)} />
            <span className="font-num -mt-1 whitespace-nowrap rounded-pill border-thick border-line bg-gold px-3 py-1 text-[13px] uppercase shadow-hard-sm md:text-sm">
              Trận Boss{pass.boss != null && ` · Cần ${pass.boss}%`}
            </span>
          </div>
        ))}

      {/* Nhà du hành */}
      {spot && (
        <div
          ref={travelerRef}
          className="pointer-events-none absolute z-40"
          style={{ left: spot.x, top: spot.y }}
          aria-hidden="true"
        >
          <div className="absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center gap-2">
            {!walk && <SpeechBubble>Bắt đầu</SpeechBubble>}
            <Traveler mascot={myMascot} size={mobile ? 62 : 80} walking={Boolean(walk)} facing={walk ? 1 : spot.dir} />
          </div>
        </div>
      )}

      {/* Mây tiền cảnh trôi chậm (parallax) */}
      <div ref={cloudRef} className="pointer-events-none absolute inset-0 z-50 will-change-transform" aria-hidden="true">
        {clouds.map((cl, i) => (
          <div key={i} className="absolute" style={{ left: cl.x, top: cl.y }}>
            <div className="anim-drift" style={{ animationDelay: `${cl.delay}s` }}>
              <Cloud width={130 * cl.scale} rain={cl.rain} style={{ opacity: 0.92 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RoadmapMap() {
  const navigate = useNavigate()
  const pushToast = useToastStore((state) => state.push)
  const [params, setParams] = useSearchParams()
  const branch = params.get('branch') ?? 'core'
  const demo = params.get('demo')
  const [progress, setProgress] = useState(params.get('fog') === 'after' ? 1 : 0)
  const academy = useAcademyMap(params.get('level'))
  const { levels: LEVELS, sidebar: SIDEBAR } = academy
  const levelCode = academy.currentCode
  const map = academy.map
  const [openRow, setOpenRow] = useState(null)
  const [passportOpen, setPassportOpen] = useState(params.get('passport') === '1')
  const [walk, setWalk] = useState(null)

  const mobile = !useMediaQuery('(min-width: 768px)')
  const wide = useMediaQuery('(min-width: 1280px)')
  const scrollerRef = useRef(null)
  const cloudRef = useRef(null)
  const [box, setBox] = useState({ width: 0, height: 0 })

  // Gắn lại khi bản đồ vừa tải xong (lúc đang tải chưa có khung cuộn)
  const hasMap = Boolean(map)
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(() => setBox({ width: el.clientWidth, height: el.clientHeight }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMap])

  const topPad = mobile ? 150 : wide ? 320 : 340
  const bottomPad = mobile ? 230 : 150
  const theme = map?.region?.theme ?? 'generic'
  const layout = useMemo(() => {
    if (!box.width || !map || map.locked) return null
    return buildLayout(map, { width: box.width, roadLeft: 0, roadRight: wide ? box.width - 360 : box.width, mobile, topPad, bottomPad, theme })
  }, [map, box.width, wide, mobile, topPad, bottomPad, theme])

  // Mở màn: cuộn để trạm hiện tại nằm giữa phần bản đồ nhìn thấy (không bị thanh trên, nút nổi che)
  const scrolledFor = useRef(null)
  useLayoutEffect(() => {
    const el = scrollerRef.current
    const key = `${levelCode}-${branch}-${box.width}`
    if (!layout || !el || scrolledFor.current === key) return
    scrolledFor.current = key
    const visibleTop = mobile ? 100 : 230
    const visibleBottom = mobile ? 170 : 40
    const center = (visibleTop + (box.height - visibleBottom)) / 2
    el.scrollTop = layout.current ? layout.current.y - center : 0
  }, [layout, levelCode, branch, box, mobile])

  // Mây tiền cảnh trôi nhanh hơn mặt đất một chút khi cuộn
  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (cloudRef.current && el) cloudRef.current.style.transform = `translate3d(0, ${-el.scrollTop * 0.22}px, 0)`
  }, [])
  useEffect(onScroll, [layout, onScroll])

  // Xem thử "hoàn thành bài": nhà du hành đi sang trạm mới, sương mù tan một đoạn.
  // Bản thật: server chấm bài rồi trả bản đồ mới; client chỉ diễn hoạt cảnh.
  const completeLesson = useCallback(() => {
    if (!layout?.current || walk) return
    const path = layout.nodes.filter((n) => n.kind !== 'boss')
    const next = path[path.indexOf(layout.current) + 1]
    if (!next) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setProgress((p) => p + 1)
      return
    }
    setWalk({ from: layout.current, to: next })
    setTimeout(() => {
      setWalk(null)
      setProgress((p) => p + 1)
      pushToast({ variant: 'success', title: 'Đã mở trạm mới', message: `Bài ${next.item.number} · ${next.item.title}` })
    }, WALK_MS + 50)
  }, [layout, walk, pushToast])

  useEffect(() => {
    if (demo !== 'walk' || !layout || progress > 0) return undefined
    const t = setTimeout(completeLesson, 1500)
    return () => clearTimeout(t)
  }, [demo, layout, progress, completeLesson])

  const selectLevel = (level) => {
    if (level.status === 'locked') {
      const prev = LEVELS[LEVELS.indexOf(level) - 1]
      pushToast(level.comingSoon
        ? { variant: 'info', title: `${level.code} sắp ra mắt`, message: 'Kho từ của cấp này đang được biên soạn.' }
        : { variant: 'info', title: `${level.code} đang khóa`, message: `Vượt Trận Boss ${prev.code} để bay tới ${level.code}.` })
      return
    }
    setProgress(0)
    setParams({ level: level.code, ...(branch !== 'core' && { branch }) })
  }
  const setBranch = (key) => setParams({ level: levelCode, ...(key !== 'core' && { branch: key }) })

  if (!map) {
    return (
      <div className="min-h-dvh">
        <NavBar />
        <main className="grid min-h-dvh place-items-center bg-map-grass md:pl-64" aria-busy={academy.loading}>
          {academy.error && (
            <div className="rounded-card border-thick border-line bg-surface px-6 shadow-hard">
              <ErrorState title="Chưa tải được bản đồ" message={academy.error.message} onRetry={academy.reload} />
            </div>
          )}
        </main>
      </div>
    )
  }
  // Nhánh IELTS / TOEIC chưa có kho từ
  const branchSoon = branch !== 'core'
  // Onboarding chọn "Làm bài xếp lớp": tạm vào A1 kèm thông báo
  const placementSoon = params.get('placement') === 'soon'

  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="md:pl-64">
        <div className="relative h-dvh overflow-hidden bg-map-grass">
          <div ref={scrollerRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            <h1 className="sr-only">
              Bản đồ lộ trình {map.level.code} · {map.region.name}
            </h1>
            {layout && !branchSoon && <World map={map} layout={layout} onOpen={setOpenRow} cloudRef={cloudRef} walk={walk} />}
            {branchSoon && (
              <div className="relative grid min-h-full place-items-center px-4 pb-40 pt-40">
                <div className="relative flex max-w-md flex-col items-center gap-4 rounded-card border-thick border-line bg-surface p-8 text-center shadow-hard">
                  <Pin className="-top-2 left-1/2 -translate-x-1/2" />
                  <IconBadge icon={AirplaneTilt} bg="gold" size="xl" />
                  <h2 className="text-[26px] uppercase">Nhánh {BRANCHES.find((b) => b.key === branch)?.label} · Sắp ra mắt</h2>
                  <p className="text-muted">Lộ trình riêng cho kỳ thi đang được biên soạn. Trong lúc chờ, học nhánh Nền tảng nhé: tiến độ từng từ dùng chung cho mọi nhánh.</p>
                  <Button onClick={() => setBranch('core')}>Về nhánh Nền tảng</Button>
                </div>
              </div>
            )}
            {map.locked && (
              <div className="relative grid min-h-full place-items-center px-4 pb-40 pt-40">
                {/* Vùng đất chìm trong mây */}
                <div className="pointer-events-none absolute inset-0 bg-map-fog" aria-hidden="true">
                  {LOCKED_CLOUDS.map(([x, y, w], i) => (
                    <Cloud key={i} width={w} className="anim-drift absolute" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-i * 2.3}s` }} />
                  ))}
                </div>
                <div className="relative flex max-w-md flex-col items-center gap-4 rounded-card border-thick border-line bg-surface p-8 text-center shadow-hard">
                  <Pin className="-top-2 left-1/2 -translate-x-1/2" />
                  <IconBadge icon={AirplaneTilt} bg="primary" size="xl" />
                  <h2 className="flex items-center gap-2 text-[26px] uppercase">
                    {map.level.code} · {map.region.name}
                    <Flag code={map.region.flag} width={36} />
                  </h2>
                  <p className="text-muted">
                    {map.comingSoon
                      ? 'Vùng đất này sắp ra mắt: kho từ của cấp đang được biên soạn.'
                      : `Vùng đất này vẫn chìm trong mây. Vượt Trận Boss của cấp trước để lên máy bay tới ${map.region.name}.`}
                  </p>
                  <span className="font-num inline-flex items-center gap-2 rounded-pill border-thick border-line bg-raised px-3 py-1 text-sm uppercase">
                    <Icon icon={LockSimple} size={16} /> Đang khóa
                  </span>
                </div>
              </div>
            )}
          </div>

          {placementSoon && (
            <div role="status" className="absolute inset-x-3 bottom-[calc(170px+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-lg items-center gap-3 rounded-card border-thick border-line bg-gold p-3 shadow-hard md:bottom-auto md:top-40">
              <IconBadge icon={CompassIcon} bg="surface" size="md" />
              <p className="flex-1 text-caption font-semibold">Bài xếp lớp sắp ra mắt. Bạn bắt đầu từ A1 nhé, học nhanh thì qua bài nhanh!</p>
              <Button size="sm" variant="secondary" onClick={() => setParams({})}>
                Đã hiểu
              </Button>
            </div>
          )}

          {/* Desktop, tablet: thanh tab và card tóm tắt nổi trên bản đồ */}
          <div className={cx('pointer-events-none absolute left-4 top-4 z-[60] hidden flex-col gap-3 md:flex lg:left-6', wide ? 'right-[372px]' : 'right-4 lg:right-6')}>
            <div className="pointer-events-auto relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card border-thick border-line bg-surface px-4 pb-1 shadow-hard">
              <Pin className="-top-2 right-8" color="gold" />
              <LevelTabs levels={LEVELS} selected={levelCode} onSelect={selectLevel} size="sm" />
              <BranchSwitch branches={BRANCHES} value={branch} onChange={setBranch} className="my-2" />
            </div>
            {!map.locked && <LevelSummary level={map.level} region={map.region} summary={map.summary} className="pointer-events-auto" />}
          </div>

          {/* Mobile: thanh nổi trên cùng */}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[60] md:hidden">
            <MobileBar map={map} levels={LEVELS} levelCode={levelCode} branch={branch} onSelectLevel={selectLevel} onBranch={setBranch} />
          </div>

          {/* Cột widget bên phải (≥ 1280px) */}
          {wide && !map.locked && (
            <aside aria-label="Tiện ích học tập" className="pointer-events-none absolute bottom-0 right-0 top-0 z-[60] w-[360px] overflow-y-auto px-5 pb-6 pt-6 [scrollbar-width:none]">
              <div className="flex flex-col gap-6">
                <SideWidgets data={SIDEBAR} map={map} />
              </div>
            </aside>
          )}

          {/* La bàn và bản đồ thế giới thu nhỏ (góc dưới trái) */}
          {!mobile && !map.locked && (
            <div className="pointer-events-none absolute bottom-5 left-5 z-[60] flex items-end gap-3" aria-label="Bản đồ hành trình">
              <Compass size={84} />
              <div className="relative rounded-[18px] border-thick border-line bg-surface p-2 shadow-hard">
                <Pin className="-top-2 left-1/2 -translate-x-1/2" color="primary" />
                <WorldMiniMap current={map.region.flag} className="block h-[88px] w-[176px] rounded-[10px] border-2 border-line" />
              </div>
            </div>
          )}

          {/* Mobile, tablet: hai nút tròn nổi ở góc dưới */}
          {!wide && !map.locked && (
            <div className="pointer-events-none absolute bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-[60] flex items-end gap-3 md:bottom-6">
              <Fab icon={Stamp} label="Hộ chiếu" bg="gold" onClick={() => setPassportOpen(true)} />
              <Fab icon={BookOpenText} label={`Ôn ${SIDEBAR.dueReviews} từ`} bg="sky" badge={SIDEBAR.dueReviews} onClick={() => navigate('/academy/review')} />
            </div>
          )}

          {import.meta.env.DEV && demo === 'walk' && layout?.current && !walk && (
            <div className="absolute bottom-6 left-1/2 z-[60] hidden -translate-x-1/2 md:block">
              <Button variant="secondary" size="sm" icon={Play} onClick={completeLesson}>
                Xem thử: hoàn thành bài
              </Button>
            </div>
          )}
        </div>
      </main>

      {openRow && <StationPopup row={openRow} level={map.level} nextLevel={map.nextLevel} onClose={() => setOpenRow(null)} />}

      {!map.locked && (
        <Modal open={passportOpen} onClose={() => setPassportOpen(false)} title="Hộ chiếu" mobileSheet>
          <div className="flex flex-col gap-6">
            <Passport map={map} />
            <div>
              <h3 className="hud-label mb-2">Đường bay vòng quanh thế giới</h3>
              <WorldMiniMap current={map.region.flag} className="block w-full rounded-[14px] border-thick border-line" />
            </div>
            <FactCard fact={map.fact} tip={SIDEBAR.tip} className="mt-2" />
          </div>
        </Modal>
      )}
    </div>
  )
}
