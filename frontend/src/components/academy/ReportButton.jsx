/*
 * Nút "Báo lỗi" (thẻ học, tấm phản hồi sau mỗi câu, thanh kết quả bài kiểm tra). Chỉ hiện với từ hệ thống (nơi gọi quyết định).
 * Bấm → hộp thoại chọn loại lỗi + ghi chú (tùy chọn) → gửi `target` lên server (services/contentReportApi.js) → toast
 * "Cảm ơn bạn! Mình sẽ kiểm tra từ này." Không làm gián đoạn phiên học: tấm phản hồi / thẻ vẫn giữ nguyên sau khi gửi.
 * `target`: {question: {kind: 'study' | 'daily_check', session_id?, question_id}} hoặc {entry_id, source}.
 */

import { useState } from 'react'
import { Flag } from '@phosphor-icons/react'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import { REPORT_KINDS, reportContent } from '../../services/contentReportApi'
import { useToastStore } from '../../store/toastStore'
import { messageFor } from '../../utils/errorMessages'
import cx from '../../utils/cx'

export const THANKS = 'Cảm ơn bạn! Mình sẽ kiểm tra từ này.'

export default function ReportButton({ target, word, className, tone = 'light' }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const kinds = REPORT_KINDS.filter((k) => !(k.questionOnly && !target.question))

  const close = () => {
    setOpen(false)
    setKind(null)
    setNote('')
  }

  const send = async () => {
    if (!kind || sending) return
    setSending(true)
    try {
      await reportContent({ ...target, kind, note: note.trim() })
      useToastStore.getState().push({ variant: 'success', title: THANKS })
      close()
    } catch (err) {
      useToastStore.getState().push({ variant: 'error', title: 'Chưa gửi được báo lỗi', message: messageFor(err) })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={cx(
          'inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-[14px] font-semibold underline-offset-2 hover:underline',
          tone === 'dark' ? 'text-white/80 hover:text-white' : 'text-ink/70 hover:text-ink',
          className,
        )}
      >
        <Icon icon={Flag} size={18} /> Báo lỗi
      </button>
      <Modal
        open={open}
        onClose={close}
        title={word ? `Báo lỗi từ "${word}"` : 'Báo lỗi từ này'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Hủy
            </Button>
            <Button disabled={!kind || sending} onClick={send}>
              {sending ? 'Đang gửi…' : 'Gửi báo lỗi'}
            </Button>
          </div>
        }
      >
        <fieldset className="flex flex-col gap-2" onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}>
          <legend className="hud-label mb-2">Lỗi gì vậy?</legend>
          {kinds.map((k) => (
            <label
              key={k.value}
              className={cx(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-btn border-thick px-3 py-2',
                kind === k.value ? 'border-primary bg-raised' : 'border-line bg-surface',
              )}
            >
              <input type="radio" name="report-kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="size-5 accent-primary" />
              <span>
                <span className="block font-semibold">{k.label}</span>
                <span className="block text-caption text-muted">{k.hint}</span>
              </span>
            </label>
          ))}
          <label htmlFor="report-note" className="hud-label mt-2">
            Ghi chú (không bắt buộc)
          </label>
          <textarea
            id="report-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: chọn milk cũng đúng"
            className="w-full rounded-btn border-thick border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-primary"
          />
        </fieldset>
      </Modal>
    </>
  )
}
