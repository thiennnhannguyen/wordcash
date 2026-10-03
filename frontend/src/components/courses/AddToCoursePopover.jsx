/*
 * Nút "+ Thêm vào khóa học của tôi" kèm popover chọn khóa học hoặc tạo khóa mới ngay tại chỗ.
 * Dùng ở thẻ học từ (Học Viện), màn "Từ bạn đã sai" sau trận đấu và card "Từ của ngày" ở Sảnh.
 *
 * Desktop: popover bám nút; mobile (< 768px): hộp thoại (popover dễ bị cắt trong các dải cuộn ngang).
 * `word`: {id?, headword, meaning_vi}. Có id mục từ trong kho thì liên kết thẳng; chưa có thì coursesApi.addWordToCourse
 * tìm đúng chữ trong kho (không có mới tạo từ riêng). Từ đã có trong khóa hiện dấu tích.
 */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Plus } from '@phosphor-icons/react'
import Button from '../ui/Button'
import Icon, { IconBadge } from '../ui/Icon'
import Modal from '../ui/Modal'
import useMediaQuery from '../../hooks/useMediaQuery'
import * as coursesApi from '../../services/coursesApi'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { courseIcon } from '../../utils/courseIcons'

const toast = (variant, title, message) => useToastStore.getState().push({ variant, title, message })

export default function AddToCoursePopover({ word, size = 'sm', variant = 'secondary', label = 'Thêm vào khóa học của tôi', align = 'left', className }) {
  const [open, setOpen] = useState(false)
  const [courses, setCourses] = useState(null)
  const [added, setAdded] = useState(new Set())
  const [busy, setBusy] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)
  const desktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (!open) return undefined
    coursesApi
      .listCourses()
      .then((res) => setCourses(res.items))
      .catch(() => setCourses([]))
    if (!desktop) return undefined
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false)
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, desktop])

  const addTo = async (course) => {
    setBusy(course.id)
    try {
      await coursesApi.addWordToCourse(course.id, word)
      setAdded((s) => new Set(s).add(course.id))
      toast('success', `Đã thêm "${word.headword}"`, `Vào khóa "${course.title}".`)
    } catch (err) {
      if (err.code === 'DUPLICATE_IN_COURSE') setAdded((s) => new Set(s).add(course.id))
      toast(err.code === 'DUPLICATE_IN_COURSE' ? 'info' : 'error', err.code === 'DUPLICATE_IN_COURSE' ? 'Đã có sẵn' : 'Chưa thêm được', err.message)
    } finally {
      setBusy(null)
    }
  }

  const createAndAdd = async (event) => {
    event.preventDefault()
    if (!newTitle.trim()) return
    setBusy('new')
    try {
      const course = await coursesApi.createCourse({ title: newTitle.trim(), icon: 'book-open', color: 'primary' })
      setCourses((cs) => [{ ...course, mastered_count: 0, due_count: 0 }, ...(cs ?? [])])
      setNewTitle('')
      setCreating(false)
      await addTo(course)
    } catch (err) {
      toast('error', 'Chưa tạo được khóa học', err.message)
      setBusy(null)
    }
  }

  const panel = (
    <>
            <p className="px-1 font-display text-[13px] font-bold uppercase">
              Thêm "<span className="normal-case">{word.headword}</span>" vào…
            </p>
            {courses === null ? (
              <div className="h-24" aria-busy="true" />
            ) : (
              <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                {courses.map((course) => {
                  const done = added.has(course.id)
                  return (
                    <li key={course.id}>
                      <button
                        type="button"
                        disabled={done || busy === course.id}
                        onClick={() => addTo(course)}
                        className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-2 py-1.5 text-left hover:bg-raised disabled:hover:bg-transparent"
                      >
                        <IconBadge icon={courseIcon(course.icon)} bg={course.color} size="sm" shape="square" shadow={false} />
                        <span className="min-w-0 flex-1 truncate font-semibold">{course.title}</span>
                        {done ? <Icon icon={CheckCircle} size={22} color="accent-deep" label="Đã thêm" /> : <Icon icon={Plus} size={20} color="muted" />}
                      </button>
                    </li>
                  )
                })}
                {courses.length === 0 && <li className="px-1 text-caption text-muted">Bạn chưa có khóa học nào.</li>}
              </ul>
            )}
            {creating ? (
              <form onSubmit={createAndAdd} className="flex gap-2 border-t-2 border-line/15 pt-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={60}
                  autoFocus
                  placeholder="Tên khóa học mới"
                  aria-label="Tên khóa học mới"
                  className="h-11 min-w-0 flex-1 rounded-btn border-thick border-line px-3 font-medium outline-none focus:border-primary"
                />
                <Button type="submit" size="sm" disabled={!newTitle.trim() || busy === 'new'}>
                  Tạo
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex h-11 items-center gap-2 rounded-[12px] border-t-2 border-line/15 px-2 font-display text-[13px] font-bold uppercase hover:bg-raised"
              >
                <Icon icon={Plus} size={18} /> Tạo khóa học mới
              </button>
            )}
    </>
  )

  if (!desktop) {
    return (
      <div className={className}>
        <Button variant={variant} size={size} icon={Plus} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {label}
        </Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Thêm vào khóa học">
          <div className="flex flex-col gap-2">{panel}</div>
        </Modal>
      </div>
    )
  }

  return (
    <div ref={ref} className={cx('relative', className)}>
      <Button variant={variant} size={size} icon={Plus} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={`Thêm "${word.headword}" vào khóa học`}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cx(
              'absolute bottom-full z-40 mb-2 flex w-[min(320px,calc(100vw-32px))] flex-col gap-2 rounded-card border-thick border-line bg-surface p-3 text-ink shadow-hard-lg',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {panel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
