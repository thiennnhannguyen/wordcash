/*
 * Thông báo ngắn (toast): thành công, lỗi, thông tin, phần thưởng.
 *
 * `Toast` là một thông báo đơn lẻ; `Toaster` đặt một lần trong App để hiển thị hàng đợi từ toastStore.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Gift, Info, WarningCircle, XCircle } from '@phosphor-icons/react'
import Icon, { IconBadge } from './Icon'
import cx from '../../utils/cx'
import { useToastStore } from '../../store/toastStore'

const VARIANTS = {
  success: { icon: CheckCircle, bg: 'accent' },
  error: { icon: WarningCircle, bg: 'danger' },
  info: { icon: Info, bg: 'sky' },
  reward: { icon: Gift, bg: 'gold' },
}

export function Toast({ variant = 'info', title, message, onClose, className }) {
  const v = VARIANTS[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex w-full max-w-sm items-start gap-3 rounded-card border-thick border-line bg-surface p-4 shadow-hard',
        className,
      )}
    >
      <IconBadge icon={v.icon} bg={v.bg} size="md" shadow={false} />
      <div className="min-w-0 flex-1 pt-0.5">
        {title && <div className="font-heading text-lg font-extrabold leading-tight">{title}</div>}
        {message && <p className="text-caption text-muted">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="-mr-1.5 -mt-1.5 grid size-11 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <Icon icon={XCircle} size={24} />
        </button>
      )}
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[90] flex flex-col items-center gap-3 md:inset-x-auto md:right-6 md:top-6 md:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            className="pointer-events-auto w-full max-w-sm"
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          >
            <Toast {...toast} onClose={() => dismiss(toast.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
