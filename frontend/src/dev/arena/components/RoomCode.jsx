/*
 * Mã phòng hiện thành các ô ký tự kiểu game (vàng, viền mực, nghiêng xen kẽ), từng ô bật ra lần lượt.
 * Mã do server sinh; component chỉ hiển thị. `size`: "md" (hộp thoại) hoặc "lg" (phòng chờ).
 */

import { motion } from 'framer-motion'
import cx from '../../../utils/cx'

const SIZES = {
  md: 'h-16 w-13 text-[40px] md:h-20 md:w-16 md:text-[52px]',
  lg: 'h-16 w-13 text-[40px] md:h-24 md:w-[76px] md:text-[64px]',
}

export default function RoomCode({ code, size = 'md', className }) {
  return (
    <div className={cx('flex justify-center gap-2 md:gap-3', className)} aria-label={`Mã phòng ${code.split('').join(' ')}`} role="img">
      {code.split('').map((ch, i) => (
        <motion.span
          key={i}
          initial={{ y: -30, scale: 0.4, opacity: 0, rotate: -12 }}
          animate={{ y: 0, scale: 1, opacity: 1, rotate: i % 2 ? 3 : -3 }}
          transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.08 * i }}
          className={cx('grid place-items-center rounded-[14px] border-thick border-line bg-gold font-display font-bold leading-none shadow-hard', SIZES[size])}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  )
}
