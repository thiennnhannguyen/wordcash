/*
 * Panel "Thêm từ" trượt từ phải (desktop rộng 520px; mobile thành tấm trượt toàn màn hình), 3 tab:
 * a) Tìm trong kho: gõ là gợi ý ngay (/bank/search: từ, CEFR, nghĩa), bấm "+" để thêm; từ đã có trong khóa hiện dấu tích.
 * b) Tự tạo: từ, nghĩa (bắt buộc), loại từ, phiên âm, ví dụ, ghi chú. Gõ trúng một từ có trong kho thì hiện banner
 *    gợi ý dùng bản trong kho (đủ phát âm và ví dụ).
 * c) Nhập nhiều: dán văn bản hoặc chọn file CSV → Xem trước (server phân loại, tô màu theo trạng thái) → THÊM N TỪ.
 * Mọi kiểm tra trùng/khớp kho đều do server (hoặc mock) làm; panel chỉ hiển thị kết quả.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  DownloadSimple,
  FileCsv,
  MagnifyingGlass,
  PencilSimpleLine,
  Plus,
  Sparkle,
  Stack,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import LevelTag from '../../components/ui/LevelTag'
import Select from '../../components/ui/Select'
import useMediaQuery from '../../hooks/useMediaQuery'
import * as coursesApi from '../../services/coursesApi'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'

const toast = (variant, title, message) => useToastStore.getState().push({ variant, title, message })

const TABS = [
  { key: 'search', label: 'Tìm trong kho', icon: MagnifyingGlass },
  { key: 'custom', label: 'Tự tạo', icon: PencilSimpleLine },
  { key: 'import', label: 'Nhập nhiều', icon: Stack },
]

export const POS_OPTIONS = [
  { value: '', label: 'Chọn loại từ (không bắt buộc)' },
  { value: 'danh từ', label: 'Danh từ' },
  { value: 'động từ', label: 'Động từ' },
  { value: 'tính từ', label: 'Tính từ' },
  { value: 'trạng từ', label: 'Trạng từ' },
  { value: 'cụm từ', label: 'Cụm từ' },
  { value: 'thành ngữ', label: 'Thành ngữ' },
]

function useDebounced(value, ms = 220) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/* ---------- a) Tìm trong kho ---------- */

