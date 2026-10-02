/*
 * Một trạm trên bản đồ lộ trình (khóa/mở/hoàn thành).
 *
 * `kind`: "lesson" (tròn), "checkpoint" (hình khiên, cuối chặng), "boss" (to gấp đôi, cam hồng, kiếm chéo).
 * `status`: "done" (xanh chanh, dấu tích, điểm, cờ nhỏ cắm trên trạm) · "current" (tím điện, vòng sáng) · "locked" (xám tím nhạt, ổ khóa).
 * `compact`: bản nhỏ hơn cho mobile (trạm bài 68px, vẫn ≥ 64px để dễ chạm).
 * Trạng thái do server quyết định; component chỉ hiển thị. Bấm vào trạm nào cũng mở popup chi tiết.
 */

import { CheckFat, LockSimple, Play, ShieldStar, Sword } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import cx from '../../utils/cx'

const STATUS_LABEL = { done: 'đã xong', current: 'đang học', locked: 'đã khóa' }

const FILL = {
  done: 'var(--color-accent)',
  current: 'var(--color-primary)',
  locked: 'var(--color-raised)',
}

function ScorePill({ score }) {
  return (
    <span className="font-num rounded-pill border-2 border-line bg-surface px-2.5 text-sm leading-6 shadow-hard-sm">{score}%</span>
  )
}

// Cờ nhỏ cắm trên trạm đã xong
function NodeFlag() {
  return (
    <svg viewBox="0 0 30 40" width="24" height="32" className="pointer-events-none absolute -right-1 -top-6" aria-hidden="true">
      <path d="M4 40 V3" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M5 4 H26 L20 11 L26 18 H5 Z" fill="var(--color-primary)" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  )
}

function LessonNode({ status, compact }) {
  return (
    <span
      className={cx(
        'relative grid place-items-center rounded-pill border-thick transition-transform group-hover:-translate-y-0.5',
        compact ? 'size-[68px]' : 'size-20',
        status === 'locked' ? 'border-line/50 bg-raised' : 'border-line shadow-hard',
        status === 'done' && 'bg-accent',
        status === 'current' && 'anim-beacon bg-primary',
      )}
    >
      <Icon
        icon={status === 'done' ? CheckFat : status === 'current' ? Play : LockSimple}
        size={compact ? 30 : 34}
        color={status === 'current' ? 'white' : status === 'locked' ? 'muted' : 'ink'}
      />
      {status === 'done' && <NodeFlag />}
    </span>
  )
}

function CheckpointNode({ status, compact }) {
  return (
    <span className={cx('relative grid place-items-center transition-transform group-hover:-translate-y-0.5', compact ? 'size-20' : 'size-24')}>
      <svg viewBox="0 0 96 104" className="absolute inset-0 size-full" aria-hidden="true">
        {status !== 'locked' && <path d="M52 8 L90 20 V52 C90 76 72 92 52 100 C32 92 14 76 14 52 V20 Z" fill="var(--color-ink)" />}
        <path
          d="M48 4 L86 16 V48 C86 72 68 88 48 96 C28 88 10 72 10 48 V16 Z"
          fill={FILL[status]}
          stroke="var(--color-ink)"
          strokeOpacity={status === 'locked' ? 0.4 : 1}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <Icon
        icon={status === 'locked' ? LockSimple : ShieldStar}
        size={34}
        color={status === 'current' ? 'white' : status === 'locked' ? 'muted' : 'ink'}
        className="relative -mt-2"
      />
    </span>
  )
}

function BossNode({ status, compact }) {
  return (
    <span
      className={cx(
        'relative grid place-items-center rounded-pill border-thick border-line bg-danger shadow-hard-lg transition-transform group-hover:-translate-y-1',
        compact ? 'size-32' : 'size-40',
        status === 'current' && 'anim-beacon',
      )}
    >
      <span className={cx('grid place-items-center rounded-pill border-thick border-line bg-orange', compact ? 'size-24' : 'size-32')}>
        <Icon icon={Sword} size={compact ? 48 : 64} color="ink" />
      </span>
      {status === 'locked' && (
        <span className="absolute -right-1 -top-1 grid size-11 place-items-center rounded-pill border-thick border-line bg-raised shadow-hard-sm">
          <Icon icon={LockSimple} size={22} color="ink" />
        </span>
      )}
    </span>
  )
}

export default function RoadmapNode({ kind = 'lesson', status, score, label, onClick, compact = false, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} · ${STATUS_LABEL[status]}${score != null ? ` · điểm cao nhất ${score}%` : ''}`}
      className={cx('group relative flex flex-col items-center gap-1.5 rounded-pill outline-offset-4', className)}
    >
      {kind === 'boss' ? (
        <BossNode status={status} compact={compact} />
      ) : kind === 'checkpoint' ? (
        <CheckpointNode status={status} compact={compact} />
      ) : (
        <LessonNode status={status} compact={compact} />
      )}
      {status === 'done' && score != null && kind !== 'boss' && <ScorePill score={score} />}
    </button>
  )
}
