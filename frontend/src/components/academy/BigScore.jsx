/*
 * Điểm phần trăm cỡ lớn trên màn kết quả, tô màu kẹo và có viền chữ mực để đọc được trên nền sáng lẫn tối.
 * Điểm do server trả về; component chỉ hiển thị.
 */

import { motion } from 'framer-motion'
import cx from '../../utils/cx'

export default function BigScore({ value, color = 'accent', className }) {
  return (
    <motion.p
      initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: -3 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
      className={cx(
        'font-display text-[104px] font-bold leading-none tracking-tight md:text-[148px]',
        '[-webkit-text-stroke:6px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:6px_6px_0_var(--color-ink)]',
        className,
      )}
      style={{ color: `var(--color-${color})` }}
    >
      {value}%
    </motion.p>
  )
}
