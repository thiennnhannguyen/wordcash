/*
 * Thang rank: 8 huy hiệu nối bằng một đường; rank đã qua có màu, rank hiện tại phóng to và phát sáng, rank sau còn xám.
 * Thanh tiến độ tới rank tiếp theo. Khi rank lung lay: huy hiệu nứt có viền hồng nhấp nháy, banner đếm ngược
 * "Còn … · Cần gỡ lại … từ" và nút "ÔN NGAY" (đếm ngược từ số giây server trả, không dùng giờ máy). Mobile: thang cuộn ngang,
 * tự cuộn tới rank hiện tại. Mốc số từ của từng rank đọc từ luật server (GET /public/stats); chưa tải xong thì ẩn con số.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightning, Warning } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { IconBadge } from '../../components/ui/Icon'
import cx from '../../utils/cx'
import { RANKS, RANK_BY_KEY } from '../../utils/constants'
import { formatNumber } from '../../utils/format'
import RankEmblem from '../../components/ui/RankEmblem'
import useCountdown from '../../hooks/useCountdown'
import { Skeleton } from '../../components/ui/DataState'
import { rankMin, useRules } from '../../store/rulesStore'

function ClockBox({ value, label }) {
  return (
    <span className="flex flex-col items-center">
      <span className="grid h-12 w-11 place-items-center rounded-[12px] border-thick border-line bg-surface font-num text-2xl shadow-hard-sm md:h-14 md:w-13 md:text-[28px]">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 font-display text-[13px] font-bold uppercase text-muted">{label}</span>
    </span>
  )
}

function ShakyBanner({ shaky, rankName }) {
  const navigate = useNavigate()
  const [deadline] = useState(() => Date.now() + shaky.secondsLeft * 1000)
  const t = useCountdown(deadline)
  return (
    <div className="flex flex-col gap-4 rounded-card border-thick border-danger bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface))] p-4 md:flex-row md:items-center md:gap-6 md:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconBadge icon={Warning} bg="danger" size="md" shape="square" className="anim-wobble" />
        <div className="min-w-0">
          <p className="font-heading text-lg font-extrabold leading-tight md:text-xl">Rank đang lung lay</p>
          <p className="font-medium text-muted">
            Còn <span className="font-num text-ink">{t.days}</span> ngày <span className="font-num text-ink">{t.hours}</span> giờ · Cần gỡ lại{' '}
            <span className="font-num text-danger-deep">{shaky.wordsNeeded}</span> từ để giữ {rankName}
          </p>
        </div>
      </div>
      <div className="flex items-start justify-center gap-1.5" role="timer" aria-label={`Còn ${t.days} ngày ${t.hours} giờ ${t.minutes} phút`}>
        <ClockBox value={t.days} label="Ngày" />
        <span className="pt-2.5 font-num text-2xl">:</span>
        <ClockBox value={t.hours} label="Giờ" />
        <span className="pt-2.5 font-num text-2xl">:</span>
        <ClockBox value={t.minutes} label="Phút" />
        <span className="pt-2.5 font-num text-2xl">:</span>
        <ClockBox value={t.seconds} label="Giây" />
      </div>
      <Button variant="danger" icon={Lightning} onClick={() => navigate('/academy/review')} className="shrink-0">
        Ôn ngay
      </Button>
    </div>
  )
}

export default function RankLadder({ rank, masteredWords, shaky }) {
  const scrollRef = useRef(null)
  const currentRef = useRef(null)
  const { rules } = useRules()
  const index = RANKS.findIndex((r) => r.key === rank)
  const next = RANKS[index + 1]
  const current = RANK_BY_KEY[rank]
  const nextMin = next ? rankMin(rules, next.key) : null

  // Mobile: cuộn tới rank hiện tại
  useEffect(() => {
    const box = scrollRef.current
    const el = currentRef.current
    if (box && el) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2
  }, [rank])

  const goal = shaky ? { name: current.name, target: shaky.threshold } : next && nextMin != null ? { name: next.name, target: nextMin } : null
  const ratio = goal ? Math.min(masteredWords / goal.target, 1) : 1

  return (
    <section className="flex flex-col gap-5 rounded-panel border-thick border-line bg-surface p-4 shadow-hard md:p-6">
      <h2 className="text-h3">Thang rank</h2>

      <div ref={scrollRef} className="-mx-4 overflow-x-auto px-4 pb-2 pt-3 md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <ol className="relative flex w-max min-w-full items-start justify-between gap-3 [--inset:2rem] md:w-full md:gap-0 md:[--inset:2.5rem]">
          {/* Đường nối: phần đã qua tô đậm */}
          <span className="absolute left-(--inset) right-(--inset) top-7 h-2.5 rounded-pill border-2 border-line bg-neutral md:top-9" aria-hidden="true" />
          <span
            className="absolute left-(--inset) top-7 h-2.5 rounded-pill border-2 border-line bg-accent md:top-9"
            style={{ width: `calc((100% - var(--inset) * 2) * ${index / (RANKS.length - 1)})` }}
            aria-hidden="true"
          />
          {RANKS.map((r, i) => {
            const state = i < index ? 'done' : i === index ? (shaky ? 'shaky' : 'current') : 'locked'
            const isCurrent = i === index
            return (
              <li key={r.key} ref={isCurrent ? currentRef : undefined} className="relative flex w-16 flex-col items-center gap-1.5 md:w-20" aria-current={isCurrent ? 'step' : undefined}>
                <span className="grid h-16 place-items-center md:h-20">
                  <RankEmblem rank={r.key} state={state} className={isCurrent ? 'size-16 md:size-20' : 'size-10 md:size-13'} />
                </span>
                <span className={cx('text-center font-display text-[13px] font-bold uppercase leading-tight', i > index ? 'text-muted' : 'text-ink', isCurrent && 'text-sm')}>{r.name}</span>
                {rules ? (
                  <span className="font-num text-[13px] text-muted">{formatNumber(rankMin(rules, r.key))}</span>
                ) : (
                  <Skeleton className="h-4 w-10" />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {goal && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-heading font-extrabold">
              {shaky ? `Giữ ${goal.name}` : goal.name}:{' '}
              <span className="font-num">
                {formatNumber(masteredWords)} / {formatNumber(goal.target)}
              </span>
            </p>
            <p className={cx('font-display text-sm font-bold uppercase tracking-wide', shaky ? 'text-danger-deep' : 'text-muted')}>
              {shaky ? 'Thiếu' : 'Còn'} <span className="font-num">{formatNumber(goal.target - masteredWords)}</span> từ
            </p>
          </div>
          <div className="h-5 overflow-hidden rounded-pill border-thick border-line bg-raised">
            <div className={cx('h-full border-r-thick border-line', shaky ? 'bg-danger' : 'bg-accent')} style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>
      )}

      {shaky && <ShakyBanner shaky={shaky} rankName={current.name} />}
    </section>
  )
}
