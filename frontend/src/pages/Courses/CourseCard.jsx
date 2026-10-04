/*
 * Card một khóa học ở trang /courses: icon trong ô màu của khóa, tên, số từ, vòng tiến độ (đã thuộc / tổng),
 * dòng "3 từ đến hạn ôn", nút HỌC nhanh (ôn đến hạn nếu có, không thì học mới, không thì ôn nhanh).
 * `preview`: bản xem trước trong hộp thoại Tạo/Sửa (không bấm được).
 */

import { useNavigate } from 'react-router-dom'
import { ArrowCounterClockwise, Clock, Play } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import ProgressRing from '../../components/ui/ProgressRing'
import cx from '../../utils/cx'
import { courseIcon } from '../../utils/courseIcons'

export function quickMode(course) {
  if (course.due_count > 0) return 'review'
  if (course.word_count > course.mastered_count) return 'learn'
  return 'quick'
}

export default function CourseCard({ course, preview = false, onRestore, className }) {
  const navigate = useNavigate()
  const words = course.word_count ?? 0
  const mastered = course.mastered_count ?? 0
  const pct = words ? Math.round((mastered / words) * 100) : 0
  const archived = Boolean(course.archived_at)
  const open = () => !preview && navigate(`/courses/${course.id}`)

  return (
    <article
      className={cx(
        'relative flex min-w-0 flex-col overflow-hidden rounded-card border-thick border-line bg-surface shadow-hard',
        !preview && 'lift',
        archived && 'opacity-80',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b-thick border-line px-4 py-4" style={{ background: `var(--color-${course.color})` }}>
        <IconBadge icon={courseIcon(course.icon)} bg="surface" size="lg" shape="square" />
        <ProgressRing value={mastered} max={Math.max(words, 1)} size={60} stroke={8} tone="accent" label={`Đã thuộc ${mastered}/${words} từ`}>
          <span className="font-num text-[13px]">{pct}%</span>
        </ProgressRing>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {/* Vùng bấm phủ cả card để mở chi tiết; nút HỌC nằm trên lớp này */}
        {!preview && (
          <button type="button" onClick={open} className="absolute inset-0 z-0 rounded-card" aria-label={`Mở khóa học ${course.title}`} />
        )}
        <h3 className="line-clamp-2 break-words font-heading text-xl font-extrabold leading-tight">{course.title || 'Tên khóa học'}</h3>
        <p className="text-caption text-muted">
          <span className="font-num text-ink">{words}</span> từ · <span className="font-num text-ink">{mastered}</span> đã thuộc
        </p>
        <p className={cx('flex items-center gap-1.5 text-caption font-semibold', course.due_count > 0 ? 'text-danger-deep' : 'text-muted')}>
          <Icon icon={Clock} size={16} />
          {course.due_count > 0 ? `${course.due_count} từ đến hạn ôn` : 'Chưa có từ đến hạn'}
        </p>
        <div className="relative z-10 mt-auto pt-3">
          {archived ? (
            <Button variant="secondary" size="sm" icon={ArrowCounterClockwise} fullWidth onClick={() => onRestore?.(course)}>
              Khôi phục
            </Button>
          ) : (
            <Button
              size="sm"
              icon={Play}
              fullWidth
              disabled={preview || words === 0}
              onClick={() => navigate(`/courses/${course.id}/study?mode=${quickMode(course)}`)}
            >
              {words === 0 ? 'Chưa có từ' : 'Học'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
