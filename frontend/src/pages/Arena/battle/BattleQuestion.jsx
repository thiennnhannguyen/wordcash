/*
 * Khu câu hỏi của màn đấu: card câu hỏi (lật ra mặt sau để lộ nghĩa đúng giữa hai câu), 4 nút đáp án và dòng trạng thái.
 *
 * Card: nền trắng, viền 3px, bóng cứng 6px. Chỉ có 3 loại: mức 1 chọn nghĩa, mức 2 nghe chọn từ (loa lớn tự phát),
 * mức 4 điền vào câu. Không có mức 3 (gõ từ) để tốc độ công bằng giữa điện thoại và máy tính.
 * Nút đáp án: phím tắt 1–4 ở góc, nảy lên khi hover, lún 4px trong 60ms khi nhấn.
 * Trạng thái nút lấy từ phản hồi server: đúng (xanh chanh), sai (hồng, rung), đáp án đúng khi mình không chọn
 * (viền xanh chanh, chỉ hiện khi lượt đã chốt), chậm hơn (khi lượt đã chốt trước lúc câu trả lời tới server).
 */

import { AnimatePresence, motion } from 'framer-motion'
import { BookmarkSimple, CheckFat, HourglassMedium, LockSimple, SpeakerHigh, SpeakerSimpleLow } from '@phosphor-icons/react'
import { IconButton } from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import cx from '../../../utils/cx'
import { formatDecimal } from '../../../utils/format'
import { speak } from '../../../utils/speech'

const TYPE_LABEL = { 1: 'Chọn nghĩa', 2: 'Nghe chọn từ', 4: 'Điền vào câu' }
const CARD = 'rounded-panel border-[3px] border-line bg-surface shadow-[6px_6px_0_0_var(--color-line)]'

function Bookmark() {
  return (
    <motion.span
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute -top-1 right-5 z-10 flex flex-col items-center"
      aria-label="Đã lưu để ôn"
    >
      <span className="grid h-12 w-9 place-items-center border-thick border-line bg-gold [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]">
        <Icon icon={BookmarkSimple} size={18} className="-mt-2" />
      </span>
    </motion.span>
  )
}

function Front({ question, compact, onPlayAudio, choiceText, result }) {
  return (
    <div className={cx(CARD, 'flex flex-col items-center gap-3 px-5 text-center', compact ? 'py-4' : 'py-6 md:gap-4')}>
      <span className="rounded-pill border-2 border-line bg-raised px-3 font-display text-xs font-bold uppercase leading-6">{TYPE_LABEL[question.type]}</span>

      {question.type === 1 && (
        <>
          <p className={cx('font-display font-bold uppercase leading-none tracking-wide', compact ? 'text-[40px]' : 'text-[56px]')}>{question.word}</p>
          <div className="flex items-center gap-2 text-muted">
            <span className="text-lg">{question.ipa}</span>
            <IconButton icon={SpeakerHigh} label={`Nghe phát âm ${question.word}`} variant="sky" size="sm" onClick={() => speak(question.word)} />
          </div>
        </>
      )}

      {question.type === 2 && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onPlayAudio({ slow: false })}
            aria-label="Nghe lại"
            className={cx('pressable grid place-items-center rounded-pill border-thick border-line bg-sky shadow-hard-lg hover:-translate-y-0.5', compact ? 'size-20' : 'size-28')}
          >
            <Icon icon={SpeakerHigh} size={compact ? 40 : 56} />
          </button>
          <button
            type="button"
            onClick={() => onPlayAudio({ slow: true })}
            className="flex h-11 items-center gap-1.5 rounded-pill border-thick border-line bg-surface px-3 font-display text-xs font-bold uppercase shadow-hard-sm"
          >
            <Icon icon={SpeakerSimpleLow} size={18} />
            Nghe chậm
          </button>
        </div>
      )}

      {question.type === 4 && (
        <p className={cx('font-heading font-extrabold leading-snug tracking-tight', compact ? 'text-[21px]' : 'text-[28px]')}>
          {question.sentence.split('______')[0]}
          <span
            className={cx(
              'mx-1 inline-block min-w-24 rounded-[10px] border-b-4 px-2 text-center',
              result ? 'border-accent-deep bg-accent/40' : choiceText ? 'border-primary bg-raised text-primary' : 'border-ink/40 text-transparent',
            )}
          >
            {result ? result.word : choiceText || '____'}
          </span>
          {question.sentence.split('______')[1]}
        </p>
      )}
    </div>
  )
}

function Back({ result, compact }) {
  return (
    <div className={cx(CARD, 'absolute inset-0 flex flex-col items-center justify-center gap-2 bg-raised px-5 text-center')} style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
      <span className="hud-label">Nghĩa đúng</span>
      <p className={cx('font-heading font-black leading-tight', compact ? 'text-[26px]' : 'text-[36px]')}>
        <span className="font-display uppercase tracking-wide text-primary">{result?.word}</span> = {result?.meaning}
      </p>
      <span className="text-muted">{result?.ipa}</span>
    </div>
  )
}

