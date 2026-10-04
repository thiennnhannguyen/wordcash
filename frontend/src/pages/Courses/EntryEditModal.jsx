/*
 * Hộp thoại sửa một từ trong khóa học.
 * - Từ tự tạo: sửa được từ, nghĩa, loại từ, phiên âm, ví dụ và ghi chú.
 * - Từ trong kho (hoặc mở bằng "Ghi chú"): chỉ sửa ghi chú cá nhân; nội dung kho do WORDCLASH quản lý.
 */

import { useEffect, useId, useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Select from '../../components/ui/Select'
import { POS_OPTIONS } from './AddWordsPanel'

export default function EntryEditModal({ entry, noteOnly, onClose, onSave }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const exampleId = useId()
  const custom = entry?.source === 'user' && !noteOnly

  useEffect(() => {
    if (entry) {
      setForm({
        headword: entry.headword,
        meaning_vi: entry.meaning_vi,
        pos: entry.pos ?? '',
        ipa: entry.ipa ?? '',
        example: entry.example ?? '',
        personal_note: entry.personal_note ?? '',
      })
      setError(null)
    }
  }, [entry])

  if (!entry || !form) return null
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const payload = { personal_note: form.personal_note.trim() || null }
    if (custom) {
      if (!form.headword.trim() || !form.meaning_vi.trim()) {
        setError('Từ và nghĩa không được để trống.')
        return
      }
      Object.assign(payload, { headword: form.headword.trim(), meaning_vi: form.meaning_vi.trim(), pos: form.pos || null, ipa: form.ipa.trim() || null, example: form.example.trim() || null })
    }
    setPending(true)
    try {
      await onSave(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal open={Boolean(entry)} onClose={onClose} title={custom ? 'Sửa từ' : `Ghi chú cho "${entry.headword}"`} mobileSheet className="max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {custom && (
          <>
            <Input label="Từ tiếng Anh" value={form.headword} maxLength={100} onChange={set('headword')} />
            <Input label="Nghĩa tiếng Việt" value={form.meaning_vi} maxLength={300} onChange={set('meaning_vi')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Loại từ" options={POS_OPTIONS} value={form.pos} onChange={set('pos')} />
              <Input label="Phiên âm" value={form.ipa} maxLength={100} onChange={set('ipa')} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={exampleId} className="hud-label">
                Câu ví dụ
              </label>
              <textarea
                id={exampleId}
                rows={2}
                maxLength={500}
                value={form.example}
                onChange={set('example')}
                className="resize-none rounded-btn border-thick border-line bg-surface px-4 py-3 font-medium shadow-hard outline-none focus:border-primary focus:shadow-focus"
              />
            </div>
          </>
        )}
        <Input label="Ghi chú của bạn" value={form.personal_note} maxLength={300} onChange={set('personal_note')} placeholder="Gặp ở đâu, mẹo nhớ…" autoFocus={!custom} />
        {!custom && entry.source === 'system' && <p className="text-caption text-muted">Nghĩa, phát âm và ví dụ của từ trong kho do WORDCLASH biên soạn.</p>}
        {error && (
          <p role="alert" className="text-caption font-semibold text-danger-deep">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
