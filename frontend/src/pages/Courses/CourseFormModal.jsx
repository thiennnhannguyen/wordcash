/*
 * Hộp thoại Tạo / Sửa khóa học: tên (1–60), mô tả (≤300), chọn icon (24 icon Phosphor), chọn màu (token màu),
 * card xem trước cập nhật ngay khi chọn. Mobile: tấm trượt toàn màn hình.
 */

import { useEffect, useId, useState } from 'react'
import { Check } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import cx from '../../utils/cx'
import { COURSE_COLORS, COURSE_ICONS } from '../../utils/courseIcons'
import CourseCard from './CourseCard'

const EMPTY = { title: '', description: '', icon: 'book-open', color: 'primary' }

export default function CourseFormModal({ open, course, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const descId = useId()
  const editing = Boolean(course?.id)

  useEffect(() => {
    if (open) {
      setForm(course ? { title: course.title, description: course.description ?? '', icon: course.icon, color: course.color } : EMPTY)
      setError(null)
    }
  }, [open, course])

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Bạn đặt tên cho khóa học nhé.')
      return
    }
    setPending(true)
    try {
      await onSubmit({ ...form, title: form.title.trim(), description: form.description.trim() || null })
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Sửa khóa học' : 'Tạo khóa học'} mobileSheet className="max-w-3xl">
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Input
            label="Tên khóa học"
            value={form.title}
            maxLength={60}
            placeholder="Ví dụ: Từ vựng IT"
            onChange={(e) => set('title')(e.target.value)}
            status={error ? 'error' : undefined}
            hint={error ?? `${form.title.length}/60 ký tự`}
            autoFocus
          />
          <div className="flex flex-col gap-2">
            <label htmlFor={descId} className="hud-label">
              Mô tả (không bắt buộc)
            </label>
            <textarea
              id={descId}
              value={form.description}
              maxLength={300}
              rows={2}
              placeholder="Bộ từ này dùng để làm gì?"
              onChange={(e) => set('description')(e.target.value)}
              className="resize-none rounded-btn border-thick border-line bg-surface px-4 py-3 font-medium shadow-hard outline-none placeholder:text-muted/70 focus:border-primary focus:shadow-focus"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="hud-label mb-2">Biểu tượng</legend>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {Object.entries(COURSE_ICONS).map(([name, Glyph]) => (
                <label
                  key={name}
                  className={cx(
                    'grid aspect-square min-h-11 cursor-pointer place-items-center rounded-[14px] border-thick transition-colors has-[:focus-visible]:shadow-focus',
                    form.icon === name ? 'border-line bg-gold shadow-hard-sm' : 'border-line/20 bg-bg hover:border-line hover:bg-raised',
                  )}
                >
                  <input type="radio" name="course-icon" value={name} checked={form.icon === name} onChange={() => set('icon')(name)} className="sr-only" aria-label={name} />
                  <Icon icon={Glyph} size={24} color="ink" />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="hud-label mb-2">Màu</legend>
            <div className="flex flex-wrap gap-3">
              {COURSE_COLORS.map((c) => (
                <label
                  key={c.key}
                  title={c.label}
                  className={cx(
                    'grid size-12 cursor-pointer place-items-center rounded-pill border-thick border-line transition-transform has-[:focus-visible]:shadow-focus',
                    form.color === c.key ? 'scale-110 shadow-hard-sm' : 'hover:-translate-y-0.5',
                  )}
                  style={{ background: `var(--color-${c.key})` }}
                >
                  <input type="radio" name="course-color" value={c.key} checked={form.color === c.key} onChange={() => set('color')(c.key)} className="sr-only" aria-label={c.label} />
                  {form.color === c.key && <Icon icon={Check} size={22} color={c.key === 'primary' ? 'white' : 'ink'} />}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-3">
          <span className="hud-label">Xem trước</span>
          <CourseCard preview course={{ ...form, word_count: course?.word_count ?? 0, mastered_count: course?.mastered_count ?? 0, due_count: 0 }} />
        </div>

        <div className="flex flex-col-reverse gap-3 md:col-span-2 md:flex-row md:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo khóa học'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
