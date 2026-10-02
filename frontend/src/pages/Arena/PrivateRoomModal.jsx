/*
 * Hộp thoại Phòng riêng: tab "Tạo phòng" và "Vào phòng".
 *
 * Tạo phòng: chọn cấp độ từ vựng bằng chip A1–C2 (cấp chưa mở thì mờ, có ổ khóa), chọn số câu 10/20, bấm Tạo.
 * Server sinh mã phòng; mã hiện thành các ô ký tự kiểu game kèm nút Sao chép và Chia sẻ link.
 * Vào phòng: 5 ô nhập ký tự lớn (tự nhảy ô, dán cả mã được), nút Vào. Server kiểm tra mã.
 * Câu hỏi thật chỉ lấy từ các cấp mà cả hai người đều đã mở; server lọc khi trận bắt đầu.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CopySimple, LockSimple, ShareNetwork, SignIn, Sparkle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import RoomCode from '../../components/game/RoomCode'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { LEVELS } from '../../utils/constants'
import { createRoom, joinRoom } from './arenaMock'

const CODE_LENGTH = 5
const DARK_LEVELS = new Set(['C1', 'C2'])

function Tabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Phòng riêng" className="grid grid-cols-2 gap-1 rounded-pill border-thick border-line bg-raised p-1">
      {[
        ['create', 'Tạo phòng'],
        ['join', 'Vào phòng'],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={cx(
            'h-11 rounded-pill font-display text-sm font-bold uppercase tracking-wider transition-colors',
            value === key ? 'border-2 border-line bg-primary text-white shadow-hard-sm' : 'text-ink hover:bg-surface',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function CreateTab({ unlockedLevels, initialRoom }) {
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const [levels, setLevels] = useState(unlockedLevels)
  const [questions, setQuestions] = useState(20)
  const [pending, setPending] = useState(false)
  const [room, setRoom] = useState(initialRoom)

  const toggle = (level) => setLevels((ls) => (ls.includes(level) ? ls.filter((l) => l !== level) : [...ls, level]))

  const create = async () => {
    setPending(true)
    setRoom(await createRoom({ levels, questions }))
    setPending(false)
  }

  if (room) {
    const link = `${window.location.origin}/arena/room/${room.code}`
    const copy = async (text, title) => {
      try {
        await navigator.clipboard.writeText(text)
        pushToast({ variant: 'success', title })
      } catch {
        pushToast({ variant: 'error', title: 'Không chép được', message: 'Hãy chép thủ công nhé.' })
      }
    }
    const share = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'WORDCLASH', text: `Vào phòng ${room.code} đấu từ vựng với mình!`, url: link })
        } catch {
          // Người dùng đóng hộp chia sẻ
        }
        return
      }
      copy(link, 'Đã chép link phòng')
    }

    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="hud-label">Mã phòng của bạn</span>
        <RoomCode code={room.code} />
        <div className="grid w-full grid-cols-2 gap-3">
          <Button variant="secondary" icon={CopySimple} className="whitespace-nowrap px-3" onClick={() => copy(room.code, 'Đã chép mã phòng')}>
            Sao chép
          </Button>
          <Button variant="sky" icon={ShareNetwork} className="whitespace-nowrap px-3" onClick={share}>
            Chia sẻ link
          </Button>
        </div>
        <p className="flex items-center gap-2 text-caption font-semibold text-ink">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-pill bg-accent opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-3 rounded-pill border-2 border-line bg-accent" />
          </span>
          Đang chờ bạn bè vào phòng… · {room.levels.join(', ')} · {room.questions} câu
        </p>
        <Button size="lg" fullWidth iconRight={ArrowRight} onClick={() => navigate(`/arena/room/${room.code}`)}>
          Vào phòng chờ
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="hud-label mb-2">Cấp độ từ vựng</legend>
        <div className="grid grid-cols-6 gap-1.5 md:gap-2">
          {LEVELS.map((l) => {
            const locked = !unlockedLevels.includes(l)
            const on = levels.includes(l)
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                disabled={locked}
                onClick={() => toggle(l)}
                title={locked ? `${l} chưa mở khóa` : undefined}
                className={cx(
                  'relative grid h-12 place-items-center rounded-[14px] border-thick font-display text-base font-bold transition-transform',
                  locked ? 'cursor-not-allowed border-line/30 bg-raised text-muted/60' : 'pressable border-line shadow-hard-sm',
                  !locked && (on ? (DARK_LEVELS.has(l) ? 'text-white' : 'text-ink') : 'bg-surface text-muted'),
                )}
                style={!locked && on ? { background: `var(--color-level-${l.toLowerCase()})` } : undefined}
              >
                {l}
                {locked && (
                  <span className="absolute -right-1.5 -top-2 grid size-5 place-items-center rounded-pill border-2 border-line bg-gold">
                    <Icon icon={LockSimple} size={11} color="ink" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-caption text-muted">Câu hỏi chỉ lấy từ các cấp mà cả hai người đều đã mở khóa.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="hud-label mb-2">Số câu</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-3">
          {[10, 20].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={questions === n}
              onClick={() => setQuestions(n)}
              className={cx(
                'pressable h-13 rounded-btn border-thick border-line font-num text-xl shadow-hard-sm',
                questions === n ? 'bg-accent' : 'bg-surface text-muted',
              )}
            >
              {n} câu
            </button>
          ))}
        </div>
      </fieldset>

      <Button size="lg" variant="orange" icon={Sparkle} fullWidth disabled={!levels.length || pending} onClick={create}>
        {pending ? 'Đang tạo…' : 'Tạo'}
      </Button>
    </div>
  )
}

function JoinTab() {
  const navigate = useNavigate()
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const refs = useRef([])
  const code = chars.join('')

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const setAt = (i, value) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setError('')
    if (clean.length > 1) {
      // Dán cả mã
      const next = clean.slice(0, CODE_LENGTH).split('')
      setChars([...next, ...Array(CODE_LENGTH - next.length).fill('')])
      refs.current[Math.min(next.length, CODE_LENGTH - 1)]?.focus()
      return
    }
    setChars((cs) => cs.map((ch, k) => (k === i ? clean : ch)))
    if (clean && i < CODE_LENGTH - 1) refs.current[i + 1]?.focus()
  }

  const join = async (event) => {
    event.preventDefault()
    if (code.length < CODE_LENGTH || pending) return
    setPending(true)
    const res = await joinRoom(code)
    setPending(false)
    if (res.ok) navigate(`/arena/room/${res.code}?joined=1`)
    else setError(res.message)
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={join}>
      <div className="flex flex-col items-center gap-2">
        <span className="hud-label">Nhập mã phòng</span>
        <div key={error} className={cx('flex justify-center gap-2 md:gap-3', error && 'anim-shake')}>
          {chars.map((ch, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={ch}
              onChange={(e) => setAt(i, e.target.value.slice(ch ? 1 : 0) || e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !ch && i > 0) refs.current[i - 1]?.focus()
              }}
              onPaste={(e) => {
                e.preventDefault()
                setAt(0, e.clipboardData.getData('text'))
              }}
              aria-label={`Ký tự ${i + 1}`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              maxLength={CODE_LENGTH}
              className={cx(
                'h-16 w-13 rounded-[14px] border-thick text-center font-display text-[36px] font-bold uppercase shadow-hard outline-none md:h-20 md:w-16 md:text-[48px]',
                'focus:border-primary focus:shadow-focus',
                error ? 'border-danger bg-danger/10' : ch ? 'border-line bg-gold' : 'border-line bg-surface',
              )}
            />
          ))}
        </div>
        <p className={cx('min-h-6 text-caption font-semibold', error ? 'text-danger-deep' : 'text-muted')} role={error ? 'alert' : undefined}>
          {error || 'Mã gồm 5 ký tự, bạn bè sẽ gửi cho bạn.'}
        </p>
      </div>
      <Button type="submit" size="lg" icon={SignIn} fullWidth disabled={code.length < CODE_LENGTH || pending}>
        {pending ? 'Đang vào…' : 'Vào'}
      </Button>
    </form>
  )
}

export default function PrivateRoomModal({ open, onClose, unlockedLevels, initialTab = 'create', initialRoom = null }) {
  const [tab, setTab] = useState(initialTab)

  return (
    <Modal open={open} onClose={onClose} title="Phòng riêng" className="max-w-lg">
      <div className="flex flex-col gap-6 text-ink">
        <Tabs value={tab} onChange={setTab} />
        {tab === 'create' ? <CreateTab unlockedLevels={unlockedLevels} initialRoom={initialRoom} /> : <JoinTab />}
      </div>
    </Modal>
  )
}
