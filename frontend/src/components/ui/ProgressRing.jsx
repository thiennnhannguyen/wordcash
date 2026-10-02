/*
 * Vòng tròn tiến độ (vd. số từ tới lượt quay kế tiếp). Nội dung ở giữa truyền qua children.
 */

import cx from '../../utils/cx'

export default function ProgressRing({ value, max, size = 120, stroke = 14, tone = 'danger', label, className, children }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cx('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        {/* Rãnh: viền mực ngoài + nền trắng */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-ink)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface)" strokeWidth={stroke - 5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`var(--color-${tone})`}
          strokeWidth={stroke - 5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
