/*
 * Màn chờ ghép trận.
 *
 * Nền tím điện có vòng radar tỏa ra từ giữa, linh vật người chơi ngó trái ngó phải, đồng hồ đếm lên,
 * thời gian chờ dự kiến, mẹo chạy luân phiên và nút "HỦY". Server ghép trận (`join_queue` → `match_found`);
 * khi có đối thủ thì hiện "ĐÃ TÌM THẤY!" rồi chuyển sang màn VS và vào sân đấu.
 *
 * Dev: `?t=7` (đồng hồ bắt đầu từ 7 giây), `&stay=1` (không bao giờ tìm thấy, để xem màn chờ).
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Lightbulb } from '@phosphor-icons/react'
import { IconBadge } from '../../components/ui/Icon'
import MascotBlob from '../../components/collection/MascotBlob'
import { formatClock } from '../../utils/format'
import { EXPECTED_WAIT_SECONDS, LOBBY, PLAYER, PLAYER_CARD, WAITING_TIPS, joinQueue } from './arenaMock'
import VersusIntro from './VersusIntro'
import useSocket from '../../hooks/useSocket'

const TIP_MS = 4000
const FOUND_FLASH_MS = 900

// Chấm đối thủ tiềm năng nhấp nháy trên radar (vị trí theo % bán kính)
const BLIPS = [
  { top: '22%', left: '68%', delay: '0s' },
  { top: '70%', left: '24%', delay: '0.6s' },
  { top: '62%', left: '80%', delay: '1.2s' },
]

function Radar({ found }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="relative aspect-square w-[min(84vw,440px)] md:w-[500px]" aria-hidden="true">
      {/* Vòng tĩnh */}
      {[100, 70, 40].map((p) => (
        <span key={p} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-white/25" style={{ width: `${p}%`, height: `${p}%` }} />
      ))}
      {/* Vòng tỏa */}
      {!found &&
        [0, 0.8, 1.6].map((d) => (
          <span key={d} className="anim-radar absolute inset-0 rounded-pill border-4 border-white/70" style={{ animationDelay: `${d}s` }} />
        ))}
      {/* Kim quét */}
      {!found && !reduceMotion && (
        <motion.span
          className="absolute left-1/2 top-0 h-1/2 w-1 -translate-x-1/2 rounded-pill bg-white/50"
          style={{ originY: 1 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {BLIPS.map((b) => (
        <span key={b.top} className="anim-blink absolute size-4 rounded-pill border-2 border-line bg-orange" style={{ top: b.top, left: b.left, animationDelay: b.delay }} />
      ))}

      {/* Linh vật ngó trái ngó phải */}
      <div className="absolute left-1/2 top-1/2 grid size-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill border-thick border-line bg-surface shadow-hard-lg md:size-48">
        <motion.div
          animate={found || reduceMotion ? { x: 0, rotate: 0 } : { x: [0, -12, -12, 12, 12, 0], rotate: [0, -10, -10, 10, 10, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.15, 0.4, 0.55, 0.8, 1], ease: 'easeInOut' }}
        >
          <MascotBlob color={PLAYER.mascot.color} shape={PLAYER.mascot.shape} size={150} className="size-32 md:size-40" />
        </motion.div>
      </div>
    </div>
  )
}

export default function Matchmaking() {
  // Kết nối Socket.IO chỉ mở khi vào Đấu Trường (xác thực bằng access token, tự làm mới khi hết hạn)
  useSocket()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const startAt = Number(params.get('t')) || 0
  const stay = params.get('stay') === '1'
  const [elapsed, setElapsed] = useState(startAt)
  const [tip, setTip] = useState(0)
  const [found, setFound] = useState(null)
  const [showVs, setShowVs] = useState(false)

  // Đồng hồ đếm lên (chỉ để hiển thị; thời gian chờ thật do server đo)
  useEffect(() => {
    if (found) return undefined
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [found])

  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % WAITING_TIPS.length), TIP_MS)
    return () => clearInterval(t)
  }, [])

  // Vào hàng chờ; rời trang (hoặc bấm Hủy) thì rời hàng chờ
  useEffect(() => {
    if (stay) return undefined
    return joinQueue(
      (res) => {
        setFound(res)
        setTimeout(() => setShowVs(true), FOUND_FLASH_MS)
      },
      { delayMs: Math.max(1500, 9000 - startAt * 1000) },
    )
  }, [stay, startAt])

  return (
    <div className="flex min-h-dvh flex-col items-center overflow-hidden bg-primary px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 text-white md:pt-10">
      <span className="rounded-pill border-2 border-white/60 px-4 font-display text-sm font-bold uppercase leading-8 tracking-wider text-white/90">
        Đấu theo rank · Từ vựng {LOBBY.rankedPool}
      </span>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 md:gap-8">
        <Radar found={!!found} />

        <div className="flex flex-col items-center gap-1 text-center" aria-live="polite">
          <AnimatePresence mode="wait">
            {found ? (
              <motion.h1
                key="found"
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 16 }}
                className="font-display text-[40px] font-bold uppercase italic leading-none text-gold [-webkit-text-stroke:3px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:4px_4px_0_var(--color-ink)] md:text-[56px]"
              >
                Đã tìm thấy!
              </motion.h1>
            ) : (
              <motion.h1 key="search" exit={{ opacity: 0 }} className="text-[30px] leading-tight text-white md:text-[40px]">
                Đang tìm đối thủ…
              </motion.h1>
            )}
          </AnimatePresence>
          <span className="font-num text-[56px] leading-none md:text-[72px]" aria-label={`Đã chờ ${elapsed} giây`}>
            {formatClock(elapsed)}
          </span>
          <span className="text-caption font-medium text-white/80">Thời gian chờ dự kiến ~{EXPECTED_WAIT_SECONDS}s</span>
        </div>
      </main>

      <div className="flex w-full max-w-lg flex-col items-center gap-5">
        <div className="flex min-h-[72px] w-full items-center gap-3 rounded-card border-thick border-line bg-surface px-4 py-3 text-ink shadow-hard">
          <IconBadge icon={Lightbulb} bg="gold" size="sm" shadow={false} />
          <AnimatePresence mode="wait">
            <motion.p
              key={tip}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="font-semibold"
            >
              <span className="font-display font-bold uppercase text-primary">Mẹo:</span> {WAITING_TIPS[tip]}
            </motion.p>
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dev/arena')}
          disabled={!!found}
          className="h-13 min-w-48 rounded-btn border-thick border-white px-10 font-display text-lg font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/15 disabled:opacity-40"
        >
          Hủy
        </button>
      </div>

      {showVs && found && (
        <VersusIntro player={PLAYER_CARD} opponent={found.opponent} match={found.match} onDone={() => navigate('/dev/arena/battle', { replace: true })} />
      )}
    </div>
  )
}
