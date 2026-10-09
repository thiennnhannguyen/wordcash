/*
 * "Mini màn đấu" ở hero landing: HÌNH MINH HỌA TĨNH mô phỏng một lượt đấu (không phải dữ liệu thật).
 * Lặp lại nhẹ: tia đạn bay từ trái sang phải, trúng thì máu đối thủ tụt. Tắt chuyển động khi người dùng
 * bật giảm chuyển động. Máu, sát thương, câu hỏi ở đây là số minh họa cố định, không hiện số người hay thành tích nào;
 * không có logic chấm điểm.
 */

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Card from '../../components/ui/Card'
import Sticker from '../../components/ui/Sticker'
import HealthBar from '../../components/game/HealthBar'
import { AnswerOption } from '../../components/game/AnswerOptions'
import MascotBlob from '../../components/collection/MascotBlob'
import cx from '../../utils/cx'

const OPTIONS = [
  { label: 'đáng tin cậy', state: 'correct' },
  { label: 'có thể tái chế' },
  { label: 'liên quan' },
  { label: 'nổi tiếng' },
]

const CYCLE_MS = 3200
const HIT_AT_MS = 850
const HP_BEFORE = 50
const HP_AFTER = 35

function Bullet() {
  return (
    <span className="flex items-center gap-1">
      <span className="flex flex-col gap-1">
        <span className="h-[3px] w-5 rounded-pill bg-ink/40" />
        <span className="ml-2 h-[3px] w-3 rounded-pill bg-ink/40" />
      </span>
      <span className="h-4 w-10 rounded-pill border-thick border-line bg-accent" />
    </span>
  )
}

export default function HeroBattle({ className }) {
  const reduceMotion = useReducedMotion()
  const [round, setRound] = useState(0)
  const [hit, setHit] = useState(false)

  useEffect(() => {
    if (reduceMotion) return undefined
    let hitTimer
    const cycle = () => {
      setHit(false)
      setRound((r) => r + 1)
      hitTimer = setTimeout(() => setHit(true), HIT_AT_MS)
    }
    cycle()
    const loop = setInterval(cycle, CYCLE_MS)
    return () => {
      clearInterval(loop)
      clearTimeout(hitTimer)
    }
  }, [reduceMotion])

  const enemyHp = reduceMotion || hit ? HP_AFTER : HP_BEFORE

  return (
    <div className={cx('relative', className)}>
      <Sticker bg="gold" tilt={-8} wiggle className="absolute -left-2 -top-5 z-20 md:-left-6">
        Combo x3
      </Sticker>
      <Sticker bg="danger" tilt={7} wiggle className="absolute -top-6 right-4 z-20 md:right-8">
        +15 DMG
      </Sticker>
      <Sticker bg="sky" tilt={-5} size="sm" wiggle className="absolute -bottom-4 right-8 z-20">
        0.8s
      </Sticker>

      <Card padding="none" className="rotate-[1.5deg] overflow-hidden bg-surface shadow-hard-lg" aria-label="Minh họa một lượt đấu">
        {/* Hai đấu thủ */}
        <div className="relative grid grid-cols-2 gap-4 border-b-thick border-line bg-raised px-4 pb-4 pt-6 md:gap-8 md:px-6">
          <div className="flex flex-col items-start gap-2">
            <MascotBlob color="primary" shape="round" size={84} />
            <HealthBar label="Bạn" value={80} color="accent" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <span key={hit ? round : 'idle'} className={cx('inline-flex', hit && 'anim-shake')}>
              <MascotBlob color="orange" shape="drop" size={84} />
            </span>
            <HealthBar label="Đối thủ" value={enemyHp} color="danger" reverse />
          </div>

          {!reduceMotion && (
            <motion.span
              key={round}
              aria-hidden="true"
              className="pointer-events-none absolute top-12 z-10"
              initial={{ left: '22%', opacity: 0 }}
              animate={{ left: '64%', opacity: [0, 1, 1, 0] }}
              transition={{ duration: HIT_AT_MS / 1000, ease: 'easeIn', times: [0, 0.15, 0.85, 1] }}
            >
              <Bullet />
            </motion.span>
          )}
        </div>

        {/* Câu hỏi */}
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <div className="text-center">
            <div className="hud-label">Chọn nghĩa đúng · Câu 7/20</div>
            <div className="font-display text-[34px] font-bold uppercase leading-tight tracking-wide md:text-[40px]">Reliable</div>
            <div className="text-muted">/rɪˈlaɪəbl/ · adjective</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
            {OPTIONS.map((o, i) => (
              <AnswerOption key={o.label} index={i} label={o.label} state={o.state} size="sm" disabled />
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
