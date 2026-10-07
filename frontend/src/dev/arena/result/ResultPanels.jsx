/*
 * Các khối nội dung của màn kết quả trận.
 *
 * - `Scoreboard`: hai bên avatar, tên, máu còn lại; giữa là "K.O. ở câu 14". Hàng thông số đối chiếu dạng thanh
 *   so sánh 2 phía (câu đúng, tốc độ trung bình, combo cao nhất, tổng sát thương) và biểu đồ đường "Diễn biến máu"
 *   (tím = bạn, cam = đối thủ, sao vàng = chí mạng).
 * - `Rewards`: phần thưởng hiện lần lượt từng ô kiểu game; không có điểm rank.
 * - `WrongWords`: "Từ bạn đã sai" viền hồng, mỗi từ có loa, nghĩa đúng, đáp án chọn nhầm gạch ngang, câu ví dụ.
 *   Mobile là card vuốt ngang.
 * Số liệu do server trả về; component chỉ hiển thị.
 */

import { motion } from 'framer-motion'
import { CalendarCheck, CheckCircle, Fire, Info, Lightning, SpeakerHigh, Star, WarningCircle } from '@phosphor-icons/react'
import Button, { IconButton } from '../../../components/ui/Button'
import Icon, { IconBadge } from '../../../components/ui/Icon'
import MascotBlob from '../../../components/collection/MascotBlob'
import RankBadge from '../../../components/ui/RankBadge'
import cx from '../../../utils/cx'
import { ARENA } from '../../../utils/constants'
import { formatDecimal } from '../../../utils/format'
import { speak } from '../../../utils/speech'
import AddToCoursePopover from '../../../components/courses/AddToCoursePopover'

// ---------- Bảng tỉ số ----------

function Side({ fighter, hp, color, mirrored }) {
  return (
    <div className={cx('flex min-w-0 items-center gap-3', mirrored && 'flex-row-reverse text-right')}>
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[16px] border-thick border-line shadow-hard-sm md:size-20" style={{ background: `var(--color-${color})` }}>
        <MascotBlob color={fighter.mascot.color} shape={fighter.mascot.shape} size={90} shadow={false} className={cx('size-16 translate-y-2 md:size-24', mirrored && '-scale-x-100')} />
      </span>
      <div className={cx('flex min-w-0 flex-col gap-1', mirrored && 'items-end')}>
        <span className="truncate font-display text-lg font-bold uppercase italic leading-none md:text-2xl">{fighter.name}</span>
        <RankBadge rank={fighter.rank} size="sm" className="[&>div:first-child]:size-6 [&>div:first-child]:rounded-[7px] [&>div:first-child]:border-2 [&>div:first-child]:shadow-none [&_svg]:size-3.5 [&_div.text-sm]:whitespace-nowrap [&_div.text-sm]:text-xs max-md:[&>div:last-child]:hidden" />
        <span className={cx('whitespace-nowrap font-num text-2xl leading-none md:text-[40px]', hp === 0 ? 'text-danger-deep' : 'text-ink')}>{hp} HP</span>
      </div>
    </div>
  )
}

