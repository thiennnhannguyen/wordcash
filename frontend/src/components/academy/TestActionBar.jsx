/*
 * Thanh hành động dưới đáy màn kiểm tra.
 *
 * Chưa nộp: nút "Kiểm tra". Đã nộp: thanh đổi màu theo kết quả server trả về (xanh chanh đúng, hồng sai)
 * kèm nút "Tiếp". Trong bài kiểm tra không hiện đáp án đúng giữa chừng; từ sai được liệt kê khi kết thúc.
 * `dark` dùng cho nền tím sẫm của Trận Boss.
 */

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckFat, XCircle } from '@phosphor-icons/react'
import Button from '../ui/Button'
import { IconBadge } from '../ui/Icon'
import cx from '../../utils/cx'

export default function TestActionBar({ verdict, canSubmit, pending, onSubmit, onNext, hint, correctText = 'Chính xác!', wrongText = 'Chưa đúng', dark = false }) {
  const nextRef = useRef(null)

  // Chuyển focus vào nút "Tiếp" để bấm Enter là đi tiếp
  useEffect(() => {
    if (verdict) nextRef.current?.focus({ preventScroll: true })
  }, [verdict])

  const tone = verdict ? (verdict.correct ? 'bg-accent text-ink' : 'bg-danger text-ink') : dark ? 'bg-night-raised' : 'bg-surface'

  return (
    <div
      className={cx(
        'fixed inset-x-0 bottom-0 z-30 border-t-thick px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 transition-colors duration-200 md:px-8',
        dark && !verdict ? 'border-primary' : 'border-line',
        tone,
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        {verdict ? (
          <motion.div
            role="status"
            aria-live="assertive"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex min-w-0 items-center gap-3"
          >
            <IconBadge icon={verdict.correct ? CheckFat : XCircle} bg="surface" size="md" />
            <span className="font-heading text-2xl font-black leading-tight">{verdict.correct ? correctText : wrongText}</span>
          </motion.div>
        ) : (
          <span className={cx('hud-label hidden md:inline', dark && 'text-white/70')}>{hint}</span>
        )}
        {verdict ? (
          <Button ref={nextRef} size="lg" variant={verdict.correct ? 'primary' : 'secondary'} iconRight={ArrowRight} className="shrink-0 md:min-w-52" onClick={onNext}>
            Tiếp
          </Button>
        ) : (
          <Button size="lg" fullWidth className="md:w-auto md:min-w-64" disabled={!canSubmit || pending} onClick={onSubmit}>
            {pending ? 'Đang chấm…' : 'Kiểm tra'}
          </Button>
        )}
      </div>
    </div>
  )
}
