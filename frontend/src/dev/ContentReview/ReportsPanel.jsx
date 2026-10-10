/*
 * Tab "Báo lỗi" của trang duyệt (/dev/content): báo lỗi của người học gom theo mục, sắp theo số báo cáo (API
 * /admin/content-reports, CHỈ role admin — dev: đăng nhập dev_admin). Lọc open / resolved / dismissed / tất cả.
 * Mỗi nhóm: từ, content_key, số báo cáo theo loại, các trường cần xem, "đã sửa sau báo cáo" khi phiên bản hiện tại lớn hơn lúc
 * báo; từng báo cáo hiện ĐÚNG nội dung người học đã thấy (đề + lựa chọn + đáp án đúng, hoặc thẻ học) và ghi chú.
 * "Mở mục" chuyển sang tab Mục từ đúng mục đó, tô các trường cần xem (vd. Đáp án gây nhầm → cloze_en, cloze_distractors);
 * "Đã sửa xong" đánh dấu resolved mọi báo cáo đang mở của mục, "Bỏ qua" → dismissed.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowSquareOut, CheckCircle, Prohibit } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { REPORT_KINDS, fetchReports, setEntryReportStatus, setReportStatus } from '../../services/contentReportApi'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'

const STATUSES = [
  { value: 'open', label: 'Đang mở' },
  { value: 'resolved', label: 'Đã sửa' },
  { value: 'dismissed', label: 'Bỏ qua' },
  { value: 'all', label: 'Tất cả' },
]
const KIND_LABEL = Object.fromEntries(REPORT_KINDS.map((k) => [k.value, k.label]))
const SOURCE_LABEL = { unit_learn: 'Học bài', unit_test: 'Kiểm tra bài', topic_test: 'Bài tổng hợp chặng', topic_practice: 'Luyện chặng',
  boss: 'Trận Boss', review: 'Ôn tập', course: 'Khóa học', daily_check: 'Cửa Ải', other: 'Khác' }
const FIELD_LABEL = { cloze_en: 'Câu điền từ', cloze_distractors: 'Đáp án nhiễu Mức 4', meaning_vi: 'Nghĩa', example_en: 'Câu ví dụ',
  example_vi: 'Dịch câu ví dụ', ipa: 'IPA / phát âm' }

/** content_key "a1.food.rice.noun" → {level: 'A1', topic: 'food'} (mục mẫu DEV_SAMPLE không có content_key). */
export function locate(contentKey) {
  if (!contentKey) return null
  const [level, topic] = contentKey.split('.')
  return { level: level.toUpperCase(), topic }
}

function Snapshot({ snap }) {
  if (!snap) return null
  const options = snap.options ?? []
  return (
    <div className="rounded-btn border-2 border-line bg-surface px-3 py-2 text-[14px]">
      {snap.type ? (
        <>
          <p className="hud-label">Mức {snap.level} · người học đã thấy</p>
          <p className="mt-1 font-semibold text-ink">
            {snap.type === 'fill_blank' && snap.sentence}
            {snap.type === 'choose_meaning' && `${snap.word} — nghĩa là gì?`}
            {snap.type === 'type_word' && `Gõ từ: ${snap.prompt} (${snap.letter_count} chữ cái)`}
            {snap.type === 'listen' && 'Nghe và chọn từ'}
          </p>
          {options.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {options.map((o) => (
                <li key={o} className={cx('rounded-full border-2 border-line px-2.5 py-0.5 text-[13px] font-medium', o === snap.correct_answer ? 'bg-accent' : 'bg-bg')}>
                  {o}
                </li>
              ))}
            </ul>
          )}
          {!options.length && <p className="mt-1 text-[13px] text-muted">Đáp án đúng: <b className="text-ink">{snap.correct_answer}</b></p>}
        </>
      ) : (
        <>
          <p className="hud-label">Thẻ học · người học đã thấy</p>
          <p className="mt-1 font-semibold text-ink">{snap.headword} · {snap.meaning_vi}</p>
          {snap.example && <p className="italic text-ink/80">“{snap.example}”</p>}
        </>
      )}
    </div>
  )
}

