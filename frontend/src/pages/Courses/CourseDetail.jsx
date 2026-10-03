/*
 * Trang chi tiết khóa học /courses/:id.
 * - Đầu trang tô màu theo khóa học: icon, tên, mô tả, nút Thêm từ / Sửa / Lưu trữ / Xóa; thanh 4 trạng thái nhiều màu.
 * - 5 nút chế độ học (Học mới, Ôn đến hạn, Ôn nhanh, Từ khó, Kiểm tra) kèm số từ áp dụng; nút không có từ thì mờ.
 *   Mobile: cuộn ngang.
 * - Danh sách từ (CourseWordList) và panel Thêm từ (AddWordsPanel). `?add=1` mở sẵn panel (sau khi vừa tạo khóa).
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Archive, ArrowCounterClockwise, ArrowLeft, PencilSimple, Plus, Target, Trash } from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import * as coursesApi from '../../services/coursesApi'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { courseIcon, onCourseColor } from '../../utils/courseIcons'
import AddWordsPanel from './AddWordsPanel'
import CourseFormModal from './CourseFormModal'
import CourseWordList from './CourseWordList'
import { MODES, STATUS, STATUS_ORDER } from './courseUi'

const toast = (variant, title, message) => useToastStore.getState().push({ variant, title, message })

function StatusBar({ stats }) {
  const total = stats.word_count
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 w-full overflow-hidden rounded-pill border-thick border-line bg-surface" role="img" aria-label={STATUS_ORDER.map((s) => `${STATUS[s].label}: ${stats.by_status[s]}`).join(', ')}>
        {total > 0 &&
          STATUS_ORDER.map((s) =>
            stats.by_status[s] > 0 ? (
              <span key={s} className="h-full border-r-2 border-line last:border-r-0" style={{ width: `${(stats.by_status[s] / total) * 100}%`, background: `var(--color-${STATUS[s].color})` }} />
            ) : null,
          )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold md:text-caption">
        {STATUS_ORDER.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span className="size-3.5 rounded-pill border-2 border-line" style={{ background: `var(--color-${STATUS[s].color})` }} aria-hidden="true" />
            {STATUS[s].label} <span className="font-num">{stats.by_status[s]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ModeButtons({ stats, onStart }) {
  return (
    <section aria-label="Chế độ học" className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-1 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
      {MODES.map((mode) => {
        const count = stats.modes[mode.key]
        const disabled = count === 0
        return (
          <button
            key={mode.key}
            type="button"
            disabled={disabled}
            onClick={() => onStart(mode.key)}
            className={cx(
              'flex w-[156px] shrink-0 snap-start flex-col gap-3 rounded-card border-thick border-line bg-surface p-4 text-left md:w-auto',
              disabled ? 'cursor-not-allowed opacity-45' : 'pressable shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <IconBadge icon={mode.icon} bg={mode.bg} size="md" shape="square" shadow={false} />
              <span className="font-num text-2xl">{count}</span>
            </div>
            <div>
              <div className="font-display text-base font-bold uppercase leading-tight">{mode.label}</div>
              <div className="text-[13px] text-muted">{disabled && mode.key === 'learn' && stats.by_status.new > 0 ? 'Đủ từ mới hôm nay' : mode.hint}</div>
            </div>
          </button>
        )
      })}
    </section>
  )
}

export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [course, setCourse] = useState(null)
  const [missing, setMissing] = useState(false)
  const [version, setVersion] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const addOpen = params.get('add') === '1'

  const load = useCallback(async () => {
    try {
      setCourse(await coursesApi.getCourse(id))
    } catch (err) {
      if (err.code === 'COURSE_NOT_FOUND') setMissing(true)
      else toast('error', 'Không tải được khóa học', err.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const changed = ({ silent = false } = {}) => {
    load()
    if (!silent) setVersion((v) => v + 1)
  }

  const setAdd = (open) => setParams(open ? { add: '1' } : {}, { replace: true })

  if (missing) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-h2">Không tìm thấy khóa học</h1>
        <p className="text-muted">Khóa học này không tồn tại hoặc đã bị xóa.</p>
        <Button icon={ArrowLeft} onClick={() => navigate('/courses')}>
          Về Khóa học của tôi
        </Button>
      </div>
    )
  }
  if (!course) return <div className="min-h-[60vh]" aria-busy="true" />

  const { stats } = course
  const archived = Boolean(course.archived_at)
  const textOn = onCourseColor(course.color)

  const archive = async () => {
    await coursesApi.setArchived(course.id, !archived)
    toast('success', archived ? 'Đã khôi phục khóa học' : 'Đã lưu trữ khóa học', archived ? undefined : 'Bạn có thể khôi phục ở tab Đã lưu trữ.')
    load()
  }

  const remove = async () => {
    await coursesApi.deleteCourse(course.id)
    toast('success', `Đã xóa "${course.title}"`, 'Tiến độ học các từ vẫn được giữ.')
    navigate('/courses')
  }

  return (
    <div className="flex flex-col gap-6 pb-24 md:gap-8 md:pb-0">
      <header className={cx('relative flex flex-col gap-5 overflow-hidden rounded-panel border-thick border-line p-5 shadow-hard-lg md:p-7', textOn)} style={{ background: `var(--color-${course.color})` }}>
        <Link to="/courses" className="inline-flex h-11 items-center gap-1.5 self-start font-display text-[13px] font-bold uppercase underline-offset-4 hover:underline">
          <Icon icon={ArrowLeft} size={18} /> Khóa học của tôi
        </Link>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <IconBadge icon={courseIcon(course.icon)} bg="surface" size="xl" shape="square" className="max-md:size-16" />
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="break-words text-[32px] leading-[1.05] md:text-[44px]">{course.title}</h1>
              {course.description && <p className="max-w-2xl font-medium opacity-90">{course.description}</p>}
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption font-semibold">
                <span>
                  <span className="font-num text-base">{stats.word_count}</span> từ
                </span>
                <span>
                  <span className="font-num text-base">{stats.due_count}</span> đến hạn ôn
                </span>
                {stats.accuracy_7d !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Icon icon={Target} size={16} /> Chính xác 7 ngày: <span className="font-num text-base">{Math.round(stats.accuracy_7d * 100)}%</span>
                  </span>
                )}
                {archived && <span className="rounded-pill border-2 border-current px-2">Đã lưu trữ</span>}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" icon={Plus} className="whitespace-nowrap max-md:flex-1" onClick={() => setAdd(true)}>
              Thêm từ
            </Button>
            <IconButton icon={PencilSimple} size="sm" label="Sửa khóa học" onClick={() => setEditOpen(true)} />
            <IconButton icon={archived ? ArrowCounterClockwise : Archive} size="sm" label={archived ? 'Khôi phục' : 'Lưu trữ'} onClick={archive} />
            <IconButton icon={Trash} size="sm" label="Xóa khóa học" onClick={() => setConfirmDelete(true)} />
          </div>
        </div>
        <div className="rounded-card border-thick border-line bg-surface p-4 text-ink">
          <StatusBar stats={stats} />
        </div>
      </header>

      <ModeButtons stats={stats} onStart={(mode) => navigate(`/courses/${course.id}/study?mode=${mode}`)} />

      <CourseWordList courseId={course.id} version={version} onChanged={changed} />

      <AddWordsPanel open={addOpen} courseId={course.id} courseTitle={course.title} onClose={() => setAdd(false)} onAdded={() => changed()} />
      <CourseFormModal
        open={editOpen}
        course={{ ...course, mastered_count: stats.by_status.mastered }}
        onClose={() => setEditOpen(false)}
        onSubmit={async (values) => {
          await coursesApi.updateCourse(course.id, values)
          setEditOpen(false)
          toast('success', 'Đã lưu khóa học')
          load()
        }}
      />
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Xóa khóa học?">
        <p className="mb-6">
          Khóa "<b>{course.title}</b>" sẽ bị xóa hẳn. Tiến độ học các từ vẫn được giữ; từ tự tạo vẫn nằm trong danh sách ôn chung. Muốn ẩn tạm thì chọn Lưu trữ.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Hủy
          </Button>
          {!archived && (
            <Button variant="secondary" icon={Archive} onClick={() => {
                setConfirmDelete(false)
                archive()
              }}>
              Lưu trữ
            </Button>
          )}
          <Button variant="danger" icon={Trash} onClick={remove}>
            Xóa hẳn
          </Button>
        </div>
      </Modal>
    </div>
  )
}
