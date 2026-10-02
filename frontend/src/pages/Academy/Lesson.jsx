/*
 * Học một bài: chọn chế độ theo từ, theo cụm, theo họ từ, trong ngữ cảnh.
 *
 * Luồng: chọn chế độ → lật thẻ từng mục từ (vuốt ngang trên mobile) → luyện tập 4 mức → hoàn thành.
 * Chế độ "Trong ngữ cảnh" đi thẳng tới đoạn văn và câu hỏi hiểu bài. Màn toàn màn hình, không có thanh điều hướng.
 *
 * Dev: `?step=mode|cards|practice|context|done`, `&i=4` (thẻ thứ 5), `&q=2` (câu luyện tập thứ 3).
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Article, ListBullets, SpeakerHigh, TextAa, TreeStructure } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { IconBadge } from '../../components/ui/Icon'
import LevelTag from '../../components/ui/LevelTag'
import Modal from '../../components/ui/Modal'
import WordCard from '../../components/academy/WordCard'
import { speak } from '../../utils/speech'
import { ENTRIES, LESSON, PREVIEW_DONE } from './lessonMock'
import LessonContext from './LessonContext'
import LessonDone from './LessonDone'
import LessonPractice from './LessonPractice'
import LessonTopBar from './LessonTopBar'

const MODES = [
  { key: 'word', label: 'Theo từ', text: 'Từng từ kèm phát âm, nghĩa và ví dụ.', sample: 'reliable · đáng tin cậy', icon: TextAa, bg: 'sky' },
  { key: 'phrase', label: 'Theo cụm', text: 'Học từ trong các cụm đi kèm tự nhiên.', sample: 'meet a deadline', icon: ListBullets, bg: 'accent' },
  { key: 'family', label: 'Theo họ từ', text: 'Một gốc, nhiều dạng: danh từ, động từ, tính từ.', sample: 'decide → decision → decisive', icon: TreeStructure, bg: 'gold' },
  { key: 'context', label: 'Trong ngữ cảnh', text: 'Đọc đoạn văn ngắn rồi trả lời câu hỏi.', sample: '~80 từ · 3 câu hỏi', icon: Article, bg: 'orange' },
]

const SWIPE_THRESHOLD = 90

function ModePicker({ onPick, onExit }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <LessonTopBar value={0} max={ENTRIES.length} onExit={onExit} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 pb-12 pt-8 md:justify-center md:px-8">
        <div className="flex flex-col gap-2 md:items-center md:text-center">
          <div className="flex flex-wrap items-center gap-2">
            <LevelTag level={LESSON.level} size="sm" />
            <span className="font-display text-sm font-bold uppercase">{LESSON.topic}</span>
          </div>
          <h1 className="text-[32px] leading-tight md:text-[44px]">
            Bài {LESSON.number}: {LESSON.title}
          </h1>
          <p className="text-muted md:text-lg">{ENTRIES.length} mục từ · Chọn cách bạn muốn học hôm nay</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onPick(m.key)}
              className="pressable flex items-center gap-4 rounded-card border-thick border-line bg-surface p-5 text-left shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg md:items-start md:p-6"
            >
              <IconBadge icon={m.icon} bg={m.bg} size="lg" shape="square" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-heading text-2xl font-extrabold leading-tight">{m.label}</span>
                <span className="text-caption font-medium text-muted">{m.text}</span>
                <span className="mt-1 self-start rounded-pill bg-raised px-2.5 font-display text-xs font-bold leading-6">{m.sample}</span>
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

function CardsStep({ mode, startAt, onFinish, onExit }) {
  const [index, setIndex] = useState(startAt)
  const [direction, setDirection] = useState(1)
  const entry = ENTRIES[index]
  const isLast = index === ENTRIES.length - 1

  const go = useCallback(
    (delta) => {
      const target = index + delta
      if (target < 0) return
      if (target >= ENTRIES.length) {
        onFinish()
        return
      }
      setDirection(delta)
      setIndex(target)
      window.scrollTo({ top: 0 })
    },
    [index, onFinish],
  )

  // Phím mũi tên để chuyển thẻ trên desktop
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <LessonTopBar value={index + 1} max={ENTRIES.length} label={MODES.find((m) => m.key === mode)?.label} onExit={onExit} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-x-clip px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={entry.word}
            custom={direction}
            initial={{ x: direction * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) go(1)
              else if (info.offset.x > SWIPE_THRESHOLD) go(-1)
            }}
            className="touch-pan-y"
          >
            <WordCard entry={entry} level={LESSON.level} emphasis={mode} />
          </motion.div>
        </AnimatePresence>
        <p className="mt-4 text-center text-caption text-muted md:hidden">Vuốt ngang để chuyển thẻ</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
        <div className="mx-auto flex max-w-3xl gap-3 md:justify-end">
          <Button variant="secondary" size="lg" icon={SpeakerHigh} className="shrink-0 px-5" onClick={() => speak(entry.word)}>
            <span className="hidden sm:inline">Nghe lại</span>
            <span className="sr-only sm:hidden">Nghe lại</span>
          </Button>
          <Button size="lg" iconRight={ArrowRight} className="flex-1 md:flex-none md:min-w-72" onClick={() => go(1)}>
            {isLast ? 'Vào luyện tập' : 'Đã hiểu, tiếp'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Lesson() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState(params.get('step') ?? 'mode')
  const [mode, setMode] = useState(params.get('mode') ?? 'word')
  const [summary, setSummary] = useState(params.get('step') === 'done' ? PREVIEW_DONE : null)
  const [exitOpen, setExitOpen] = useState(false)

  const startCard = Math.min(Number(params.get('i')) || 0, ENTRIES.length - 1)
  const startQuestion = Number(params.get('q')) || 0
  const askExit = () => setExitOpen(true)

  const finish = (result) => {
    setSummary(result)
    setStep('done')
    window.scrollTo({ top: 0 })
  }

  let screen
  if (step === 'done' && summary) screen = <LessonDone summary={summary} />
  else if (step === 'practice') screen = <LessonPractice startAt={startQuestion} onDone={finish} onExit={askExit} />
  else if (step === 'context') screen = <LessonContext onDone={finish} onExit={askExit} />
  else if (step === 'cards')
    screen = <CardsStep mode={mode} startAt={startCard} onFinish={() => setStep('practice')} onExit={askExit} />
  else
    screen = (
      <ModePicker
        onExit={askExit}
        onPick={(key) => {
          setMode(key)
          setStep(key === 'context' ? 'context' : 'cards')
        }}
      />
    )

  return (
    <>
      {screen}
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Thoát bài học?"
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate('/academy')}>
              Thoát
            </Button>
            <Button onClick={() => setExitOpen(false)}>Học tiếp</Button>
          </>
        }
      >
        Những từ bạn đã xem vẫn được lưu. Phần luyện tập chưa làm sẽ phải làm lại từ đầu.
      </Modal>
    </>
  )
}
