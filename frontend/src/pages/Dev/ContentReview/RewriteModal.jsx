/*
 * "Nhờ AI viết lại trường này": người duyệt ghi chú (tùy chọn) → AI viết lại riêng một trường → hiện bản cũ và bản mới cạnh
 * nhau để chọn. Chọn bản mới chỉ điền vào ô (chưa lưu); người duyệt bấm Lưu hoặc Duyệt như bình thường.
 */

import { useEffect, useState } from 'react'
import { MagicWand } from '@phosphor-icons/react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import { rewriteField } from '../../../services/devContentApi'

const show = (v) => (Array.isArray(v) ? v.join('\n') : v || '(trống)')

export default function RewriteModal({ open, onClose, level, topic, entryKey, field, label, onPick }) {
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setNote('')
      setResult(null)
      setError(null)
    }
  }, [open, field])

  const ask = async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(await rewriteField(level, topic, entryKey, field, note))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`AI viết lại: ${label}`}
      className="max-w-3xl"
      footer={
        result ? (
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Giữ bản cũ
            </Button>
            <Button size="sm" onClick={() => onPick(result.new)}>
              Dùng bản mới
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="sm" icon={MagicWand} onClick={ask} disabled={busy}>
              {busy ? 'Đang viết…' : 'Viết lại'}
            </Button>
          </div>
        )
      }
    >
      <label className="hud-label" htmlFor="rewrite-note">
        Ghi chú cho AI (tùy chọn)
      </label>
      <textarea
        id="rewrite-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Ví dụ: ngắn hơn, dùng ngữ cảnh đi chợ"
        className="mt-2 w-full rounded-btn border-thick border-line bg-surface px-3 py-2 text-[15px] shadow-hard outline-none focus:border-primary"
      />
      {error && <p className="mt-3 text-sm font-medium text-danger-deep">{error}</p>}
      {result && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-card border-thick border-line bg-bg p-3">
            <p className="hud-label">Bản cũ</p>
            <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{show(result.old)}</p>
          </div>
          <div className="rounded-card border-thick border-line bg-accent/30 p-3">
            <p className="hud-label">Bản mới</p>
            <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{show(result.new)}</p>
          </div>
        </div>
      )}
    </Modal>
  )
}
