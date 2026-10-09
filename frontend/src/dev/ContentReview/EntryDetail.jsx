/*
 * Khung chi tiết một mục trên trang duyệt: mọi trường sửa trực tiếp, loa đọc thử (Web Speech API, en-US), các cờ kèm giải thích,
 * câu hỏi mẫu mức 1–4, viết lại từng trường (chế độ agent: "Gửi yêu cầu viết lại" → nhãn "Đang chờ viết lại" → khi hàng đợi
 * đã xử lý thì bản cũ / bản mới hiện cạnh nhau ngay dưới trường để chọn), ghi chú duyệt. Thanh hành động: Duyệt (A), Từ chối (R, bắt buộc lý do),
 * Bỏ qua (S), Mục sau (J), Mục trước (K) — theo quy ước Gmail / Vim, Lưu (khi có thay đổi chưa lưu).
 */

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, FloppyDisk, HourglassMedium, MagicWand, PaperPlaneTilt, SkipForward, SpeakerHigh, Warning, XCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { speak } from '../../utils/speech'
import cx from '../../utils/cx'
import { FIELDS, STATUS_LABEL, STATUS_TONE, changedFields, fromForm, toForm } from './fields'
import RewriteModal, { VersionCompare } from './RewriteModal'
import SampleQuestions from './SampleQuestions'

const box = 'w-full rounded-btn border-thick border-line bg-surface px-3 py-2 text-[15px] text-ink shadow-hard outline-none focus:border-primary'

