/*
 * Tab "Bài học" của trang duyệt: các bài của chủ đề (do bước 06 chia, tên bài AI đề xuất ở trạng thái draft). Người duyệt sửa
 * tên, duyệt tên; xem danh sách mục trong bài theo thứ tự dạy. Chưa chia bài thì hướng dẫn chạy bước 06.
 */

import { useEffect, useState } from 'react'
import { CheckCircle, FloppyDisk } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import cx from '../../utils/cx'
import { STATUS_LABEL, STATUS_TONE } from './fields'

function UnitCard({ unit, byKey, onSave, busy }) {
  const [title, setTitle] = useState(unit.title)
  useEffect(() => setTitle(unit.title), [unit.title])
  const size = unit.entries.length
  const okSize = size >= 16 && size <= 20

  return (
    <article className="rounded-card border-thick border-line bg-surface p-4 shadow-hard">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-[15px] font-bold uppercase">Bài {unit.position}</span>
        <span className={cx('rounded-full border-2 border-line px-2.5 py-0.5 text-[13px] font-semibold', STATUS_TONE[unit.title_status])}>
          Tên: {STATUS_LABEL[unit.title_status]}
        </span>
        <span className={cx('rounded-full border-2 border-line px-2.5 py-0.5 text-[13px] font-semibold', okSize ? 'bg-raised' : 'bg-danger')}>
          {size} mục
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          aria-label={`Tên bài ${unit.position}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-btn border-thick border-line bg-surface px-3 text-[15px] shadow-hard outline-none focus:border-primary"
        />
        <Button size="sm" variant="secondary" icon={FloppyDisk} disabled={busy || title === unit.title} onClick={() => onSave(unit, { title })}>
          Lưu
        </Button>
        <Button size="sm" variant="accent" icon={CheckCircle} disabled={busy} onClick={() => onSave(unit, { title, title_status: 'approved' })}>
          Duyệt tên
        </Button>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        {unit.entries.map((k) => byKey[k]?.headword ?? k).join(' · ')}
      </p>
    </article>
  )
}

export default function UnitsPanel({ units, entries, onSave, busy }) {
  if (!units.length) {
    return (
      <p className="rounded-card border-thick border-dashed border-line bg-surface p-6 text-[15px] text-muted">
        Chủ đề này chưa chia bài. Duyệt xong các mục rồi chạy <code className="font-num">python -m data_pipeline.06_build_units</code>.
      </p>
    )
  }
  const byKey = Object.fromEntries(entries.map((e) => [e.content_key, e]))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {units.map((u) => (
        <UnitCard key={u.content_key} unit={u} byKey={byKey} onSave={onSave} busy={busy} />
      ))}
    </div>
  )
}
