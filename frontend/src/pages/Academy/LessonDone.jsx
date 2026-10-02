/*
 * Hoàn thành phần học: linh vật nhảy mừng, pháo giấy, thống kê độ chính xác và combo cao nhất.
 * Số liệu do server trả về khi kết thúc phần học.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Exam, MapTrifold, Target, Lightning } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { IconBadge } from '../../components/ui/Icon'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import { LESSON } from './lessonMock'

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

export default function LessonDone({ summary }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return undefined
    const t = setTimeout(() => {
      confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.4 }, colors: tokenColors(['primary', 'accent', 'danger', 'gold', 'sky']) })
    }, 300)
    return () => clearTimeout(t)
  }, [reduceMotion])

  return (
    <div className="flex min-h-dvh flex-col bg-accent">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-7 px-4 pb-44 pt-10 text-center md:pb-12">
        <div className="relative">
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -36, 0, -14, 0], rotate: [0, -6, 0, 4, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.6, ease: 'easeOut' }}
          >
            <MascotBlob color="danger" shape="tall" size={150} />
          </motion.div>
          <Sticker bg="gold" tilt={-8} wiggle className="absolute -left-14 top-2">
            Tuyệt!
          </Sticker>
        </div>

        <div className="flex flex-col gap-2">
          <span className="hud-label text-ink/70">
            {LESSON.level} · {LESSON.topic} · Bài {LESSON.number}
          </span>
          <h1 className="text-[36px] leading-[1.05] md:text-[48px]">{summary.learned} từ mới đã vào sổ!</h1>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-card border-thick border-line bg-surface p-4 text-left shadow-hard">
            <IconBadge icon={Target} bg="sky" size="md" shape="square" shadow={false} />
            <div className="leading-tight">
              <div className="font-num text-2xl">{summary.accuracy}%</div>
              <div className="text-caption text-muted">Độ chính xác</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-card border-thick border-line bg-surface p-4 text-left shadow-hard">
            <IconBadge icon={Lightning} bg="orange" size="md" shape="square" shadow={false} />
            <div className="leading-tight">
              <div className="font-num text-2xl">{summary.maxCombo}</div>
              <div className="text-caption text-muted">Combo cao nhất</div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:flex-row md:justify-center md:border-0 md:bg-transparent md:pb-12 md:pt-0">
        <Button size="lg" icon={Exam} className="md:min-w-72" onClick={() => navigate(`/academy/unit-test?unit=${LESSON.id}`)}>
          Làm bài kiểm tra
        </Button>
        <Button size="lg" variant="secondary" icon={MapTrifold} onClick={() => navigate('/academy')}>
          Về bản đồ
        </Button>
      </div>
    </div>
  )
}
