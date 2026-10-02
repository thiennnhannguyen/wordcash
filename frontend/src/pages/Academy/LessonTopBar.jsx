/*
 * Thanh trên cùng của màn Học bài: nút thoát, thanh tiến độ "5/18", bộ đếm combo (khi có).
 */

import { AnimatePresence, motion } from 'framer-motion'
import { XCircle } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import ProgressBar from '../../components/ui/ProgressBar'
import Sticker from '../../components/ui/Sticker'

export default function LessonTopBar({ value, max, label, combo = 0, onExit }) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pt-4 md:gap-4 md:px-8 md:pt-6">
      <button
        type="button"
        onClick={onExit}
        aria-label="Thoát bài học"
        className="-ml-2 grid size-11 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <Icon icon={XCircle} size={30} />
      </button>
      <ProgressBar value={value} max={max} size="md" className="flex-1" />
      <span className="font-num shrink-0 text-base">
        {value}/{max}
      </span>
      {label && <span className="hud-label hidden shrink-0 sm:inline">{label}</span>}
      <AnimatePresence>
        {combo >= 2 && (
          <motion.span
            key={combo}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="shrink-0"
          >
            <Sticker bg="orange" tilt={-6} size="sm">
              Combo x{combo}
            </Sticker>
          </motion.span>
        )}
      </AnimatePresence>
    </header>
  )
}
