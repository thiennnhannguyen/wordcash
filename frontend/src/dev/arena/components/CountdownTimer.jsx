/*
 * Đồng hồ đếm ngược mỗi câu.
 *
 * Vòng tròn rút dần theo `endsAt` (mốc hết giờ do server gửi) và số giây ở giữa; dưới 3 giây đổi sang hồng.
 * Chỉ để hiển thị: hết giờ thật do server quyết định. `running` = false thì dừng ở giá trị hiện tại;
 * `frozenSeconds` ép hiện một số giây cố định (dùng khi xem thử thiết kế).
 */

import { useEffect, useState } from 'react'
import cx from '../../../utils/cx'
import { ARENA } from '../rules'

const DANGER_SECONDS = 3

export default function CountdownTimer({ endsAt, running = true, frozenSeconds, total = ARENA.ROUND_SECONDS, size = 64, className }) {
  const [remaining, setRemaining] = useState(total * 1000)

  useEffect(() => {
    if (frozenSeconds != null || !running || !endsAt) return undefined
    let raf
    const tick = () => {
      setRemaining(Math.max(0, endsAt - Date.now()))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [endsAt, running, frozenSeconds])

  const ms = frozenSeconds != null ? frozenSeconds * 1000 : remaining
  const seconds = Math.ceil(ms / 1000)
  const danger = seconds <= DANGER_SECONDS
  const r = 26
  const circumference = 2 * Math.PI * r

  return (
    <div className={cx('relative grid place-items-center', className)} style={{ width: size, height: size }} role="timer" aria-label={`Còn ${seconds} giây`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r="29" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="3" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-raised)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={danger ? 'var(--color-danger)' : 'var(--color-primary)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ms / (total * 1000))}
        />
      </svg>
      <span className={cx('relative font-num leading-none', size >= 64 ? 'text-xl' : 'text-base', danger ? 'text-danger-deep' : 'text-ink')}>{seconds}s</span>
    </div>
  )
}
