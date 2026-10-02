/*
 * Các nút đáp án.
 *
 * Trạng thái mỗi nút: "idle", "selected" (đã chọn, chờ server chấm), "correct" (nền xanh chanh),
 * "wrong" (nền hồng, rung). Đúng/sai luôn do server trả về; component chỉ hiển thị.
 * `keyLabel` đổi nhãn phím (mặc định A–D, vd. "1"–"4" khi có phím tắt số).
 */

import { CheckCircle, XCircle } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import cx from '../../utils/cx'

const KEYS = ['A', 'B', 'C', 'D']

const STATES = {
  idle: {
    frame: 'bg-surface shadow-hard pressable hover:-translate-y-0.5 hover:shadow-hard-lg',
    key: 'bg-raised text-ink',
  },
  selected: {
    frame: 'bg-raised shadow-hard outline-[3px] outline-offset-2 outline-primary outline',
    key: 'bg-primary text-white',
  },
  correct: {
    frame: 'bg-accent shadow-hard',
    key: 'bg-surface text-ink',
  },
  wrong: {
    frame: 'bg-danger shadow-hard anim-shake',
    key: 'bg-surface text-ink',
  },
}

export function AnswerOption({ index, label, keyLabel, state = 'idle', size = 'md', disabled, onClick }) {
  const s = STATES[state]
  const small = size === 'sm'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'selected' || undefined}
      className={cx(
        'flex w-full items-center rounded-card border-thick border-line text-left font-semibold text-ink',
        small ? 'min-h-13 gap-2 px-2.5 py-2 text-[15px] leading-tight' : 'min-h-16 gap-3 px-4 py-3 text-lg',
        'disabled:cursor-default',
        s.frame,
      )}
    >
      <span
        className={cx(
          'grid shrink-0 place-items-center rounded-[12px] border-thick border-line font-display font-bold',
          small ? 'size-8 text-sm' : 'size-10',
          s.key,
        )}
      >
        {keyLabel ?? KEYS[index] ?? index + 1}
      </span>
      <span className="flex-1">{label}</span>
      {state === 'correct' && <Icon icon={CheckCircle} size={small ? 22 : 28} color="ink" />}
      {state === 'wrong' && <Icon icon={XCircle} size={small ? 22 : 28} color="ink" />}
    </button>
  )
}

export default function AnswerOptions({ options, states = {}, locked = false, onSelect, className }) {
  return (
    <div className={cx('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>
      {options.map((option, i) => (
        <AnswerOption
          key={option.id ?? i}
          index={i}
          label={option.label}
          state={states[option.id ?? i]}
          disabled={locked}
          onClick={() => onSelect?.(option.id ?? i)}
        />
      ))}
    </div>
  )
}