export function BattleCard({ question, result, flipped, first, compact, onPlayAudio, choiceText }) {
  return (
    <AnimatePresence mode="popLayout" initial={true}>
      <motion.div
        key={question.id}
        className="relative w-full"
        initial={first ? { y: 160, opacity: 0, scale: 0.9 } : { x: '110%', opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        exit={{ x: '-110%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{ perspective: 1200 }}
      >
        {result?.bookmarked && result.outcome === 'draw' && <Bookmark />}
        <motion.div className="relative" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45, ease: 'easeInOut' }} style={{ transformStyle: 'preserve-3d' }}>
          <div style={{ backfaceVisibility: 'hidden' }}>
            <Front question={question} compact={compact} onPlayAudio={onPlayAudio} choiceText={choiceText} result={result} />
          </div>
          <Back result={result} compact={compact} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const STATE_CLASS = {
  idle: 'bg-surface',
  selected: 'bg-raised outline outline-[3px] outline-offset-2 outline-primary',
  correct: 'bg-accent',
  wrong: 'bg-danger anim-shake',
  reveal: 'bg-surface outline outline-4 outline-offset-2 outline-accent',
  late: 'bg-raised',
  dim: 'bg-raised text-muted shadow-none',
}

function answerState(i, { result, myChoice, myVerdict }) {
  if (result) {
    if (i === myChoice && myVerdict === 'late') return 'late'
    if (i === result.correctIndex) return myChoice === i && myVerdict !== 'late' ? 'correct' : 'reveal'
    if (i === myChoice) return myVerdict === 'late' ? 'late' : 'wrong'
    return 'dim'
  }
  if (i === myChoice) return myVerdict === 'wrong' ? 'wrong' : 'selected'
  return 'idle'
}

export function AnswerGrid({ question, result, myChoice, myVerdict, slowerBy, disabled, onAnswer, compact }) {
  return (
    <motion.div
      key={question.id}
      role="radiogroup"
      aria-label="Các đáp án"
      className={cx('grid w-full', compact ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3.5')}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      {question.options.map((option, i) => {
        const state = answerState(i, { result, myChoice, myVerdict })
        const enabled = !disabled
        return (
          <motion.button
            key={option}
            type="button"
            role="radio"
            aria-checked={myChoice === i}
            disabled={!enabled}
            onClick={() => onAnswer(i)}
            whileHover={enabled ? { y: -4 } : undefined}
            transition={{ type: 'spring', stiffness: 600, damping: 15 }}
            className={cx(
              'relative flex items-center gap-3 rounded-[20px] border-thick border-line px-5 text-left font-semibold text-ink shadow-hard',
              'transition-[translate,box-shadow] duration-[60ms] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-default',
              compact ? 'h-[60px] text-base' : 'min-h-[76px] py-3 text-lg',
              STATE_CLASS[state],
            )}
          >
            <span className="absolute -left-2.5 -top-2.5 grid size-7 place-items-center rounded-[8px] border-2 border-line bg-ink font-display text-xs font-bold text-white">{i + 1}</span>
            <span className="flex-1 leading-tight">{option}</span>
            {(state === 'correct' || state === 'reveal') && <Icon icon={CheckFat} size={22} color="accent-deep" />}
            {state === 'late' && slowerBy != null && (
              <span className="shrink-0 rounded-pill border-2 border-line bg-surface px-2 font-display text-xs font-bold uppercase leading-6 text-danger-deep">
                Chậm hơn {formatDecimal(slowerBy)}s
              </span>
            )}
          </motion.button>
        )
      })}
    </motion.div>
  )
}

/** Dòng trạng thái dưới đáp án. */
export function StatusLine({ myChoice, result, myVerdict, lockedOut }) {
  let content = null
  if (!result && myChoice != null) {
    content = (
      <>
        <Icon icon={LockSimple} size={16} /> Đã khóa đáp án · Chờ đối thủ…
      </>
    )
  } else if (lockedOut && myVerdict !== 'late') {
    content = (
      <>
        <Icon icon={HourglassMedium} size={16} /> Đối thủ trả lời đúng trước
      </>
    )
  } else if (result?.bookmarked && result.outcome === 'draw') {
    content = (
      <>
        <Icon icon={BookmarkSimple} size={16} /> Đã lưu “{result.word}” để ôn
      </>
    )
  }

  return (
    <div className="flex min-h-9 justify-center" aria-live="polite">
      <AnimatePresence mode="wait">
        {content && (
          <motion.span
            key={String(myChoice) + String(result?.outcome) + String(lockedOut)}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-pill border-2 border-line bg-surface px-3 font-display text-sm font-bold uppercase leading-8 shadow-hard-sm"
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
