/*
 * Hiện dần phần tử khi cuộn tới (một lần). Tự tắt khi người dùng bật giảm chuyển động.
 */

import { motion } from 'framer-motion'

export default function Reveal({ as = 'div', delay = 0, className, children, ...props }) {
  const Tag = motion[as] ?? motion.div

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      {...props}
    >
      {children}
    </Tag>
  )
}
