/*
 * Danh sách từ trong khóa học: ô tìm kiếm, bộ lọc trạng thái, sắp xếp, phân trang "Xem thêm".
 * Mỗi dòng: từ + nhãn "Kho · B1" hoặc "Tự tạo", phiên âm, nút loa, nghĩa, chấm trạng thái, ngày ôn tiếp, ngôi sao,
 * menu ba chấm (sửa / ghi chú / bỏ khỏi khóa / xóa hẳn từ tự tạo). Lọc, sắp xếp, phân trang làm ở server.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { DotsThreeVertical, MagnifyingGlass, NotePencil, PencilSimple, SpeakerHigh, Star, Trash, X } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Select from '../../components/ui/Select'
import * as coursesApi from '../../services/coursesApi'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { speak } from '../../utils/speech'
import { STATUS, formatDue, isOverdue } from './courseUi'
import EntryEditModal from './EntryEditModal'

const PAGE_SIZE = 30
const toast = (variant, title, message) => useToastStore.getState().push({ variant, title, message })

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'due', label: 'Đến hạn' },
  { key: 'starred', label: 'Có sao' },
  { key: 'new', label: 'Mới' },
  { key: 'learning', label: 'Đang học' },
  { key: 'mastered', label: 'Đã thuộc' },
  { key: 'forgotten', label: 'Đã quên' },
]
const SORTS = [
  { value: 'added', label: 'Mới thêm' },
  { value: 'alpha', label: 'A → Z' },
  { value: 'due', label: 'Hạn ôn' },
]

function SourceTag({ entry }) {
  return entry.source === 'user' ? (
    <span className="rounded-pill border-2 border-line bg-gold px-2 text-[13px] font-bold leading-5">Tự tạo</span>
  ) : (
    <span className="rounded-pill border-2 border-line bg-sky px-2 text-[13px] font-bold leading-5">Kho{entry.cefr ? ` · ${entry.cefr}` : ''}</span>
  )
}

function playEntry(entry) {
  // Có file phát âm thì phát file; chưa có (từ tự tạo đang chờ TTS) thì đọc bằng trình duyệt
  if (entry.audio_url) new Audio(entry.audio_url).play().catch(() => speak(entry.headword))
  else speak(entry.headword)
}

function RowMenu({ entry, onEdit, onNote, onRemove, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false)
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items = [
    entry.source === 'user' && { label: 'Sửa từ', icon: PencilSimple, run: onEdit },
    { label: entry.personal_note ? 'Sửa ghi chú' : 'Thêm ghi chú', icon: NotePencil, run: onNote },
    { label: 'Bỏ khỏi khóa học', icon: X, run: onRemove },
    entry.source === 'user' && { label: 'Xóa hẳn từ này', icon: Trash, run: onDelete, danger: true },
  ].filter(Boolean)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Thêm thao tác cho ${entry.headword}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-pill text-muted hover:bg-raised hover:text-ink"
      >
        <Icon icon={DotsThreeVertical} size={24} />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-12 z-20 w-56 rounded-card border-thick border-line bg-surface p-1.5 shadow-hard-lg">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.run()
                }}
                className={cx('flex h-11 w-full items-center gap-2.5 rounded-[12px] px-3 text-left font-semibold hover:bg-raised', item.danger && 'text-danger-deep')}
              >
                <Icon icon={item.icon} size={20} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WordRow({ entry, onStar, onEdit, onNote, onRemove, onDelete }) {
  const status = STATUS[entry.progress.status]
  const overdue = isOverdue(entry.progress.due_at)
  return (
    <li className="flex items-start gap-2 border-b-2 border-line/10 py-3 last:border-b-0 md:items-center md:gap-4">
      <button
        type="button"
        onClick={() => playEntry(entry)}
        aria-label={`Nghe phát âm ${entry.headword}`}
        className="pressable grid size-11 shrink-0 place-items-center rounded-pill border-thick border-line bg-sky shadow-hard-sm"
      >
        <Icon icon={SpeakerHigh} size={20} color="ink" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_150px] md:items-center md:gap-4">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words font-display text-lg font-bold leading-tight">{entry.headword}</span>
            <SourceTag entry={entry} />
          </div>
          {entry.ipa && <span className="text-[13px] text-muted">{entry.ipa}</span>}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="break-words font-medium">{entry.meaning_vi}</span>
          {entry.personal_note && <span className="break-words text-[13px] italic text-muted">Ghi chú: {entry.personal_note}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] md:flex-col md:items-start">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <span className="size-3 rounded-pill border-2 border-line" style={{ background: `var(--color-${status.color})` }} aria-hidden="true" />
            {status.label}
          </span>
          <span className={cx(overdue ? 'font-semibold text-danger-deep' : 'text-muted')}>{formatDue(entry.progress.due_at)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onStar}
        aria-pressed={entry.is_starred}
        aria-label={entry.is_starred ? `Bỏ sao ${entry.headword}` : `Gắn sao ${entry.headword}`}
        className="grid size-11 shrink-0 place-items-center rounded-pill hover:bg-raised"
      >
        <Icon icon={Star} size={24} color={entry.is_starred ? 'gold' : 'neutral'} />
      </button>
      <RowMenu entry={entry} onEdit={onEdit} onNote={onNote} onRemove={onRemove} onDelete={onDelete} />
    </li>
  )
}

export default function CourseWordList({ courseId, version, onChanged }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('added')
  const [page, setPage] = useState({ items: [], total: 0, page: 1 })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // {entry, noteOnly}
  const [confirming, setConfirming] = useState(null) // từ tự tạo sắp xóa hẳn

  const load = useCallback(
    async (pageNo = 1) => {
      setLoading(true)
      try {
        const res = await coursesApi.listEntries(courseId, { q, filter, sort, page: pageNo, pageSize: PAGE_SIZE })
        setPage((prev) => (pageNo === 1 ? res : { ...res, items: [...prev.items, ...res.items] }))
      } catch (err) {
        toast('error', 'Không tải được danh sách từ', err.message)
      } finally {
        setLoading(false)
      }
    },
    [courseId, q, filter, sort],
  )

  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 200 : 0)
    return () => clearTimeout(t)
  }, [load, version, q])

  const replace = (row) => setPage((p) => ({ ...p, items: p.items.map((it) => (it.entry_id === row.entry_id ? row : it)) }))

  const star = async (entry) => {
    replace({ ...entry, is_starred: !entry.is_starred })
    try {
      replace(await coursesApi.updateEntry(courseId, entry.entry_id, { is_starred: !entry.is_starred }))
      onChanged({ silent: true })
    } catch (err) {
      replace(entry)
      toast('error', 'Chưa lưu được', err.message)
    }
  }

  const remove = async (entry) => {
    await coursesApi.removeEntry(courseId, entry.entry_id)
    toast('success', `Đã bỏ "${entry.headword}" khỏi khóa học`, entry.source === 'user' ? 'Từ vẫn còn trong danh sách ôn chung của bạn.' : 'Tiến độ học của từ vẫn được giữ.')
    onChanged()
  }

  const destroy = async (entry) => {
    setConfirming(null)
    await coursesApi.deleteCustom(entry.entry_id)
    toast('success', `Đã xóa "${entry.headword}"`)
    onChanged()
  }

  const save = async (payload) => {
    replace(await coursesApi.updateEntry(courseId, editing.entry.entry_id, payload))
    setEditing(null)
    toast('success', 'Đã lưu')
  }

  return (
    <section aria-labelledby="course-words" className="flex flex-col gap-4 rounded-panel border-thick border-line bg-surface p-4 shadow-hard md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h2 id="course-words" className="text-h3 uppercase">
          Danh sách từ <span className="font-num text-muted">({page.total})</span>
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row md:w-[520px]">
          <Input icon={MagnifyingGlass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm từ hoặc nghĩa" aria-label="Tìm từ" className="flex-1" />
          <Select options={SORTS} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sắp xếp" className="sm:w-40" />
        </div>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="radiogroup" aria-label="Lọc theo trạng thái">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="radio"
            aria-checked={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cx(
              'h-11 shrink-0 rounded-pill border-thick px-4 font-display text-[13px] font-bold uppercase transition-colors',
              filter === f.key ? 'border-line bg-ink text-white' : 'border-line/25 bg-bg hover:border-line',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {page.items.length === 0 && !loading ? (
        <p className="rounded-card bg-bg p-6 text-center text-muted">{q || filter !== 'all' ? 'Không có từ nào khớp bộ lọc.' : 'Khóa học chưa có từ nào. Bấm "Thêm từ" để bắt đầu.'}</p>
      ) : (
        <ul aria-busy={loading} className={cx(loading && page.items.length === 0 && 'min-h-40')}>
          {page.items.map((entry) => (
            <WordRow
              key={entry.entry_id}
              entry={entry}
              onStar={() => star(entry)}
              onEdit={() => setEditing({ entry, noteOnly: false })}
              onNote={() => setEditing({ entry, noteOnly: true })}
              onRemove={() => remove(entry)}
              onDelete={() => setConfirming(entry)}
            />
          ))}
        </ul>
      )}
      {page.items.length < page.total && (
        <Button variant="secondary" className="self-center" disabled={loading} onClick={() => load(page.page + 1)}>
          Xem thêm
        </Button>
      )}
      <EntryEditModal entry={editing?.entry} noteOnly={editing?.noteOnly} onClose={() => setEditing(null)} onSave={save} />
      <Modal open={Boolean(confirming)} onClose={() => setConfirming(null)} title="Xóa hẳn từ này?">
        <p className="mb-6">
          "<b>{confirming?.headword}</b>" sẽ bị gỡ khỏi mọi khóa học và mất tiến độ học. Chỉ muốn bỏ khỏi khóa này thì chọn "Bỏ khỏi khóa học".
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Hủy
          </Button>
          <Button variant="danger" icon={Trash} onClick={() => destroy(confirming)}>
            Xóa hẳn
          </Button>
        </div>
      </Modal>
    </section>
  )
}
