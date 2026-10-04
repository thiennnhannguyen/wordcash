/*
 * Màn kết quả Cửa Ải. Ba biến thể theo dữ liệu server trả về:
 * - đúng hết: cổng mở, pháo giấy, streak tăng, ngọn lửa lớn lên;
 * - đúng hết và chạm mốc 7 ngày: thêm card quà "+1 LƯỢT QUAY";
 * - có câu sai: trừ từ thuộc, danh sách từ sai, cảnh báo rank lung lay (nếu có).
 * Nút chính luôn là "VÀO SẢNH".
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowRight, BookOpenText, Fire, Gift, WarningCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Sticker from '../../components/ui/Sticker'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { formatDelta } from '../../utils/format'
import GateIllustration from './GateIllustration'

// Màu pháo giấy lấy từ token, không hard-code
function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

function StreakFlame({ days, grow }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.span
        initial={grow ? { scale: 0.6 } : false}
        animate={grow ? { scale: [0.6, 1.25, 1] } : undefined}
        transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
        className="inline-flex"
      >
        <IconBadge icon={Fire} bg="orange" size="xl" />
      </motion.span>
      <span className="font-num text-lg uppercase">Streak {days} ngày</span>
    </div>
  )
}

export default function DailyCheckResult({ result, continueTo = '/lobby' }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { perfect } = result
  const shaky = result.rankShaky

  useEffect(() => {
    if (!perfect || reduceMotion) return
    const colors = tokenColors(['primary', 'accent', 'danger', 'sky', 'orange'])
    const fire = (x) => confetti({ particleCount: 70, spread: 70, startVelocity: 45, origin: { x, y: 0.35 }, colors })
    const t = setTimeout(() => {
      fire(0.3)
      fire(0.7)
    }, 700)
    return () => clearTimeout(t)
  }, [perfect, reduceMotion])

  return (
    <div className={cx('flex min-h-dvh flex-col', perfect ? 'bg-gold' : 'bg-bg')}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-7 px-4 pb-36 pt-8 text-center md:pb-16 md:pt-12">
        <div className="relative w-full max-w-[300px] md:max-w-[340px]">
          <GateIllustration open />
          {perfect && (
            <Sticker bg="accent" tilt={-6} wiggle className="absolute -left-2 top-4">
              Qua ải!
            </Sticker>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="font-num text-[44px] uppercase leading-none md:text-[56px]">
            {result.correctCount}/{result.total}
            {perfect ? (
              <span className="block pt-2 font-heading text-[32px] font-black normal-case tracking-tight md:text-[40px]">
                Streak {result.streakAfter} ngày!
              </span>
            ) : (
              <span className="block pt-2 font-heading text-[28px] font-black normal-case tracking-tight text-danger-deep md:text-[34px]">
                {formatDelta(result.masteredDelta)} từ đã thuộc
              </span>
            )}
          </h1>
          <p className="max-w-md text-lg font-medium">
            {perfect ? 'Cổng đã mở. Vào Sảnh đánh trận tiếp nào!' : 'Không sao, ôn lại ngay để lấy lại từ đã quên.'}
          </p>
        </div>

        {perfect && <StreakFlame days={result.streakAfter} grow />}

        {result.spinReward > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -1.5 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 18 }}
            className="w-full"
          >
            <Card className="anim-glow relative flex flex-col items-center gap-4 border-line bg-surface !shadow-glow-legendary md:flex-row md:text-left">
              <Sticker bg="danger" tilt={6} size="sm" className="absolute -top-4 right-6">
                Mốc {result.streakAfter} ngày
              </Sticker>
              <IconBadge icon={Gift} bg="danger" size="xl" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="font-num text-[28px] uppercase leading-none">+{result.spinReward} lượt quay</span>
                <span className="text-caption font-medium text-muted">Phần thưởng giữ streak 7 ngày liền.</span>
              </div>
              <div className="flex w-full gap-3 md:w-auto md:flex-col">
                <Button variant="danger" icon={Gift} className="flex-1 md:flex-none" onClick={() => navigate('/collection/spin')}>
                  Quay ngay
                </Button>
                <Button variant="ghost" className="flex-1 md:flex-none" onClick={() => navigate('/lobby')}>
                  Để sau
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {!perfect && (
          <div className="flex w-full flex-col gap-5 text-left">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl">Từ cần ôn lại</h2>
                <Button variant="secondary" size="sm" icon={BookOpenText} onClick={() => navigate('/academy/review')}>
                  Ôn ngay
                </Button>
              </div>
              <ul className="flex flex-col gap-2">
                {result.wrongWords.map((w) => (
                  <li key={w.word} className="flex items-center justify-between gap-3 rounded-[16px] border-thick border-line bg-raised px-4 py-3">
                    <span className="font-display text-lg font-bold">{w.word}</span>
                    <span className="text-muted">{w.meaning}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {shaky && (
              <div className="anim-alert flex items-start gap-3 rounded-card border-thick border-danger bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface))] p-5">
                <Icon icon={WarningCircle} size={28} color="danger-deep" className="shrink-0" />
                <p className="font-semibold">
                  Rank {RANK_BY_KEY[shaky.rank].name} đang lung lay – còn {shaky.daysLeft} ngày để gỡ lại {shaky.wordsToRecover} từ.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:flex md:justify-center md:border-0 md:bg-transparent md:pb-12 md:pt-0">
        <Button size="lg" iconRight={ArrowRight} fullWidth className="md:w-auto md:min-w-80" onClick={() => navigate(continueTo)}>
          {continueTo === '/lobby' ? 'Vào Sảnh' : 'Tiếp tục'}
        </Button>
      </div>
    </div>
  )
}