export default function ReportsPanel({ onOpen }) {
  const [status, setStatus] = useState('open')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError(null)
    fetchReports(status).then(setData).catch((e) => setError(e))
  }, [status])
  useEffect(load, [load])

  const act = async (fn, title) => {
    setBusy(true)
    try {
      const res = await fn()
      useToastStore.getState().push({ variant: 'success', title, message: `${res.updated} báo cáo` })
      load()
    } catch (e) {
      useToastStore.getState().push({ variant: 'error', title: 'Chưa cập nhật được', message: e.message })
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <p className="rounded-btn border-2 border-line bg-gold-soft p-4 text-[15px]" role="alert">
        {error.status === 403 || error.code === 'FORBIDDEN'
          ? 'Tab Báo lỗi chỉ dành cho tài khoản admin. Dev: đăng nhập dev_admin (python -m seeds.seed_dev_accounts).'
          : `Không tải được báo lỗi: ${error.message}`}
      </p>
    )
  }

  return (
    <section aria-label="Báo lỗi của người học" className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className={cx('min-h-11 rounded-full border-2 border-line px-3 text-[13px] font-semibold', status === s.value ? 'bg-ink text-white' : 'bg-surface text-ink')}
          >
            {s.label}
          </button>
        ))}
      </div>
      {!data && <p className="text-muted">Đang tải…</p>}
      {data && data.groups.length === 0 && <p className="text-[15px] text-muted">Không có báo lỗi nào ở trạng thái này.</p>}
      <ul className="flex flex-col gap-3">
        {data?.groups.map((g) => {
          const where = locate(g.content_key)
          const edited = g.reports.some((r) => g.current_version > r.content_version)
          return (
            <li key={g.entry_id} className="flex flex-col gap-3 rounded-card border-thick border-line bg-surface p-4 shadow-hard">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-[22px] font-black text-ink">{g.headword}</span>
                    <span className="rounded-full bg-danger/20 px-2.5 font-display text-[13px] font-bold">{g.count} báo cáo</span>
                    {edited && <span className="rounded-full bg-accent px-2.5 text-[13px] font-semibold">đã sửa sau báo cáo (v{g.current_version})</span>}
                  </p>
                  <p className="font-num text-[13px] text-muted">{g.content_key ?? 'mục mẫu DEV_SAMPLE (không có trong file nội dung)'}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-[13px]">
                    {Object.entries(g.kinds).map(([k, n]) => (
                      <span key={k} className="rounded-full border-2 border-line bg-bg px-2">{KIND_LABEL[k] ?? k} × {n}</span>
                    ))}
                    {g.fields.map((f) => (
                      <span key={f} className="rounded-full bg-gold px-2 font-semibold">{FIELD_LABEL[f] ?? f}</span>
                    ))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {where && (
                    <Button size="sm" variant="secondary" icon={ArrowSquareOut} onClick={() => onOpen({ ...where, key: g.content_key, fields: g.fields, entryId: g.entry_id })}>
                      Mở mục
                    </Button>
                  )}
                  {status !== 'resolved' && status !== 'dismissed' && (
                    <>
                      <Button size="sm" variant="accent" icon={CheckCircle} disabled={busy} onClick={() => act(() => setEntryReportStatus(g.entry_id, 'resolved'), `Đã sửa xong "${g.headword}"`)}>
                        Đã sửa xong
                      </Button>
                      <Button size="sm" variant="secondary" icon={Prohibit} disabled={busy} onClick={() => act(() => setEntryReportStatus(g.entry_id, 'dismissed'), `Bỏ qua "${g.headword}"`)}>
                        Bỏ qua
                      </Button>
                    </>
                  )}
                  {(status === 'resolved' || status === 'dismissed') && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => setEntryReportStatus(g.entry_id, 'open'), `Mở lại "${g.headword}"`)}>
                      Mở lại
                    </Button>
                  )}
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {g.reports.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1.5 border-t-2 border-line/20 pt-2">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                      <b className="text-ink">{KIND_LABEL[r.kind] ?? r.kind}</b>
                      <span>· {SOURCE_LABEL[r.source] ?? r.source}</span>
                      <span>· v{r.content_version}</span>
                      <span>· {new Date(r.created_at).toLocaleString('vi-VN')}</span>
                      {r.status !== 'open' && <span className="rounded bg-raised px-1.5">{r.status}</span>}
                      {r.status === 'open' && (
                        <button className="ml-auto min-h-11 px-2 font-semibold text-primary hover:underline" disabled={busy}
                          onClick={() => act(() => setReportStatus(r.id, 'dismissed'), 'Đã bỏ qua một báo cáo')}>
                          Bỏ qua báo cáo này
                        </button>
                      )}
                    </p>
                    {r.note && <p className="text-[14px] text-ink">“{r.note}”</p>}
                    <Snapshot snap={r.snapshot} />
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
