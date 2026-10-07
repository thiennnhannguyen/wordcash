/*
 * Tấm phản hồi trượt từ đáy lên sau khi server chấm một câu (dùng cho Cửa Ải và Học bài).
 * Đúng: nền xanh chanh "Chuẩn luôn!". Sai: nền hồng nhạt, hiện đáp án đúng, phiên âm, nút loa, câu ví dụ.
 * Nhãn phụ khi sai: mức trừ từ thuộc (nếu server trả `masteredDelta` < 0) hoặc `note` do màn gọi truyền vào.
 */

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckFat, SpeakerHigh, XCircle } from '@phosphor-icons/react'
import Button, { IconButton } from '../ui/Button'
import { IconBadge } from '../ui/Icon'
import cx from '../../utils/cx'
import { formatDelta } from '../../utils/format'
import { speak } from '../../utils/speech'

export default function FeedbackSheet({ result, onContinue, note }) {
  const buttonRef = useRef(null)
  const correct = result.correct

  // Chuyển focus vào nút để bấm Enter là đi tiếp, và trình đọc màn hình đọc kết quả
  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <motion.section
      role="status"
      aria-live="assertive"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className={cx(
        'fixed inset-x-0 bottom-0 z-40 rounded-t-panel border-t-thick px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-8 md:pt-7',
        correct ? 'border-line bg-accent' : 'border-danger bg-[color-mix(in_srgb,var(--color-danger)_14%,var(--color-surface))]',
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex min-w-0 gap-4">
          <IconBadge icon={correct ? CheckFat : XCircle} bg={correct ? 'surface' : 'danger'} size="lg" />
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-[28px] leading-tight">{correct ? 'Chuẩn luôn!' : 'Chưa đúng rồi'}</h2>
            {correct ? (
              <p className="font-medium">
                <span className="font-display font-bold">{result.correctAnswer}</span> · {result.meaning}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="hud-label text-ink/70">Đáp án:</span>
                  <span className="font-display text-2xl font-bold">{result.correctAnswer}</span>
                  <span className="text-muted">{result.ipa}</span>
                  <IconButton icon={SpeakerHigh} label={`Nghe phát âm ${result.correctAnswer}`} variant="sky" size="sm" onClick={() => speak(result.correctAnswer)} />
                </div>
                <p className="italic text-ink/80">“{result.example}”</p>
                {result.masteredDelta < 0 ? (
                  <span className="self-start rounded-pill border-2 border-danger bg-surface px-3 py-1 text-caption font-semibold text-danger-deep">
                    {formatDelta(result.masteredDelta)} từ đã thuộc · Đã thêm vào danh sách ôn gấp
                  </span>
                ) : (
                  note && (
                    <span className="self-start rounded-pill border-2 border-line bg-surface px-3 py-1 text-caption font-semibold">
                      {note}
                    </span>
                  )
                )}
              </>
            )}
          </div>
        </div>
        <Button
          ref={buttonRef}
          size="lg"
          variant={correct ? 'primary' : 'danger'}
          iconRight={correct ? ArrowRight : undefined}
          className="w-full shrink-0 md:w-auto md:min-w-52"
          onClick={onContinue}
        >
          {correct ? 'Tiếp' : 'Đã nhớ'}
        </Button>
      </div>
    </motion.section>
  )
}
