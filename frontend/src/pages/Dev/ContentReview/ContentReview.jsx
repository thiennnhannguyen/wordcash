/*
 * Trang duyệt nội dung kho từ /dev/content (CHỈ bản dev; backend chỉ có API khi ENV=development).
 *
 * - Thanh bên: các chủ đề của cấp, mỗi chủ đề "đã duyệt x/y" và số mục có cờ.
 * - Danh sách: lọc theo trạng thái (nháp / đã duyệt / từ chối / có cờ), tìm theo từ, nghĩa, câu ví dụ.
 * - Khung chi tiết (EntryDetail): sửa trường, loa, cờ, câu hỏi mẫu, viết lại một trường (chế độ agent: hàng đợi, mục hiện
 *   "Đang chờ viết lại"; có bản mới thì chọn bản cũ / mới), Duyệt / Từ chối / Bỏ qua.
 * - Phím tắt (khi không gõ trong ô): A duyệt, R từ chối (hỏi lý do), S bỏ qua, J mục trước, K mục sau.
 * - Tab "Bài học": duyệt tên bài do bước 06 đề xuất.
 * Mọi thay đổi ghi thẳng file backend/content/<cấp>/<chủ-đề>.json qua API; sau mỗi lần lưu backend kiểm lại cờ.
 * Tham số xem nhanh: ?topic=food&status=draft&q=rice&key=a1.food.rice.noun&tab=units
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Select from '../../../components/ui/Select'
import ProgressBar from '../../../components/ui/ProgressBar'
import { useToastStore } from '../../../store/toastStore'
import { fetchLevels, fetchTopic, patchEntry, patchUnit, resolveRewrite } from '../../../services/devContentApi'
import cx from '../../../utils/cx'
import { STATUS_TONE } from './fields'
import EntryDetail from './EntryDetail'
import UnitsPanel from './UnitsPanel'

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'flagged', label: 'Có cờ' },
]
const toast = (variant, title, message) => useToastStore.getState().push({ variant, title, message })
const warnings = (e, info = []) => e.flags.filter((f) => !info.includes(f))
const typing = (el) => el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)

export default function ContentReview() {
  const [params, setParams] = useSearchParams()
  const [levels, setLevels] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(null) // patch đang chờ lý do từ chối
  const [reason, setReason] = useState('')
  const saveRef = useRef(null)

  const level = params.get('level') ?? 'A1'
  const topicCode = params.get('topic')
  const status = params.get('status') ?? 'all'
  const query = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'entries'
  const setParam = useCallback(
    (patch) => setParams((p) => {
      const next = new URLSearchParams(p)
      Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? next.delete(k) : next.set(k, v)))
      return next
    }, { replace: true }),
    [setParams],
  )

  useEffect(() => {
    fetchLevels().then(setLevels).catch((e) => setError(e.message))
  }, [])
  const topics = levels?.find((l) => l.level === level)?.topics ?? []
  const activeTopic = topicCode ?? topics.find((t) => t.total > 0)?.code ?? topics[0]?.code

  useEffect(() => {
    if (!activeTopic) return
    setData(null)
    fetchTopic(level, activeTopic).then(setData).catch((e) => setData({ missing: e.message }))
  }, [level, activeTopic])

  const list = useMemo(() => {
    if (!data?.entries) return []
    const q = query.trim().toLowerCase()
    return data.entries.filter((e) => {
      if (status === 'flagged' ? !(warnings(e, data.info_flags).length && e.status !== 'rejected') : status !== 'all' && e.status !== status) return false
      return !q || [e.headword, e.meaning_vi, e.example_en].some((s) => s?.toLowerCase().includes(q))
    })
  }, [data, status, query])
  const index = Math.max(0, list.findIndex((e) => e.content_key === params.get('key')))
  const entry = list[index]

  const go = useCallback((delta) => {
    const next = list[index + delta]
    if (next) setParam({ key: next.content_key })
  }, [list, index, setParam])

  const applyResult = useCallback((res) => {
    setData((d) => ({ ...d, entries: d.entries.map((e) => (e.content_key === res.entry.content_key ? res.entry : e)), summary: res.summary }))
    setLevels((ls) => ls?.map((l) => (l.level !== level ? l : { ...l, topics: l.topics.map((t) => (t.code === res.summary.code ? res.summary : t)) })))
  }, [level])

  const save = useCallback(async (patch, { advance = false } = {}) => {
    if (!entry) return
    setBusy(true)
    try {
      const res = await patchEntry(level, activeTopic, entry.content_key, patch)
      applyResult(res)
      if (advance) go(1)
      return res
    } catch (e) {
      toast('error', 'Chưa lưu được', e.message)
      return null
    } finally {
      setBusy(false)
    }
  }, [entry, level, activeTopic, applyResult, go])

  const approve = useCallback((patch) => save({ ...patch, status: 'approved' }, { advance: true }), [save])
  const askReject = useCallback((patch) => {
    setReason(entry?.reject_reason ?? '')
    setRejecting(patch)
  }, [entry])
  const confirmReject = async () => {
    if (!reason.trim()) return
    const ok = await save({ ...rejecting, status: 'rejected', reject_reason: reason.trim() }, { advance: true })
    if (ok) setRejecting(null)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (typing(document.activeElement) || rejecting || e.metaKey || e.ctrlKey || e.altKey || tab !== 'entries' || !entry) return
      const key = e.key.toLowerCase()
      const current = saveRef.current?.patch() ?? {}
      if (key === 'a') approve(current)
      else if (key === 'r') askReject(current)
      else if (key === 's' || key === 'k') go(1)
      else if (key === 'j') go(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [approve, askReject, go, rejecting, tab, entry])

  const rewritesOf = (key) => (data?.rewrites ?? []).filter((r) => r.content_key === key)
  const onRewriteQueued = (item) => {
    setData((d) => ({ ...d, rewrites: [...(d.rewrites ?? []).filter((r) => !(r.content_key === item.content_key && r.field === item.field)), item] }))
    toast('success', 'Đã gửi yêu cầu viết lại', 'Mục ở trạng thái "Đang chờ viết lại" cho tới khi hàng đợi được xử lý.')
  }
  const onResolveRewrite = async (item, accept) => {
    setBusy(true)
    try {
      const res = await resolveRewrite(level, activeTopic, item.id, accept)
      applyResult(res)
      setData((d) => ({ ...d, rewrites: res.rewrites }))
      toast('success', accept ? 'Đã dùng bản mới' : 'Đã giữ bản cũ', item.headword)
    } catch (e) {
      toast('error', 'Chưa lưu được', e.message)
    } finally {
      setBusy(false)
    }
  }

  const saveUnit = async (unit, patch) => {
    setBusy(true)
    try {
      const res = await patchUnit(level, activeTopic, unit.content_key, patch)
      setData((d) => ({ ...d, units: d.units.map((u) => (u.content_key === unit.content_key ? res.unit : u)) }))
      toast('success', 'Đã lưu tên bài', res.unit.title)
    } catch (e) {
      toast('error', 'Chưa lưu được', e.message)
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="p-6 text-danger-deep">Không mở được công cụ duyệt: {error}</p>

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex flex-wrap items-center gap-3 border-b-thick border-line bg-surface px-4 py-3 md:px-6">
        <h1 className="font-heading text-h3 font-black text-ink">Duyệt nội dung</h1>
        <span className="rounded-full border-2 border-line bg-gold px-2.5 py-0.5 font-display text-[13px] font-bold uppercase">Chỉ dev</span>
        <div className="ml-auto flex gap-2" role="tablist">
          {[['entries', 'Mục từ'], ['units', 'Bài học']].map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={tab === v}
              onClick={() => setParam({ tab: v === 'entries' ? null : v })}
              className={cx('min-h-11 rounded-btn border-thick border-line px-4 font-display text-[14px] font-bold uppercase',
                tab === v ? 'bg-primary text-white' : 'bg-surface text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[240px_300px_minmax(0,1fr)]">
        <nav aria-label="Chủ đề" className="flex flex-col gap-2">
          <Select
            className="lg:hidden"
            label="Chủ đề"
            value={activeTopic ?? ''}
            onChange={(e) => setParam({ topic: e.target.value, key: null })}
            options={topics.map((t) => ({ value: t.code, label: `${t.title} · ${t.approved}/${t.total}` }))}
          />
          <p className="hud-label hidden lg:block">Cấp {level}</p>
          <ul className="hidden flex-col gap-2 lg:flex">
            {topics.map((t) => (
              <li key={t.code}>
                <button
                  onClick={() => setParam({ topic: t.code, key: null })}
                  className={cx('w-full rounded-btn border-thick border-line p-3 text-left shadow-hard',
                    t.code === activeTopic ? 'bg-raised' : 'bg-surface')}
                >
                  <span className="block text-[15px] font-bold text-ink">{t.title}</span>
                  <span className="mt-1 flex items-center justify-between text-[13px] text-muted">
                    <span>đã duyệt {t.approved}/{t.total}</span>
                    {t.flagged > 0 && <span className="rounded-full bg-gold px-2 font-semibold text-ink">{t.flagged} cờ</span>}
                  </span>
                  <ProgressBar value={t.approved} max={t.total || 1} size="sm" className="mt-2" label={undefined} />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {tab === 'units' ? (
          <div className="lg:col-span-2">
            {data?.units ? <UnitsPanel units={data.units} entries={data.entries} onSave={saveUnit} busy={busy} /> : <p className="text-muted">Đang tải…</p>}
          </div>
        ) : (
          <>
            <section aria-label="Danh sách mục" className="flex flex-col gap-3">
              <Input icon={MagnifyingGlass} placeholder="Tìm từ, nghĩa, câu ví dụ" value={query} onChange={(e) => setParam({ q: e.target.value })} aria-label="Tìm" />
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setParam({ status: f.value === 'all' ? null : f.value, key: null })}
                    className={cx('min-h-11 rounded-full border-2 border-line px-3 text-[13px] font-semibold',
                      status === f.value ? 'bg-ink text-white' : 'bg-surface text-ink')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[13px] text-muted">{list.length} mục</p>
              <ul className="flex max-h-[70dvh] flex-col gap-1.5 overflow-y-auto pr-1">
                {data?.missing && <li className="text-[14px] text-muted">Chưa có file nội dung cho chủ đề này (chạy bước 03).</li>}
                {list.map((e, i) => (
                  <li key={e.content_key}>
                    <button
                      onClick={() => setParam({ key: e.content_key })}
                      className={cx('flex min-h-11 w-full items-center gap-2 rounded-btn border-2 px-3 py-2 text-left',
                        i === index ? 'border-primary bg-raised' : 'border-line bg-surface')}
                    >
                      <span className={cx('size-3 shrink-0 rounded-full border-2 border-line', STATUS_TONE[e.status])} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{e.headword}</span>
                        <span className="block truncate text-[13px] text-muted">{e.meaning_vi || '—'}</span>
                      </span>
                      {rewritesOf(e.content_key).length > 0 && (
                        <span className="rounded-full bg-sky/40 px-2 text-[13px] font-semibold text-ink" title="Có yêu cầu viết lại">
                          {rewritesOf(e.content_key).some((r) => r.status === 'ready') ? 'mới' : 'chờ'}
                        </span>
                      )}
                      {warnings(e, data.info_flags).length > 0 && e.status !== 'rejected' && (
                        <span className="rounded-full bg-gold px-2 text-[13px] font-semibold text-ink">{warnings(e, data.info_flags).length}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <main className="min-w-0 rounded-panel border-thick border-line bg-bg p-4 md:p-5">
              {entry ? (
                <EntryDetail
                  entry={entry}
                  flagHelp={data.flag_help}
                  infoFlags={data.info_flags}
                  level={level}
                  topic={activeTopic}
                  busy={busy}
                  saveRef={saveRef}
                  onSave={(patch) => save(patch).then((r) => r && toast('success', 'Đã lưu', entry.headword))}
                  onApprove={approve}
                  onReject={askReject}
                  onSkip={() => go(1)}
                  onPrev={() => go(-1)}
                  onNext={() => go(1)}
                  queueMode={data.ai_provider !== 'anthropic'}
                  rewrites={rewritesOf(entry.content_key)}
                  onRewriteQueued={onRewriteQueued}
                  onResolveRewrite={onResolveRewrite}
                />
              ) : (
                <p className="text-[15px] text-muted">{data ? 'Không có mục nào khớp bộ lọc.' : 'Đang tải…'}</p>
              )}
            </main>
          </>
        )}
      </div>

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={`Từ chối "${entry?.headword ?? ''}"`}
        footer={
          <div className="flex justify-end gap-3">
            <Button size="sm" variant="secondary" onClick={() => setRejecting(null)}>
              Hủy
            </Button>
            <Button size="sm" variant="danger" disabled={!reason.trim() || busy} onClick={confirmReject}>
              Từ chối
            </Button>
          </div>
        }
      >
        <label htmlFor="reject-reason" className="hud-label">
          Lý do (bắt buộc)
        </label>
        <textarea
          id="reject-reason"
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), confirmReject())}
          className="mt-2 w-full rounded-btn border-thick border-line bg-surface px-3 py-2 text-[15px] shadow-hard outline-none focus:border-primary"
        />
      </Modal>
    </div>
  )
}