export default function EntryDetail({
  entry, flagHelp, infoFlags = [], level, topic, busy, onSave, onApprove, onReject, onSkip, onPrev, onNext, saveRef,
  queueMode = true, rewrites = [], onRewriteQueued, onResolveRewrite,
}) {
  const [form, setForm] = useState(() => toForm(entry))
  const [note, setNote] = useState(entry.review_note ?? '')
  const [rewrite, setRewrite] = useState(null)

  useEffect(() => {
    setForm(toForm(entry))
    setNote(entry.review_note ?? '')
  }, [entry])

  const changes = changedFields(entry, form)
  const dirty = Object.keys(changes).length > 0 || note !== (entry.review_note ?? '')
  const patch = () => ({ ...changes, ...(note !== (entry.review_note ?? '') ? { review_note: note } : {}) })
  if (saveRef) saveRef.current = { patch, dirty }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const current = fromForm(form)

  return (
    <section className="flex flex-col gap-5" aria-label={`Mục ${entry.headword}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-h3 font-black text-ink">{entry.headword}</h2>
            <span className="rounded-full border-2 border-line bg-raised px-2.5 py-0.5 font-display text-[13px] font-bold uppercase">{entry.pos}</span>
            <span className={cx('rounded-full border-2 border-line px-2.5 py-0.5 text-[13px] font-semibold', STATUS_TONE[entry.status])}>
              {STATUS_LABEL[entry.status]}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-[15px] text-muted">
            {current.ipa || 'chưa có IPA'}
            {entry.flags.filter((f) => infoFlags.includes(f)).map((f) => (
              <span key={f} className="rounded bg-raised px-1.5 text-[13px] font-semibold text-ink" title={flagHelp?.[f]}>{f}</span>
            ))}
            {entry.ipa_unverified && <span className="rounded bg-gold px-1.5 text-[13px] font-semibold text-ink">IPA chưa xác minh</span>}
            {rewrites.some((r) => r.status === 'queued') && (
              <span className="rounded bg-sky/40 px-1.5 text-[13px] font-semibold text-ink">Đang chờ viết lại</span>
            )}
          </p>
          <p className="mt-1 font-num text-[13px] text-muted">{entry.content_key}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="sky" icon={SpeakerHigh} onClick={() => speak(entry.headword)} aria-label="Đọc từ">
            Từ
          </Button>
          <Button size="sm" variant="secondary" icon={SpeakerHigh} onClick={() => speak(current.example_en)} aria-label="Đọc câu ví dụ">
            Câu
          </Button>
        </div>
      </header>

      {entry.flags.some((f) => !infoFlags.includes(f)) && (
        <ul className="flex flex-col gap-2" aria-label="Cờ cần xem">
          {entry.flags.filter((f) => !infoFlags.includes(f)).map((f) => (
            <li key={f} className="flex gap-2 rounded-btn border-2 border-line bg-gold-soft px-3 py-2 text-[14px] text-ink">
              <Icon icon={Warning} size={20} color="orange" className="mt-0.5 shrink-0" />
              <span>
                <b className="font-display uppercase">{f}</b> — {flagHelp?.[f] ?? ''}
                {entry.flag_details?.[f] && <span className="block text-muted">{entry.flag_details[f]}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {entry.status === 'rejected' && entry.reject_reason && (
        <p className="rounded-btn border-2 border-line bg-danger/20 px-3 py-2 text-[14px]">Lý do từ chối: {entry.reject_reason}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => {
          const pending = rewrites.find((r) => r.field === f.key)
          return (
            <div key={f.key} className={cx('flex flex-col gap-1.5', (f.kind === 'text' || f.kind === 'list' || pending) && 'md:col-span-2')}>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`f-${f.key}`} className="hud-label">
                  {f.label}
                </label>
                {pending?.status === 'queued' ? (
                  <span className="inline-flex min-h-11 items-center gap-1 px-2 text-[13px] font-semibold text-muted">
                    <Icon icon={HourglassMedium} size={16} color="sky" /> Đang chờ viết lại
                  </span>
                ) : f.ai && !pending && (
                  <button
                    type="button"
                    onClick={() => setRewrite(f)}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-primary hover:bg-raised"
                  >
                    <Icon icon={queueMode ? PaperPlaneTilt : MagicWand} size={16} color="primary" />
                    {queueMode ? 'Gửi yêu cầu viết lại' : 'Nhờ AI viết lại'}
                  </button>
                )}
              </div>
              {f.kind === 'text' || f.kind === 'list' ? (
                <textarea id={`f-${f.key}`} rows={f.kind === 'list' ? 3 : 2} value={form[f.key]} onChange={set(f.key)} className={box} />
              ) : (
                <input
                  id={`f-${f.key}`}
                  type={f.kind === 'number' ? 'number' : 'text'}
                  min={f.kind === 'number' ? 1 : undefined}
                  max={f.kind === 'number' ? 5 : undefined}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  className={cx(box, 'h-11')}
                />
              )}
              {pending?.status === 'ready' && (
                <div className="mt-1 flex flex-col gap-2 rounded-card border-2 border-line bg-surface p-3" aria-label={`Bản viết lại: ${f.label}`}>
                  {pending.note && <p className="text-[13px] text-muted">Ghi chú: {pending.note}</p>}
                  <VersionCompare oldValue={entry[f.key]} newValue={pending.new} />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => onResolveRewrite(pending, false)}>
                      Giữ bản cũ
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => onResolveRewrite(pending, true)}>
                      Dùng bản mới
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-note" className="hud-label">
          Ghi chú duyệt
        </label>
        <textarea id="review-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={box} />
        {entry.reviewed_at && <p className="text-[13px] text-muted">Duyệt lần cuối: {new Date(entry.reviewed_at).toLocaleString('vi-VN')}</p>}
      </div>

      <div>
        <h3 className="mb-2 font-display text-[15px] font-bold uppercase tracking-wider text-ink">Câu hỏi mẫu</h3>
        <SampleQuestions level={level} topic={topic} entryKey={entry.content_key} version={`${entry.example_en}|${entry.meaning_vi}`} />
      </div>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t-2 border-line bg-bg px-1 py-3">
        <Button size="sm" variant="accent" icon={CheckCircle} disabled={busy} onClick={() => onApprove(patch())}>
          Duyệt (A)
        </Button>
        <Button size="sm" variant="danger" icon={XCircle} disabled={busy} onClick={() => onReject(patch())}>
          Từ chối (R)
        </Button>
        <Button size="sm" variant="secondary" icon={SkipForward} disabled={busy} onClick={onSkip}>
          Bỏ qua (S)
        </Button>
        <Button size="sm" variant="secondary" icon={ArrowLeft} onClick={onPrev} aria-label="Mục trước (K)">
          Trước (K)
        </Button>
        <Button size="sm" variant="secondary" icon={ArrowRight} onClick={onNext} aria-label="Mục sau (J)">
          Sau (J)
        </Button>
        <Button size="sm" icon={FloppyDisk} disabled={busy || !dirty} onClick={() => onSave(patch())} className="ml-auto">
          Lưu
        </Button>
      </div>

      <RewriteModal
        open={Boolean(rewrite)}
        onClose={() => setRewrite(null)}
        level={level}
        topic={topic}
        entryKey={entry.content_key}
        field={rewrite?.key}
        label={rewrite?.label}
        queueMode={queueMode}
        onQueued={(item) => {
          onRewriteQueued(item)
          setRewrite(null)
        }}
        onPick={(value) => {
          setForm((f) => ({ ...f, [rewrite.key]: Array.isArray(value) ? value.join('\n') : value }))
          setRewrite(null)
        }}
      />
    </section>
  )
}
