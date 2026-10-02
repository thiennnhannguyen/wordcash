/*
 * Hộp thoại.
 *
 * Đóng bằng phím Esc, nút X hoặc bấm ra ngoài (trừ khi `dismissible` = false,
 * ví dụ Cửa Ải Hôm Nay bắt buộc).
 * `mobileSheet`: dưới 768px hộp thoại thành tấm trượt toàn màn hình từ dưới lên (cuộn bên trong).
 */

import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { XCircle } from '@phosphor-icons/react'
import Icon from './Icon'
import cx from '../../utils/cx'
import useMediaQuery from '../../hooks/useMediaQuery'

export default function Modal({ open, onClose, title, dismissible = true, footer, mobileSheet = false, className, children }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const desktop = useMediaQuery('(min-width: 768px)')
  const sheet = mobileSheet && !desktop

  useEffect(() => {
    if (!open) return undefined
    panelRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape' && dismissible) onClose?.()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, dismissible, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cx('fixed inset-0 z-[75] grid bg-ink/55', sheet ? 'items-end' : 'place-items-center p-4')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissible ? onClose : undefined}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cx(
              'w-full rounded-panel border-thick border-line bg-surface p-6 shadow-hard-lg outline-none md:p-8',
              // Độ rộng mặc định; truyền max-w-* qua className để đổi (tránh hai class max-w cùng lúc)
              !className?.includes('max-w-') && 'max-w-md',
              className,
              sheet && 'h-[calc(100dvh-12px)] max-w-none overflow-y-auto rounded-b-none border-b-0 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4',
            )}
            initial={sheet ? { y: '100%' } : { scale: 0.9, y: 16 }}
            animate={sheet ? { y: 0 } : { scale: 1, y: 0 }}
            exit={sheet ? { y: '100%' } : { scale: 0.95, y: 8, opacity: 0 }}
            transition={sheet ? { type: 'spring', stiffness: 320, damping: 34 } : { type: 'spring', stiffness: 420, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            {sheet && <span className="mx-auto mb-2 block h-1.5 w-12 rounded-pill bg-neutral" aria-hidden="true" />}
            {(title || dismissible) && (
              <div className={cx('mb-4 flex items-start gap-4', title ? 'justify-between' : '-mb-6 justify-end md:-mb-8')}>
                {title && (
                  <h2 id={titleId} className="text-[28px]">
                    {title}
                  </h2>
                )}
                {dismissible && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng"
                    className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-raised hover:text-ink"
                  >
                    <Icon icon={XCircle} size={28} />
                  </button>
                )}
              </div>
            )}
            <div className="text-muted">{children}</div>
            {footer && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