function CompareRow({ label, me, opp, format = (v) => v, lowerIsBetter = false, index }) {
  const score = (v) => (lowerIsBetter ? 1 / v : v)
  const max = Math.max(score(me), score(opp)) || 1
  const meBetter = score(me) > score(opp)
  const oppBetter = score(opp) > score(me)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={cx('font-num text-lg', meBetter ? 'text-primary' : 'text-muted')}>{format(me)}</span>
        <span className="hud-label text-center">{label}</span>
        <span className={cx('font-num text-lg', oppBetter ? 'text-[color-mix(in_srgb,var(--color-orange)_70%,var(--color-ink))]' : 'text-muted')}>{format(opp)}</span>
      </div>
      <div className="flex h-4 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-l-pill border-2 border-line bg-raised">
          <motion.span
            className="block h-full bg-primary"
            initial={{ width: 0 }}
            whileInView={{ width: `${(score(me) / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 * index, duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="flex flex-1 overflow-hidden rounded-r-pill border-2 border-line bg-raised">
          <motion.span
            className="block h-full bg-orange"
            initial={{ width: 0 }}
            whileInView={{ width: `${(score(opp) / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 * index, duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}

const CHART = { w: 340, h: 150, padX: 26, padY: 14 }

function HpChart({ series, crits }) {
  const total = series[series.length - 1].round
  const x = (r) => CHART.padX + (r / total) * (CHART.w - CHART.padX - 8)
  const y = (hp) => CHART.padY + ((ARENA.MAX_HP - hp) / ARENA.MAX_HP) * (CHART.h - CHART.padY - 22)
  const points = (side) => series.map((p) => `${x(p.round)},${y(p[side])}`).join(' ')

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-bold uppercase tracking-wider">Diễn biến máu</span>
        <span className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-pill bg-primary" /> Bạn
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-pill bg-orange" /> Đối thủ
          </span>
          <span className="flex items-center gap-1">
            <Icon icon={Star} size={14} color="gold" /> Chí mạng
          </span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} className="h-auto w-full rounded-[16px] border-thick border-line bg-raised" role="img" aria-label="Biểu đồ máu hai bên qua từng câu">
        {[100, 50, 0].map((v) => (
          <g key={v}>
            <line x1={CHART.padX} x2={CHART.w - 8} y1={y(v)} y2={y(v)} stroke="var(--color-ink)" strokeOpacity="0.15" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={CHART.padX - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fontFamily="var(--font-display)" fontWeight="700" fill="var(--color-muted)">
              {v}
            </text>
          </g>
        ))}
        {[1, Math.ceil(total / 2), total].map((r) => (
          <text key={r} x={x(r)} y={CHART.h - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-display)" fontWeight="700" fill="var(--color-muted)">
            C{r}
          </text>
        ))}
        {['opp', 'me'].map((side) => (
          <g key={side}>
            <motion.polyline
              points={points(side)}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="6"
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            <motion.polyline
              points={points(side)}
              fill="none"
              stroke={side === 'me' ? 'var(--color-primary)' : 'var(--color-orange)'}
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </g>
        ))}
        {/* Sao vàng tại điểm trúng chí mạng (trên đường của bên bị trúng) */}
        {crits.map((c) => {
          const target = c.side === 'me' ? 'opp' : 'me'
          const p = series.find((s) => s.round === c.round)
          return (
            <path
              key={c.round}
              transform={`translate(${x(c.round)} ${y(p[target])})`}
              d="M0 -9 L2.6 -2.8 L9 -2.8 L3.9 1.2 L5.8 7.6 L0 3.8 L-5.8 7.6 L-3.9 1.2 L-9 -2.8 L-2.6 -2.8 Z"
              fill="var(--color-gold)"
              stroke="var(--color-ink)"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>
    </figure>
  )
}

export function Scoreboard({ result }) {
  const { stats } = result
  const rows = [
    { label: 'Câu đúng', me: stats.correct.me, opp: stats.correct.opp },
    { label: 'Tốc độ TB', me: stats.avgSeconds.me, opp: stats.avgSeconds.opp, format: (v) => `${formatDecimal(v)}s`, lowerIsBetter: true },
    { label: 'Combo cao nhất', me: stats.bestCombo.me, opp: stats.bestCombo.opp },
    { label: 'Tổng sát thương', me: stats.damage.me, opp: stats.damage.opp },
  ]

  return (
    <section aria-label="Bảng tỉ số" className="flex flex-col gap-6 rounded-panel border-thick border-line bg-surface p-5 shadow-hard-lg md:p-7">
      <div className="grid grid-cols-2 items-center gap-x-3 gap-y-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        <Side fighter={result.me} hp={result.hp.me} color="primary" />
        <div className="order-first col-span-2 flex justify-center md:order-none md:col-span-1">
          <span className="-rotate-2 rounded-[14px] border-thick border-line bg-danger px-4 py-2 font-display text-base font-bold uppercase tracking-wide shadow-hard md:text-xl">
            {result.reason === 'ko' ? `K.O. ở câu ${result.koRound}` : 'Hết 20 câu · So máu'}
          </span>
        </div>
        <Side fighter={result.opp} hp={result.hp.opp} color="orange" mirrored />
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:gap-8">
        <div className="flex flex-col gap-4">
          {rows.map((r, i) => (
            <CompareRow key={r.label} {...r} index={i} />
          ))}
        </div>
        <HpChart series={result.series} crits={result.crits} />
      </div>
    </section>
  )
}

// ---------- Phần thưởng ----------

const REWARD_STYLE = {
  streak: { icon: Fire, bg: 'orange', sub: (r) => `${r.value} trận thắng liên tiếp` },
  week: { icon: CalendarCheck, bg: 'accent', sub: (r) => `${r.value} trận thắng trong tuần` },
  badge: { icon: Lightning, bg: 'gold', sub: (r) => r.detail },
  'streak-lost': { icon: Fire, bg: 'neutral', sub: () => 'Thắng trận tới để bắt đầu chuỗi mới' },
  'week-loss': { icon: CalendarCheck, bg: 'neutral', sub: (r) => `${r.value} trận thua trong tuần` },
}

export function Rewards({ rewards }) {
  return (
    <section aria-label="Phần thưởng" className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {rewards.map((r, i) => {
          const s = REWARD_STYLE[r.kind]
          const badge = r.kind === 'badge'
          return (
            <motion.div
              key={r.kind}
              initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
              whileInView={{ scale: 1, opacity: 1, rotate: badge ? 2 : 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.3 + i * 0.35 }}
              className={cx(
                'flex items-center gap-3 rounded-card border-thick border-line p-4 shadow-hard',
                badge ? 'bg-gold shadow-[4px_4px_0_0_var(--color-line),0_0_20px_4px_color-mix(in_srgb,var(--color-gold)_60%,transparent)]' : 'bg-surface',
              )}
            >
              <IconBadge icon={s.icon} bg={badge ? 'surface' : s.bg} size="lg" shape="square" />
              <div className="flex min-w-0 flex-col">
                {badge && <span className="font-display text-xs font-bold uppercase tracking-wider text-ink/70">Huy hiệu mới</span>}
                <span className="font-display text-lg font-bold uppercase leading-tight">{r.title}</span>
                <span className="text-caption text-ink/70">{s.sub(r)}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
      <p className="flex items-center justify-center gap-2 text-caption font-medium text-muted">
        <Icon icon={Info} size={16} /> Rank chỉ tăng khi thuộc thêm từ ở Học Viện.
      </p>
    </section>
  )
}

// ---------- Từ bạn đã sai ----------

function Example({ sentence, word }) {
  const parts = sentence.split(new RegExp(`(\\b${word}\\w*)`, 'i'))
  return (
    <p className="text-caption italic text-ink/80">
      “
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-[4px] bg-accent px-0.5 font-bold not-italic text-ink">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
      ”
    </p>
  )
}

export function WrongWords({ words, onReview }) {
  return (
    <section aria-label="Từ bạn đã sai" className="flex flex-col gap-4 rounded-panel border-thick border-danger bg-[color-mix(in_srgb,var(--color-danger)_8%,var(--color-surface))] p-5 shadow-hard md:p-7">
      <div className="flex items-center gap-3">
        <IconBadge icon={WarningCircle} bg="danger" size="md" shape="square" />
        <div>
          <h2 className="text-h3 leading-tight">{words.length} từ cần ôn lại</h2>
          <p className="text-caption text-muted">Trận đấu là buổi ôn tập: sai ở đâu, ôn ngay ở đó.</p>
        </div>
      </div>

      <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
        {words.map((w) => (
          <li key={w.word} className="flex w-[82%] shrink-0 snap-center flex-col gap-2 rounded-card border-thick border-line bg-surface p-4 shadow-hard-sm md:w-auto">
            <div className="flex items-center gap-2">
              <IconButton icon={SpeakerHigh} label={`Nghe phát âm ${w.word}`} variant="sky" size="sm" onClick={() => speak(w.word)} />
              <div className="min-w-0 leading-tight">
                <div className="truncate font-display text-xl font-bold">{w.word}</div>
                <div className="text-xs text-muted">{w.ipa}</div>
              </div>
            </div>
            <p className="flex items-center gap-1.5 font-bold">
              <Icon icon={CheckCircle} size={18} color="accent-deep" /> {w.meaning}
            </p>
            <p className="text-caption">
              Bạn chọn: <s className="font-semibold text-danger-deep decoration-2">{w.chose}</s>
            </p>
            <Example sentence={w.example} word={w.word} />
            <AddToCoursePopover word={{ headword: w.word, meaning_vi: w.meaning }} label="Thêm vào khóa học" className="mt-auto pt-1" />
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
        <Button variant="accent" size="lg" icon={Lightning} className="max-md:w-full" onClick={onReview}>
          Ôn {words.length} từ ngay
        </Button>
        <p className="flex items-center gap-1.5 text-caption font-semibold text-ink/80">
          <Icon icon={CheckCircle} size={18} color="accent-deep" /> Đã tự động thêm vào danh sách ôn
        </p>
      </div>
    </section>
  )
}
