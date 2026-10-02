/*
 * Cảnh chuyển cấp "BAY SANG VÙNG ĐẤT MỚI" (toàn màn hình, ~5 giây), phát ngay sau khi thắng Trận Boss và server mở cấp mới.
 *
 * (a) Quái vật Loch Ness vẫy khăn, băng "B1 · ĐÃ CHINH PHỤC", con dấu hộ chiếu "UNITED KINGDOM ✓" dập xuống kèm rung
 * → (b) nhà du hành kéo vali chạy vào sân bay, lên máy bay tím, máy bay cất cánh
 * → (c) bản đồ thế giới màu kem, đường bay nét đứt vẽ dần từ Anh sang Mỹ, máy bay nhỏ để lại vệt mây
 * → (d) hạ cánh, sương tan để lộ Tượng Nữ thần Tự do và New York, chữ "CHÀO MỪNG ĐẾN VỚI B2 · MỸ & CANADA" đập xuống
 * → (e) card tổng kết: số từ đã thuộc, số địa danh, trang hộ chiếu đủ con dấu, "+1 LƯỢT QUAY ĐẶC BIỆT", nút bắt đầu cấp mới.
 * Có nút "Bỏ qua" (nhảy tới card tổng kết). Khi người dùng bật giảm chuyển động thì hiện thẳng card tổng kết.
 * `hold` ("a"…"e") dừng ở một khung để xem thử. Dữ liệu (`data`) do server trả, xem travelMock.js.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowRight, FastForward, Gift, Stamp } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Flag from '../../components/academy/Flag'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'
import Passport from '../Academy/map/Passport'
import { AirportScene, ArrivalScene, FlightScene, LochScene, STROKE } from './TravelScenes'

// Mốc bắt đầu của từng khung (ms)
const STEPS = [
  { key: 'a', at: 0 },
  { key: 'b', at: 1300 },
  { key: 'c', at: 2900 },
  { key: 'd', at: 4100 },
  { key: 'e', at: 5600 },
]

function colors() {
  const style = getComputedStyle(document.documentElement)
  return ['gold', 'accent', 'danger', 'sky', 'primary', 'orange', 'white'].map((n) => style.getPropertyValue(`--color-${n}`).trim())
}

function Summary({ data, onStart }) {
  const { from, to, reward } = data
  return (
    <motion.div
      className="relative mx-auto flex w-full max-w-[560px] flex-col gap-4 rounded-panel border-thick border-line bg-surface p-5 text-ink shadow-hard-lg md:p-7"
      initial={{ y: 60, scale: 0.9, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className="flex items-center gap-3">
        <Flag code={from.region.flag} width={44} className="shrink-0" />
        <div className="min-w-0">
          <p className="hud-label">Đã chinh phục</p>
          <h2 className="truncate text-[22px] uppercase leading-tight md:text-[28px]">
            {from.code} · {from.region.name}
          </h2>
        </div>
      </div>
      <p className="flex flex-wrap gap-2">
        <span className="font-num rounded-pill border-thick border-line bg-accent px-3 py-1 text-sm uppercase">
          Đã thuộc {formatNumber(from.words)} từ {from.code}
        </span>
        <span className="font-num rounded-pill border-thick border-line bg-raised px-3 py-1 text-sm uppercase">
          {from.landmarks}/{from.landmarks} địa danh
        </span>
      </p>
      <div>
        <h3 className="hud-label mb-2 flex items-center gap-1.5">
          <Icon icon={Stamp} size={16} color="primary" /> Trang hộ chiếu {from.code}
        </h3>
        <Passport map={data.passportMap} withBoss={false} caption={false} />
      </div>
      <div className="anim-glow flex items-center gap-3 rounded-[18px] border-thick border-line bg-gold px-4 py-3 shadow-glow-legendary">
        <span className="grid size-11 shrink-0 place-items-center rounded-pill border-thick border-line bg-surface">
          <Icon icon={Gift} size={24} color="primary" />
        </span>
        <span className="font-display text-lg font-bold uppercase md:text-xl">+{reward.specialSpins} lượt quay đặc biệt</span>
      </div>
      {to && (
        <Button size="lg" iconRight={ArrowRight} fullWidth className="whitespace-nowrap max-md:text-[15px]" onClick={onStart}>
          Bắt đầu hành trình {to.code}
        </Button>
      )}
    </motion.div>
  )
}

export default function LevelTravel({ data, mascot, hold, onStart }) {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(reduceMotion ? STEPS.length : 1)
  const current = STEPS[Math.min(step, STEPS.length) - 1].key

  useEffect(() => {
    if (reduceMotion) return undefined
    const stop = hold ? STEPS.findIndex((s) => s.key === hold) + 1 : STEPS.length
    const timers = STEPS.slice(1, stop).map((s, i) => setTimeout(() => setStep(i + 2), s.at))
    return () => timers.forEach(clearTimeout)
  }, [hold, reduceMotion])

  // Pháo giấy khi chữ chào mừng đập xuống
  useEffect(() => {
    if (current !== 'd' || reduceMotion) return undefined
    const t = setTimeout(() => confetti({ particleCount: 90, spread: 90, origin: { y: 0.3 }, colors: colors(), zIndex: 80 }), 800)
    return () => clearTimeout(t)
  }, [current, reduceMotion])

  const done = step >= STEPS.length
  const scene = done ? 'd' : current

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-map-water" role="dialog" aria-modal="true" aria-label={`Bay tới ${data.to?.code} · ${data.to?.region.name}`}>
      <AnimatePresence initial={false}>
        <motion.div key={scene} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {scene === 'a' && <LochScene fromCode={data.from.code} regionStamp={data.from.region.stamp ?? data.from.region.name} />}
          {scene === 'b' && <AirportScene mascot={mascot} />}
          {scene === 'c' && <FlightScene fromRegion={data.from.region} toRegion={data.to.region} />}
          {scene === 'd' && <ArrivalScene toCode={data.to.code} toRegion={data.to.region} quiet={done} />}
        </motion.div>
      </AnimatePresence>

      {/* Card tổng kết đè lên cảnh New York */}
      {done && (
        <div className="absolute inset-0 overflow-y-auto bg-ink/55 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
          <div className="flex min-h-full flex-col items-center justify-center gap-4">
            <p className={cx('text-center font-display text-[30px] font-bold uppercase italic leading-none text-gold md:text-[44px]', STROKE)} style={{ '--stroke': '7px', textShadow: '4px 4px 0 var(--color-ink)' }}>
              {data.to.code} · {data.to.region.name}
            </p>
            <Summary data={data} onStart={onStart} />
          </div>
        </div>
      )}

      {!done && (
        <button
          type="button"
          onClick={() => setStep(STEPS.length)}
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 inline-flex h-11 items-center gap-1.5 rounded-pill border-2 border-line bg-surface px-3.5 font-display text-[13px] font-bold uppercase tracking-wide text-ink shadow-hard-sm"
        >
          <Icon icon={FastForward} size={16} /> Bỏ qua
        </button>
      )}
    </div>
  )
}