function SearchTab({ courseId, onAdded, onCreateCustom }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [adding, setAdding] = useState(null)
  const debounced = useDebounced(q.trim())

  useEffect(() => {
    let alive = true
    if (!debounced) {
      setResults(null)
      return undefined
    }
    coursesApi
      .bankSearch(debounced, courseId)
      .then((rows) => alive && setResults(rows))
      .catch(() => alive && setResults([]))
    return () => {
      alive = false
    }
  }, [debounced, courseId])

  const add = async (row) => {
    setAdding(row.id)
    try {
      await coursesApi.addFromBank(courseId, row.id)
      setResults((rs) => rs.map((r) => (r.id === row.id ? { ...r, in_course: true } : r)))
      onAdded()
    } catch (err) {
      toast('error', 'Chưa thêm được', err.message)
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Tìm từ trong kho WORDCLASH"
        icon={MagnifyingGlass}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Gõ từ tiếng Anh, ví dụ: deploy"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      {results === null ? (
        <p className="rounded-card bg-raised p-4 text-caption text-muted">
          Từ trong kho có sẵn phát âm, ví dụ và cấp độ. Học ở đây cũng được tính vào rank như ở Học Viện.
        </p>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card border-thick border-dashed border-line p-4">
          <p className="font-semibold">Kho chưa có "{q.trim()}".</p>
          <Button variant="secondary" size="sm" icon={PencilSimpleLine} onClick={() => onCreateCustom(q.trim())}>
            Tự tạo từ này
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Kết quả tìm kiếm">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-card border-thick border-line bg-surface p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold">{r.headword}</span>
                  {r.cefr && <LevelTag level={r.cefr} size="sm" />}
                  {r.pos && <span className="text-caption text-muted">{r.pos}</span>}
                </div>
                <span className="truncate text-caption">{r.meaning_vi}</span>
              </div>
              {r.in_course ? (
                <span className="inline-flex h-11 shrink-0 items-center gap-1 px-2 text-caption font-semibold text-accent-deep">
                  <Icon icon={CheckCircle} size={22} color="accent-deep" />
                  Đã có
                </span>
              ) : (
                <IconButton icon={Plus} label={`Thêm ${r.headword}`} variant="accent" size="sm" disabled={adding === r.id} onClick={() => add(r)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- b) Tự tạo ---------- */

const EMPTY_CUSTOM = { headword: '', meaning_vi: '', pos: '', ipa: '', example: '', note: '' }

function CustomTab({ courseId, initialWord, onAdded }) {
  const [form, setForm] = useState({ ...EMPTY_CUSTOM, headword: initialWord ?? '' })
  const [match, setMatch] = useState(null)
  const [force, setForce] = useState(false)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const exampleId = useId()
  const word = useDebounced(form.headword.trim(), 300)

  // Gõ trúng từ có trong kho → banner gợi ý
  useEffect(() => {
    let alive = true
    setForce(false)
    if (!word) {
      setMatch(null)
      return undefined
    }
    coursesApi
      .bankSearch(word, courseId)
      .then((rows) => alive && setMatch(rows.find((r) => r.headword.toLowerCase() === word.toLowerCase()) ?? null))
      .catch(() => alive && setMatch(null))
    return () => {
      alive = false
    }
  }, [word, courseId])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const done = (title) => {
    toast('success', title, 'Từ đã vào khóa học và sẽ có trong lượt ôn của bạn.')
    setForm(EMPTY_CUSTOM)
    setMatch(null)
    setError(null)
    onAdded()
  }

  const useBank = async () => {
    setPending(true)
    try {
      await coursesApi.addFromBank(courseId, match.id, form.note.trim() || null)
      done(`Đã thêm "${match.headword}" từ kho`)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.headword.trim() || !form.meaning_vi.trim()) {
      setError('Bạn điền từ và nghĩa nhé.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await coursesApi.createCustom(courseId, { ...form, force })
      done(`Đã tạo "${form.headword.trim()}"`)
    } catch (err) {
      if (err.code === 'SYSTEM_ENTRY_EXISTS') setMatch({ ...err.details.suggestions[0], in_course: false })
      else if (err.code === 'CUSTOM_ENTRY_EXISTS') {
        try {
          await coursesApi.addFromBank(courseId, err.details.entry.id, form.note.trim() || null)
          done(`Đã thêm lại "${err.details.entry.headword}" bạn tạo trước đây`)
        } catch (inner) {
          setError(inner.message)
        }
      } else setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Từ tiếng Anh *" value={form.headword} maxLength={100} onChange={set('headword')} placeholder="Ví dụ: refactor" autoFocus autoComplete="off" spellCheck={false} />

      <AnimatePresence>
        {match && !force && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="status"
            className="flex flex-col gap-3 rounded-card border-thick border-line bg-raised p-4 shadow-hard-sm"
          >
            <p className="flex items-start gap-2 font-semibold">
              <Icon icon={Sparkle} size={22} color="primary" className="mt-0.5 shrink-0" />
              <span>
                Từ này có trong kho {match.cefr && <>({match.cefr}) </>}với đầy đủ phát âm và ví dụ – dùng bản trong kho?
                <span className="mt-1 block text-caption font-medium text-muted">
                  {match.headword} · {match.meaning_vi}
                </span>
              </span>
            </p>
            {match.in_course ? (
              <p className="text-caption font-semibold text-accent-deep">Từ này đã có trong khóa học.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={pending} onClick={useBank}>
                  Dùng bản trong kho
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setForce(true)}>
                  Vẫn tạo từ riêng
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Input label="Nghĩa tiếng Việt *" value={form.meaning_vi} maxLength={300} onChange={set('meaning_vi')} placeholder="Ví dụ: tái cấu trúc mã" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Loại từ" options={POS_OPTIONS} value={form.pos} onChange={set('pos')} />
        <Input label="Phiên âm" value={form.ipa} maxLength={100} onChange={set('ipa')} placeholder="/riːˈfæktə/" />
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
          placeholder="Câu có chứa từ này (dùng cho câu hỏi điền vào chỗ trống)"
          className="resize-none rounded-btn border-thick border-line bg-surface px-4 py-3 font-medium shadow-hard outline-none placeholder:text-muted/70 focus:border-primary focus:shadow-focus"
        />
      </div>
      <Input label="Ghi chú của bạn" value={form.note} maxLength={300} onChange={set('note')} placeholder="Gặp ở đâu, mẹo nhớ…" />

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-card border-2 border-danger bg-surface p-3 text-caption font-semibold text-danger-deep">
          <Icon icon={WarningCircle} size={20} className="shrink-0" />
          {error}
        </p>
      )}
      <p className="text-caption text-muted">Từ tự tạo được học và ôn như bình thường nhưng không tính vào rank và lượt quay.</p>
      <Button type="submit" fullWidth icon={Plus} disabled={pending || (match && !force && !match.in_course)}>
        {pending ? 'Đang lưu…' : 'Tạo và thêm vào khóa'}
      </Button>
    </form>
  )
}

/* ---------- c) Nhập nhiều ---------- */

const ROW_STYLE = {
  new_custom: { label: 'Mới', chip: 'bg-accent', row: 'border-accent-deep/40 bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-surface))]' },
  match_system: { label: 'Khớp kho', chip: 'bg-primary text-white', row: 'border-primary/40 bg-raised' },
  match_own: { label: 'Từ của bạn', chip: 'bg-primary text-white', row: 'border-primary/40 bg-raised' },
  duplicate_in_course: { label: 'Trùng', chip: 'bg-gold', row: 'border-gold bg-gold-soft' },
  invalid: { label: 'Lỗi', chip: 'bg-danger', row: 'border-danger/50 bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface))]' },
}
const ADDABLE = ['new_custom', 'match_system', 'match_own']

const GUIDE = {
  lines: 'Mỗi dòng một từ: từ - nghĩa. Có thể dùng dấu -, : hoặc Tab. Dòng bắt đầu bằng # sẽ bỏ qua.',
  csv: 'Dòng đầu là tiêu đề: word, meaning (bắt buộc), example, note.',
}
const PLACEHOLDER = {
  lines: 'deploy - triển khai\nbug: lỗi phần mềm\nplot twist - cú lừa của cốt truyện',
  csv: 'word,meaning,example,note\ndeploy,triển khai,We deploy every Friday.,IT',
}

function ImportTab({ courseId, onAdded }) {
  const [format, setFormat] = useState('lines')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [skip, setSkip] = useState(new Set())
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const fileRef = useRef(null)
  const textId = useId()

  const reset = () => {
    setPreview(null)
    setSkip(new Set())
  }

  const loadFile = async (file) => {
    if (!file) return
    setFormat('csv')
    setText(await file.text())
    reset()
  }

  const runPreview = async () => {
    setPending(true)
    setError(null)
    try {
      setPreview(await coursesApi.importPreview(courseId, { text, format }))
      setSkip(new Set())
    } catch (err) {
      setError(err.message)
      setPreview(null)
    } finally {
      setPending(false)
    }
  }

  const commit = async () => {
    setPending(true)
    try {
      const res = await coursesApi.importCommit(courseId, { text, format, skip_lines: [...skip] })
      toast('success', `Đã thêm ${res.added} từ`, `${res.created_custom} từ tự tạo · ${res.linked} từ liên kết kho`)
      setText('')
      reset()
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  const toggle = (line) =>
    setSkip((s) => {
      const next = new Set(s)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })

  const addCount = preview ? preview.rows.filter((r) => ADDABLE.includes(r.status) && !skip.has(r.line)).length : 0

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Định dạng" className="inline-flex self-start rounded-pill border-thick border-line bg-surface p-1">
        {[
          ['lines', 'Từ - nghĩa'],
          ['csv', 'CSV'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={format === key}
            onClick={() => {
              setFormat(key)
              reset()
            }}
            className={cx('h-11 rounded-pill px-4 font-display text-sm font-bold uppercase', format === key ? 'bg-ink text-white' : 'hover:bg-raised')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-card bg-raised p-4 text-caption">
        <p className="font-semibold">{GUIDE[format]}</p>
        <p className="text-muted">Tối đa 200 dòng mỗi lần. Từ đã có trong kho sẽ được liên kết để có sẵn phát âm và ví dụ.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href="/mau-nhap-tu.csv"
            download
            className="inline-flex h-11 items-center gap-1.5 rounded-btn border-thick border-line bg-surface px-3 font-display text-[13px] font-bold uppercase shadow-hard-sm hover:-translate-y-0.5"
          >
            <Icon icon={DownloadSimple} size={18} /> Tải file CSV mẫu
          </a>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-11 items-center gap-1.5 rounded-btn border-thick border-line bg-surface px-3 font-display text-[13px] font-bold uppercase shadow-hard-sm hover:-translate-y-0.5"
          >
            <Icon icon={FileCsv} size={18} /> Chọn file
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => loadFile(e.target.files?.[0])} />
        </div>
      </div>

      <label htmlFor={textId} className="hud-label">
        Dán danh sách từ
      </label>
      <textarea
        id={textId}
        rows={7}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          reset()
        }}
        placeholder={PLACEHOLDER[format]}
        spellCheck={false}
        className="-mt-2 resize-y rounded-btn border-thick border-line bg-surface px-4 py-3 font-medium shadow-hard outline-none placeholder:text-muted/60 focus:border-primary focus:shadow-focus"
      />
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-card border-2 border-danger bg-surface p-3 text-caption font-semibold text-danger-deep">
          <Icon icon={WarningCircle} size={20} className="shrink-0" />
          {error}
        </p>
      )}
      {!preview && (
        <Button variant="secondary" fullWidth disabled={!text.trim() || pending} onClick={runPreview}>
          {pending ? 'Đang đọc…' : 'Xem trước'}
        </Button>
      )}

      {preview && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" aria-label="Tóm tắt">
            {Object.entries(preview.counts)
              .filter(([, n]) => n > 0)
              .map(([status, n]) => (
                <span key={status} className={cx('rounded-pill border-2 border-line px-2.5 py-0.5 text-[13px] font-bold', ROW_STYLE[status].chip)}>
                  {ROW_STYLE[status].label}: {n}
                </span>
              ))}
          </div>
          <ul className="flex flex-col gap-2" aria-label="Bảng xem trước">
            {preview.rows.map((row) => {
              const style = ROW_STYLE[row.status]
              const addable = ADDABLE.includes(row.status)
              return (
                <li key={row.line} className={cx('flex items-start gap-3 rounded-[14px] border-2 p-3', style.row, skip.has(row.line) && 'opacity-50')}>
                  {addable ? (
                    <input
                      type="checkbox"
                      checked={!skip.has(row.line)}
                      onChange={() => toggle(row.line)}
                      aria-label={`Thêm dòng ${row.line}`}
                      className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
                    />
                  ) : (
                    <Icon icon={row.status === 'invalid' ? XCircle : WarningCircle} size={20} color={row.status === 'invalid' ? 'danger-deep' : 'ink'} className="mt-0.5 shrink-0" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-num text-[13px] text-muted">#{row.line}</span>
                      <span className="break-words font-bold">{row.headword || '—'}</span>
                      {row.cefr && <LevelTag level={row.cefr} size="sm" />}
                    </div>
                    <span className="break-words text-caption">{row.status === 'match_system' ? row.system_meaning : row.meaning || '—'}</span>
                    {row.reason && <span className="text-[13px] font-semibold text-danger-deep">{row.reason}</span>}
                    {row.status === 'match_system' && <span className="text-[13px] text-muted">Dùng nghĩa trong kho, giữ ghi chú của bạn</span>}
                  </div>
                  <span className={cx('shrink-0 rounded-pill border-2 border-line px-2 text-[13px] font-bold leading-6', style.chip)}>{style.label}</span>
                </li>
              )
            })}
          </ul>
          <div className="sticky bottom-0 -mx-1 flex gap-2 bg-surface px-1 pb-1 pt-2">
            <Button variant="ghost" onClick={reset}>
              Sửa lại
            </Button>
            <Button fullWidth icon={Plus} disabled={!addCount || pending} onClick={commit} className="flex-1">
              {pending ? 'Đang thêm…' : `Thêm ${addCount} từ`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Panel ---------- */

export default function AddWordsPanel({ open, courseId, courseTitle, onClose, onAdded }) {
  const [tab, setTab] = useState('search')
  const [customWord, setCustomWord] = useState('')
  const desktop = useMediaQuery('(min-width: 768px)')
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex justify-end bg-ink/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={desktop ? { x: '100%' } : { y: '100%' }}
            animate={desktop ? { x: 0 } : { y: 0 }}
            exit={desktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            className={cx(
              'flex flex-col bg-surface',
              desktop ? 'h-dvh w-[520px] border-l-thick border-line shadow-hard-xl' : 'mt-auto h-[calc(100dvh-12px)] w-full rounded-t-panel border-t-thick border-line',
            )}
          >
            <header className="flex flex-col gap-4 border-b-thick border-line px-4 pb-3 pt-4 md:px-6 md:pt-6">
              {!desktop && <span className="mx-auto block h-1.5 w-12 rounded-pill bg-neutral" aria-hidden="true" />}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-h3 uppercase">
                    Thêm từ
                  </h2>
                  <p className="truncate text-caption text-muted">vào "{courseTitle}"</p>
                </div>
                <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-2 grid size-11 shrink-0 place-items-center rounded-pill text-muted hover:bg-raised hover:text-ink">
                  <Icon icon={XCircle} size={30} />
                </button>
              </div>
              <div role="tablist" aria-label="Cách thêm từ" className="grid grid-cols-3 gap-1 rounded-btn border-thick border-line bg-bg p-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={cx(
                      'flex h-11 items-center justify-center gap-1.5 rounded-[12px] px-1 font-display text-[13px] font-bold uppercase transition-colors',
                      tab === t.key ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-raised',
                    )}
                  >
                    <Icon icon={t.icon} size={18} className="max-sm:hidden" />
                    {t.label}
                  </button>
                ))}
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6">
              {tab === 'search' && (
                <SearchTab
                  courseId={courseId}
                  onAdded={onAdded}
                  onCreateCustom={(word) => {
                    setCustomWord(word)
                    setTab('custom')
                  }}
                />
              )}
              {tab === 'custom' && <CustomTab key={customWord} courseId={courseId} initialWord={customWord} onAdded={onAdded} />}
              {tab === 'import' && <ImportTab courseId={courseId} onAdded={onAdded} />}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
