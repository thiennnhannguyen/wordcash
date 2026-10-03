/*
 * Trang /courses "KHÓA HỌC CỦA TÔI": chỉ số "Từ của tôi đã thuộc", bộ lọc Đang học / Đã lưu trữ, lưới card khóa học
 * (3 cột desktop, 1 cột mobile), card "+ TẠO KHÓA HỌC" viền nét đứt. Chưa có khóa nào: linh vật Bánh Mì Bé
 * và 3 gợi ý tạo nhanh. Dữ liệu qua services/coursesApi.js (API thật hoặc mock).
 * Dev: `?demo=empty` xem trạng thái chưa có khóa học.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Archive, BookmarkSimple, CheckCircle, Plus } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import { getMascot } from '../../data/mascots'
import * as coursesApi from '../../services/coursesApi'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { COURSE_TEMPLATES, courseIcon } from '../../utils/courseIcons'
import CourseCard from './CourseCard'
import CourseFormModal from './CourseFormModal'

const EMPTY_MASCOT = getMascot(4) // Bánh Mì Bé

const toast = (variant, title, message) => useToastStore.getState().push({ variant, title, message })

function Tabs({ value, onChange }) {
  const tabs = [
    { key: 'active', label: 'Đang học', icon: BookmarkSimple },
    { key: 'archived', label: 'Đã lưu trữ', icon: Archive },
  ]
  return (
    <div role="tablist" aria-label="Lọc khóa học" className="inline-flex rounded-pill border-thick border-line bg-surface p-1 shadow-hard-sm">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            'inline-flex h-11 items-center gap-2 rounded-pill px-4 font-display text-sm font-bold uppercase transition-colors',
            value === t.key ? 'bg-ink text-white' : 'text-ink hover:bg-raised',
          )}
        >
          <Icon icon={t.icon} size={18} />
          {t.label}
        </button>
      ))}
    </div>
  )
}

function CreateCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-card border-thick border-dashed border-line bg-bg p-6 font-display text-base font-bold uppercase tracking-wide transition-colors hover:bg-raised"
    >
      <span className="grid size-14 place-items-center rounded-pill border-thick border-line bg-surface shadow-hard-sm">
        <Icon icon={Plus} size={28} />
      </span>
      Tạo khóa học
    </button>
  )
}

function EmptyState({ onCreate, onTemplate }) {
  return (
    <section className="flex flex-col items-center gap-6 rounded-panel border-thick border-dashed border-line bg-surface px-5 py-10 text-center md:py-14">
      <div className="relative">
        <div className="anim-breathe">
          <MascotBlob color={EMPTY_MASCOT.color} shape={EMPTY_MASCOT.shape} traits={EMPTY_MASCOT.traits} size={128} blink />
        </div>
        <Sticker bg="gold" tilt={8} size="sm" className="absolute -right-16 -top-2">
          Bộ từ của bạn!
        </Sticker>
      </div>
      <div className="flex max-w-lg flex-col gap-2">
        <h2 className="text-h2">Tạo bộ từ đầu tiên của bạn</h2>
        <p className="text-muted">
          Gom từ trong phim, trong công việc hay bài đọc trên lớp thành một khóa học riêng. {EMPTY_MASCOT.name} sẽ nhắc bạn ôn đúng lúc.
        </p>
      </div>
      <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {COURSE_TEMPLATES.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={() => onTemplate(t)}
            className="pressable flex items-center gap-3 rounded-card border-thick border-line bg-bg p-3 text-left shadow-hard hover:-translate-y-0.5"
          >
            <IconBadge icon={courseIcon(t.icon)} bg={t.color} size="md" shape="square" />
            <span className="font-heading font-extrabold leading-tight">{t.title}</span>
          </button>
        ))}
      </div>
      <Button icon={Plus} onClick={onCreate}>
        Tự đặt tên
      </Button>
    </section>
  )
}

export default function MyCourses() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const demoEmpty = import.meta.env.DEV && params.get('demo') === 'empty'
  const [tab, setTab] = useState('active')
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ open: false, course: null })

  const load = useCallback(async () => {
    try {
      const res = await coursesApi.listCourses({ archived: tab === 'archived' })
      setData(demoEmpty ? { ...res, items: [], mastered_total: 0 } : res)
    } catch (err) {
      toast('error', 'Không tải được khóa học', err.message)
      setData({ items: [], mastered_total: 0 })
    }
  }, [tab, demoEmpty])

  useEffect(() => {
    load()
  }, [load])

  const create = async (values) => {
    const course = await coursesApi.createCourse(values)
    setForm({ open: false, course: null })
    toast('success', 'Đã tạo khóa học', `"${course.title}" đã sẵn sàng. Thêm từ đầu tiên nhé!`)
    navigate(`/courses/${course.id}?add=1`)
  }

  const quickCreate = async (template) => {
    try {
      await create(template)
    } catch (err) {
      toast('error', 'Chưa tạo được khóa học', err.message)
    }
  }

  const restore = async (course) => {
    await coursesApi.setArchived(course.id, false)
    toast('success', 'Đã khôi phục', `"${course.title}" đã quay lại danh sách đang học.`)
    load()
  }

  const items = data?.items ?? []
  const loading = data === null
  const showEmpty = !loading && tab === 'active' && items.length === 0

  return (
    <div className="flex flex-col gap-6 pb-24 md:gap-8 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <span className="hud-label text-muted">Bộ từ của riêng bạn</span>
          <h1 className="text-[36px] uppercase leading-none md:text-h1">Khóa học của tôi</h1>
          <span className="inline-flex items-center gap-2 self-start rounded-pill border-thick border-line bg-accent px-4 py-1.5 font-display text-sm font-bold uppercase shadow-hard-sm">
            <Icon icon={CheckCircle} size={20} color="ink" />
            Từ của tôi đã thuộc: <span className="font-num text-base">{data?.mastered_total ?? '–'}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={tab} onChange={setTab} />
          <Button icon={Plus} className="max-md:hidden" onClick={() => setForm({ open: true, course: null })}>
            Tạo khóa học
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[260px] rounded-card border-thick border-line/20 bg-raised" />
          ))}
        </div>
      ) : showEmpty ? (
        <EmptyState onCreate={() => setForm({ open: true, course: null })} onTemplate={quickCreate} />
      ) : items.length === 0 ? (
        <p className="rounded-card border-thick border-dashed border-line bg-surface p-8 text-center text-muted">Chưa có khóa học nào được lưu trữ.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((course, i) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex min-w-0">
              <CourseCard course={course} onRestore={restore} className="w-full" />
            </motion.div>
          ))}
          {tab === 'active' && <CreateCard onClick={() => setForm({ open: true, course: null })} />}
        </div>
      )}

      <CourseFormModal open={form.open} course={form.course} onClose={() => setForm({ open: false, course: null })} onSubmit={create} />
    </div>
  )
}
