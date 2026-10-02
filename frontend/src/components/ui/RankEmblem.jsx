/*
 * Huy hiệu rank dạng khiên cho trang Hồ sơ.
 *
 * `state`: "done" (rank đã qua, đầy màu) · "current" (rank hiện tại, có quầng sáng) · "locked" (rank sau, xám)
 * · "shaky" (rank đang lung lay: viền hồng nhấp nháy và các vết nứt). Huyền Thoại tô dải cầu vồng.
 * Kích thước điều khiển bằng className (size-*).
 */

import { useId } from 'react'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'

const SHIELD = 'M50 4 L90 18 L90 52 C90 76 72 92 50 100 C28 92 10 76 10 52 L10 18 Z'
const STAR = 'M50 30 L56.5 43.5 L71 45.5 L60.5 55.5 L63 70 L50 63 L37 70 L39.5 55.5 L29 45.5 L43.5 43.5 Z'

export default function RankEmblem({ rank, state = 'done', className, title }) {
  const gid = useId()
  const info = RANK_BY_KEY[rank]
  const locked = state === 'locked'
  const legend = rank === 'huyen_thoai' && !locked
  const fill = locked ? 'var(--color-neutral)' : legend ? `url(#${gid})` : info.color

  return (
    <span className={cx('relative inline-grid shrink-0 place-items-center', className)} title={title ?? info.name}>
      {state === 'current' && (
        <span
          className="anim-glow absolute inset-[-8%] rounded-pill"
          style={{ boxShadow: `0 0 22px 8px color-mix(in srgb, ${legend ? 'var(--color-danger)' : info.color} 70%, transparent)` }}
          aria-hidden="true"
        />
      )}
      <svg viewBox="0 0 100 106" className="relative size-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-danger)" />
            <stop offset="0.3" stopColor="var(--color-gold)" />
            <stop offset="0.55" stopColor="var(--color-accent)" />
            <stop offset="0.8" stopColor="var(--color-sky)" />
            <stop offset="1" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>
        {/* Bóng cứng */}
        <path d={SHIELD} transform="translate(5 5)" fill="var(--color-ink)" />
        <path d={SHIELD} fill={fill} stroke="var(--color-ink)" strokeWidth="5" strokeLinejoin="round" />
        {/* Vệt sáng */}
        {!locked && <path d="M22 24 L42 17 L30 62 C24 56 22 50 22 44 Z" fill="var(--color-white)" opacity="0.35" />}
        <path d={STAR} fill={locked ? 'var(--color-raised)' : 'var(--color-white)'} stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round" />
        {state === 'shaky' && (
          <>
            <path d="M50 6 L44 26 L54 36 L46 52" fill="none" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M88 48 L74 56 L78 66 L66 72" fill="none" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M18 70 L30 72 L34 84" fill="none" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d={SHIELD} fill="none" stroke="var(--color-danger)" strokeWidth="9" strokeLinejoin="round" className="anim-blink" transform="scale(1.06) translate(-2.8 -3)" />
          </>
        )}
      </svg>
    </span>
  )
}
