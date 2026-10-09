/*
 * Màn quay thẻ linh vật.
 *
 * Chuẩn bị: nền kem có tia sáng tỏa chậm, hộp thẻ lơ lửng (tím; lượt đặc biệt màu vàng), tab "Lượt thường" / "Lượt đặc biệt",
 * thanh pity "Đảm bảo Sử Thi", nút "i" mở bảng tỉ lệ công khai, "MỞ THẺ" và "Mở tất cả", dòng tiến độ tới lượt kế tiếp.
 * Chuỗi mở: hộp rung 800ms, nứt sáng → bật tung, thẻ úp bay lên (400ms, nảy) → ánh sáng viền gợi ý độ hiếm (600ms; Huyền Thoại
 * tối màn và tia vàng xoáy 1.500ms) → chạm để lật (500ms) → công bố theo độ hiếm (pháo giấy 2s) → kết quả.
 * Mở tất cả (tối đa 10 lượt, cùng loại): các thẻ bay ra xếp hàng, lật lần lượt, thẻ hiếm nhất được đẩy lên giữa.
 * Hết lượt: hộp xám có khóa, nút "Vào Học Viện", không có nút mua.
 * Kết quả quay do SERVER quyết định (POST /collection/spins, services/collectionApi.js): màn hình nhận đủ kết quả và kết quả
 * đã nằm trong album TRƯỚC khi bắt đầu hiệu ứng, nên tải lại trang giữa chừng không mất thẻ. Client chỉ diễn hoạt cảnh.
 * Nút MỞ THẺ bị khóa ngay khi bấm (ref, không chờ React vẽ lại) để bấm hai lần chỉ tiêu một lượt; Idempotency-Key
 * giữ nguyên khi thử lại vì lỗi mạng. Có nút "Bỏ qua hiệu ứng"; khi người dùng bật giảm chuyển động thì đi thẳng tới kết quả.
 *
 * Pity (mốc + bộ đếm) lấy từ GET /collection; số lượt tối đa của "Mở tất cả" và bảng tỉ lệ từ GET /collection/rates
 * (store/ratesStore.js). Chưa có luật thì chỉ mở từng thẻ.
 * `?type=special`, `?auto=1|all` (tự mở), `?hold=charge|burst|hint|await|reveal|flipping|featured` (dừng ở một khung).
 * Ép kết quả khi dev/e2e: POST /api/v1/dev/force-next (chỉ có ở dev/e2e).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowsClockwise, BookOpen, CheckFat, DownloadSimple, Gift, ShareNetwork, Stack, Sword, UserCircle } from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import CardPack from '../../components/collection/CardPack'
import { Stars } from '../../components/collection/MascotCard'
import { useAuthStore } from '../../store/authStore'
import { useCollectionStore } from '../../store/collectionStore'
import { useMascotCatalog } from '../../store/mascotStore'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { RARITIES, RARITY_ORDER } from '../../utils/constants'
import { messageFor } from '../../utils/errorMessages'
import { formatMascotNumber } from '../../utils/format'
import { fetchCollection, openPack, updateMascots } from '../../services/collectionApi'
import { useGachaRates, useRatesStore } from '../../store/ratesStore'
import { ErrorState } from '../../components/ui/DataState'
import { OddsModal } from './CollectionHeader'
import RevealCard from './spin/RevealCard'
import { NextSpinLine, PityBar, Rays, SpinHud, TypeTabs } from './spin/SpinParts'
import { drawSpinShareCard } from './spin/shareSpinCard'

// Thông số chuyển động (ms)
const T = {
  charge: 800,
  fly: 400,
  hint: 600,
  hintLegend: 1500,
  flip: 500,
  confetti: 2000,
  reveal: { common: 1300, rare: 1700, epic: 2100, legendary: 3400, dupe: 2100 },
  spread: 600,
  featured: 1000,
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const totalSpins = (spins) => spins.normal + spins.special

function rarest(results) {
  let best = 0
  results.forEach((r, i) => {
    const a = RARITY_ORDER.indexOf(r.rarity) * 2 + (r.duplicate ? 0 : 1)
    const b = RARITY_ORDER.indexOf(results[best].rarity) * 2 + (results[best].duplicate ? 0 : 1)
    if (a > b) best = i
  })
  return best
}

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim())
}

function ShareModal({ open, onClose, image }) {
  const pushToast = useToastStore((s) => s.push)
  const share = async () => {
    try {
      const blob = await (await fetch(image)).blob()
      const file = new File([blob], 'wordclash-linh-vat.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'WORDCLASH' })
        return
      }
      pushToast({ variant: 'info', title: 'Thiết bị chưa hỗ trợ chia sẻ ảnh', message: 'Hãy tải ảnh về rồi đăng nhé.' })
    } catch {
      // Người dùng đóng hộp chia sẻ
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Khoe linh vật" className="max-w-md">
      <div className="flex flex-col gap-4 text-ink">
        {image ? (
          <img src={image} alt="Ảnh khoe linh vật vừa mở" className="w-full rounded-card border-thick border-line shadow-hard" />
        ) : (
          <div className="aspect-[4/5] w-full animate-pulse rounded-card bg-raised" aria-busy="true" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={image ?? undefined}
            download="wordclash-linh-vat.png"
            className="pressable inline-flex h-13 items-center justify-center gap-2 rounded-btn border-thick border-line bg-surface font-display font-bold uppercase tracking-wider shadow-hard"
          >
            <Icon icon={DownloadSimple} size={22} /> Tải ảnh
          </a>
          <Button variant="sky" icon={ShareNetwork} onClick={share} disabled={!image}>
            Chia sẻ
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ResultPanel({ mascot, result, isAvatar, isArena, spinsLeft, onAvatar, onArena, onAlbum, onAgain, onShare }) {
  const info = RARITIES[result.rarity]
  return (
    <motion.div
      className="flex w-full flex-col items-center gap-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-heading text-[26px] font-black uppercase leading-tight md:text-[36px]">
          <span className="font-num text-muted">{formatMascotNumber(mascot.number)}</span> · {mascot.name}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-pill border-thick border-line px-3.5 font-display text-sm font-bold uppercase leading-8 tracking-wider shadow-hard-sm"
            style={{ background: info.color, color: result.rarity === 'epic' ? 'var(--color-white)' : 'var(--color-ink)' }}
          >
            {info.name}
            <Stars count={info.stars} size={15} />
          </span>
          {result.duplicate ? (
            <span className="rounded-pill border-2 border-line bg-surface px-3 font-display text-sm font-bold uppercase leading-7">
              Đã có · <span className="font-num text-accent-deep">+{result.shards} mảnh</span>
            </span>
          ) : (
            <span className="rounded-pill border-2 border-line bg-accent px-3 font-display text-sm font-bold uppercase leading-7">Linh vật mới</span>
          )}
        </div>
      </div>

      {/* Hàng nút: dính đáy trên mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 border-t-thick border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:static md:flex-row md:items-center md:justify-center md:gap-3 md:border-0 md:bg-transparent md:p-0">
        <div className="flex gap-2 md:order-last md:gap-3">
          {spinsLeft > 0 && (
            <Button size="lg" icon={ArrowsClockwise} className="flex-1 md:order-last" onClick={onAgain}>
              Mở tiếp ({spinsLeft})
            </Button>
          )}
          <IconButton icon={ShareNetwork} label="Chia sẻ: Mình vừa mở được…" variant="sky" size={spinsLeft > 0 ? 'lg' : 'md'} onClick={onShare} className="max-md:size-16" />
        </div>
        <div className="flex gap-2 md:contents">
          {isAvatar ? (
            <Button variant="accent" icon={CheckFat} disabled aria-label="Đang dùng làm avatar" className="flex-1 px-3 disabled:opacity-100 md:flex-none">
              Avatar
            </Button>
          ) : (
            <Button variant="secondary" icon={UserCircle} className="flex-1 whitespace-nowrap px-3 md:flex-none md:px-6" onClick={onAvatar}>
              <span className="md:hidden">Làm avatar</span>
              <span className="max-md:hidden">Đặt làm avatar</span>
            </Button>
          )}
          {isArena ? (
            <Button variant="accent" icon={CheckFat} disabled aria-label="Đang dùng trong Đấu Trường" className="flex-1 px-3 disabled:opacity-100 md:flex-none">
              Đấu Trường
            </Button>
          ) : (
            <Button variant="orange" icon={Sword} className="flex-1 whitespace-nowrap px-3 md:flex-none md:px-6" onClick={onArena}>
              <span className="md:hidden">Đấu Trường</span>
              <span className="max-md:hidden">Dùng trong Đấu Trường</span>
            </Button>
          )}
          <Button variant="secondary" icon={BookOpen} className="flex-1 whitespace-nowrap px-3 md:flex-none md:px-6" onClick={onAlbum}>
            <span className="md:hidden">Xem album</span>
            <span className="max-md:hidden">Xem trong album</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({ nextSpin, onAcademy }) {
  const left = nextSpin.left ?? nextSpin.target - nextSpin.current
  return (
    <div className="flex flex-col items-center gap-6 pt-6 text-center md:pt-10">
      <CardPack variant="locked" className="w-[200px] md:w-[240px]" />
      <div className="mt-4 flex flex-col items-center gap-2">
        <h2 className="font-heading text-[28px] font-black leading-tight md:text-[36px]">Hết lượt rồi!</h2>
        <p className="max-w-sm font-medium text-muted">
          Thuộc thêm <span className="font-num text-ink">{left}</span> từ để nhận lượt tiếp theo.
        </p>
      </div>
      <NextSpinLine nextSpin={nextSpin} />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:static md:border-0 md:bg-transparent md:p-0">
        <Button size="lg" variant="sky" icon={BookOpen} className="w-full md:w-auto md:px-10" onClick={onAcademy}>
          Vào Học Viện
        </Button>
      </div>
    </div>
  )
}

export default function GachaSpin() {
  const catalog = useMascotCatalog()
  const [initial, setInitial] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    fetchCollection()
      .then((c) => {
        useCollectionStore.getState().setFrom(c)
        setInitial(c)
      })
      .catch(setError)
  }
  useEffect(load, [])

  if (error || catalog.error)
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <ErrorState title="Chưa tải được lượt quay" onRetry={() => (catalog.error ? catalog.retry() : load())} />
      </div>
    )
  if (!initial || !catalog.ready) return <div className="min-h-dvh bg-bg" aria-busy="true" aria-label="Đang tải" />
  return <SpinScreen initial={initial} byId={catalog.byId} />
}

function SpinScreen({ initial, byId }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const reduceMotion = useReducedMotion()
  const pushToast = useToastStore((s) => s.push)
  const setUser = useAuthStore((s) => s.setUser)
  const hold = params.get('hold')

  const [data, setData] = useState(initial)
  const [type, setType] = useState(() => {
    const wanted = params.get('type') === 'special' ? 'special' : 'normal'
    return data.spins[wanted] > 0 ? wanted : data.spins.normal > 0 ? 'normal' : 'special'
  })
  const [phase, setPhase] = useState('ready')
  const [packVariant, setPackVariant] = useState(type)
  const [results, setResults] = useState([])
  const [multi, setMulti] = useState(false)
  const [step, setStep] = useState(0)
  const [featured, setFeatured] = useState(0)
  const [shardsShown, setShardsShown] = useState(data.shards)
  const [bump, setBump] = useState(0)
  const [oddsOpen, setOddsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareImage, setShareImage] = useState(null)
  const maxBatch = useGachaRates().rates?.maxBatch
  const busyRef = useRef(false) // khóa ngay khi bấm: hai cú bấm liên tiếp chỉ gửi một yêu cầu

  const shardRef = useRef(null)
  const featuredRef = useRef(null)
  const skipRef = useRef(false)
  const latestRef = useRef(data)
  const autoRef = useRef(false)

  const pity = data.pity
  const spinsLeft = totalSpins(data.spins)
  const count = maxBatch ? Math.min(data.spins[type], maxBatch) : Math.min(data.spins[type], 1) // "Mở tất cả" tối đa theo luật server
  const opening = phase !== 'ready' && phase !== 'result'

  const finish = useCallback(() => {
    setPhase('result')
    setShardsShown((prev) => {
      if (prev !== latestRef.current.shards) setBump((b) => b + 1)
      return latestRef.current.shards
    })
  }, [])

  const open = useCallback(
    async (n) => {
      if (busyRef.current) return
      busyRef.current = true
      skipRef.current = Boolean(reduceMotion)
      setPackVariant(type)
      setMulti(n > 1)
      setStep(0)
      setShareImage(null)
      setPhase('charge')
      try {
        // Đủ kết quả (đã ghi ở server) rồi mới diễn hiệu ứng
        const [res] = await Promise.all([openPack(type, n), wait(reduceMotion ? 0 : T.charge)])
        latestRef.current = res.state
        useCollectionStore.getState().setFrom(res.state)
        if (res.replayed) pushToast({ variant: 'info', title: 'Kết quả lần mở trước', message: 'Mạng chập chờn nên đây là kết quả đã mở, không trừ thêm lượt.' })
        setResults(res.results)
        setFeatured(rarest(res.results))
        setData(res.state)
        useRatesStore.getState().refresh() // pity mới
        if (skipRef.current) finish()
        else if (hold !== 'charge') setPhase('burst')
      } catch (err) {
        setPhase('ready')
        // DAILY_CHECK_REQUIRED: services/api.js đánh dấu Cửa Ải pending, route guard chuyển sang /daily-check (không cần báo lỗi)
        if (err?.code !== 'DAILY_CHECK_REQUIRED') pushToast({ variant: 'error', title: 'Không mở được thẻ', message: err?.code ? messageFor(err) : 'Số lượt đã thay đổi, hãy thử lại.' })
        fetchCollection().then(setData).catch(() => {})
      } finally {
        busyRef.current = false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, reduceMotion, hold, finish],
  )

  // Tự mở khi xem thử
  useEffect(() => {
    const auto = params.get('auto')
    if (!auto || autoRef.current || count === 0) return
    autoRef.current = true
    open(auto === 'all' ? count : 1)
  }, [params, open, count])

  // Chuỗi mở một thẻ và các bước chung
  useEffect(() => {
    if (phase === hold || !results.length) return undefined
    const r = results[0]
    let t
    if (phase === 'burst') t = setTimeout(() => setPhase(multi ? 'spread' : 'hint'), T.fly + 150)
    else if (phase === 'hint') t = setTimeout(() => setPhase('await'), r.rarity === 'legendary' ? T.hintLegend : T.hint)
    else if (phase === 'flip') t = setTimeout(() => setPhase('reveal'), T.flip)
    else if (phase === 'reveal') t = setTimeout(finish, r.duplicate ? T.reveal.dupe : T.reveal[r.rarity])
    else if (phase === 'spread') t = setTimeout(() => setPhase('flipping'), T.spread)
    else if (phase === 'featured') t = setTimeout(finish, T.featured)
    return () => clearTimeout(t)
  }, [phase, hold, results, multi, finish])

  // Mở tất cả: lần lượt gợi ý rồi lật từng thẻ
  useEffect(() => {
    if (phase !== 'flipping' || hold === 'flipping') return undefined
    const k = Math.floor(step / 2)
    const even = step % 2 === 0
    const delay = even ? (k === 0 ? 150 : T.flip + 300) : results[k].rarity === 'legendary' ? T.hintLegend : T.hint
    const t = setTimeout(() => {
      if (even && k >= results.length) setPhase('featured')
      else setStep((s) => s + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [phase, step, results, hold])

  // Pháo giấy khi công bố
  const celebrated = multi ? results[featured] : results[0]
  const celebrating = (phase === 'reveal' && !multi) || (phase === 'featured' && multi)
  useEffect(() => {
    if (!celebrating || !celebrated || celebrated.duplicate || reduceMotion) return undefined
    const colors = tokenColors(['gold', 'accent', 'danger', 'sky', 'primary', 'white'])
    if (celebrated.rarity === 'rare') confetti({ particleCount: 60, spread: 70, startVelocity: 35, origin: { y: 0.5 }, colors, zIndex: 60 })
    if (celebrated.rarity !== 'legendary') return undefined
    const end = Date.now() + T.confetti
    const id = setInterval(() => {
      if (Date.now() > end) return clearInterval(id)
      confetti({ particleCount: 40, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors, zIndex: 60 })
      confetti({ particleCount: 40, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors, zIndex: 60 })
      confetti({ particleCount: 30, spread: 360, startVelocity: 30, origin: { x: 0.5, y: 0.3 }, colors, zIndex: 60 })
      return undefined
    }, 250)
    return () => clearInterval(id)
  }, [celebrating, celebrated, reduceMotion])

  const skip = () => {
    skipRef.current = true
    if (results.length && phase !== 'charge') finish()
  }

  const again = () => {
    const next = data.spins[type] > 0 ? type : data.spins.normal > 0 ? 'normal' : 'special'
    setType(next)
    setResults([])
    setPhase('ready')
  }

  // Đổi thẻ đang xem thì vẽ lại ảnh chia sẻ
  useEffect(() => setShareImage(null), [featured])

  const featuredResult = results[featured]
  const featuredMascot = featuredResult ? byId[featuredResult.id] : null


  const choose = async (patch, toast) => {
    try {
      const user = await updateMascots(patch)
      if (user) setUser(user)
      setData(await fetchCollection())
      pushToast({ variant: 'success', ...toast })
    } catch (err) {
      pushToast({ variant: 'error', title: 'Chưa đổi được', message: messageFor(err) })
    }
  }

  const openShare = () => {
    setShareOpen(true)
    if (!shareImage && featuredMascot) drawSpinShareCard(featuredMascot, featuredRef.current?.querySelector('svg[viewBox="0 0 120 120"]')).then(setShareImage)
  }

  // Trạng thái hiển thị của từng thẻ
  const singleStage = { burst: 'fly', hint: 'hint', await: 'await', flip: 'flip', reveal: 'reveal', result: 'result' }[phase]
  const multiStage = (i) => {
    if (phase === 'spread') return 'fly'
    if (phase === 'flipping') return step > 2 * i + 1 ? 'reveal' : step === 2 * i + 1 ? 'hint' : 'down'
    return 'result'
  }
  const legendHint =
    (!multi && phase === 'hint' && results[0]?.rarity === 'legendary') ||
    (multi && phase === 'flipping' && step % 2 === 1 && results[Math.floor(step / 2)]?.rarity === 'legendary')
  const legendShow =
    celebrated && !celebrated.duplicate && celebrated.rarity === 'legendary' && (phase === 'result' || celebrating)
  const epicShake = celebrating && celebrated && !celebrated.duplicate && celebrated.rarity === 'epic' && !reduceMotion

  return (
    <div className={cx('relative isolate flex min-h-dvh flex-col overflow-hidden text-ink', legendShow ? 'bg-gold' : 'bg-bg', epicShake && 'anim-shake')}>
      {/* Nền: tia sáng tỏa chậm; Huyền Thoại chuyển vàng với tia trắng xoay */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        {legendShow ? <Rays color="white" opacity={0.4} duration={24} /> : <Rays color="gold" opacity={0.28} />}
      </div>

      {/* Gợi ý Huyền Thoại: cả màn tối lại, tia vàng xoáy quanh thẻ */}
      {legendHint && (
        <motion.div className="pointer-events-none fixed inset-0 z-40 bg-ink/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} aria-hidden="true">
          <Rays color="gold" opacity={0.5} duration={1.5} />
        </motion.div>
      )}

      <SpinHud
        onBack={() => navigate('/collection')}
        onOdds={() => setOddsOpen(true)}
        onSkip={skip}
        showSkip={opening}
        shardRef={shardRef}
        shards={shardsShown}
        bump={bump}
      />

      <main className="flex flex-1 flex-col items-center px-4 pb-[calc(190px+env(safe-area-inset-bottom))] pt-4 md:pb-12 md:pt-6">
        {phase === 'ready' && spinsLeft === 0 && <EmptyState nextSpin={data.nextSpin} onAcademy={() => navigate('/academy')} />}

        {phase === 'ready' && spinsLeft > 0 && (
          <div className="flex w-full flex-col items-center gap-5 md:gap-6">
            <TypeTabs type={type} spins={data.spins} onChange={setType} />
            <div className="relative my-2 w-[230px] md:w-[270px]">
              <CardPack variant={type} mode="idle" />
            </div>
            <div className="mt-6 flex w-full flex-col items-center gap-2">
              <PityBar pity={pity} pityEpic={data.pityEpic} />
              <button type="button" onClick={() => setOddsOpen(true)} className="min-h-11 font-display text-[13px] font-bold uppercase tracking-wide text-muted underline decoration-2 underline-offset-4">
                Xem tỉ lệ công khai
              </button>
            </div>

            {/* Nút: dính đáy trên mobile */}
            <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 border-t-thick border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:static md:border-0 md:bg-transparent md:p-0">
              <div className="flex w-full max-w-md gap-2 md:gap-3">
                <Button size="lg" variant={type === 'special' ? 'gold' : 'primary'} icon={Gift} className="flex-1 text-xl md:h-[72px] md:text-2xl" disabled={opening} onClick={() => open(1)}>
                  Mở thẻ
                </Button>
                {count > 1 && (
                  <Button size="lg" variant="secondary" icon={Stack} className="whitespace-nowrap px-4 md:h-[72px] md:px-6" disabled={opening} onClick={() => open(count)}>
                    Mở tất cả ({count})
                  </Button>
                )}
              </div>
              <NextSpinLine nextSpin={data.nextSpin} />
            </div>
          </div>
        )}

        {phase !== 'ready' && (
          <div className="relative z-50 flex w-full flex-col items-center gap-6 pt-28 md:gap-8 md:pt-32">
            {/* Hộp rung rồi bật tung */}
            {(phase === 'charge' || phase === 'burst') && (
              <div className={cx('w-[210px] md:w-[270px]', phase === 'burst' && 'pointer-events-none absolute left-1/2 top-28 -translate-x-1/2 md:top-32')}>
                <CardPack variant={packVariant} mode={phase} />
              </div>
            )}

            {/* Một thẻ */}
            {!multi && results[0] && phase !== 'charge' && (
              <>
                <RevealCard
                  mascot={byId[results[0].id]}
                  result={results[0]}
                  stage={singleStage}
                  onFlip={() => setPhase('flip')}
                  shardTarget={shardRef}
                  onShardsLanded={() => {
                    setShardsShown(latestRef.current.shards)
                    setBump((b) => b + 1)
                  }}
                  featured
                  cardRef={featuredRef}
                  className="w-[210px] md:w-[270px]"
                />
                {phase === 'await' && (
                  <p className="anim-blink rounded-pill border-2 border-line bg-surface px-4 font-display text-sm font-bold uppercase leading-9 tracking-wide shadow-hard-sm">
                    Chạm vào thẻ để lật
                  </p>
                )}
              </>
            )}

            {/* Nhiều thẻ: xếp hàng, lật lần lượt, thẻ hiếm nhất lên giữa */}
            {multi && phase !== 'charge' && phase !== 'burst' && (
              <LayoutGroup>
                {phase === 'spread' || phase === 'flipping' ? (
                  <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                    {results.map((r, i) => (
                      <motion.div key={i} layoutId={`spin-card-${i}`} className="w-[150px] md:w-[210px]">
                        <RevealCard mascot={byId[r.id]} result={r} stage={multiStage(i)} compact />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 md:flex-row md:gap-12">
                    <motion.div layoutId={`spin-card-${featured}`} className="w-[200px] md:w-[240px]" transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                      <RevealCard
                        mascot={featuredMascot}
                        result={featuredResult}
                        stage={phase === 'featured' ? 'reveal' : 'result'}
                        featured
                        cardRef={featuredRef}
                      />
                    </motion.div>
                    <div className="flex flex-wrap justify-center gap-3 md:max-w-[250px] md:flex-col">
                      {results.map((r, i) =>
                        i === featured ? null : (
                          <motion.div key={i} layoutId={`spin-card-${i}`} className="w-[88px] md:w-[110px]">
                            <RevealCard
                              mascot={byId[r.id]}
                              result={r}
                              stage="result"
                              compact
                              onSelect={phase === 'result' ? () => setFeatured(i) : undefined}
                            />
                          </motion.div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </LayoutGroup>
            )}

            {phase === 'result' && featuredMascot && (
              <ResultPanel
                mascot={featuredMascot}
                result={featuredResult}
                isAvatar={data.avatarId === featuredMascot.id}
                isArena={(data.arenaId ?? data.avatarId) === featuredMascot.id}
                spinsLeft={spinsLeft}
                onAvatar={() => choose({ avatarId: featuredMascot.id }, { title: 'Đã đổi avatar', message: `${featuredMascot.name} giờ là ảnh đại diện của bạn.` })}
                onArena={() => choose({ arenaId: featuredMascot.id }, { title: 'Sẵn sàng ra trận', message: `${featuredMascot.name} sẽ đấu cùng bạn ở Đấu Trường.` })}
                onAlbum={() => navigate(`/collection?mascot=${featuredMascot.id}`)}
                onAgain={again}
                onShare={openShare}
              />
            )}
          </div>
        )}
      </main>

      <OddsModal open={oddsOpen} onClose={() => setOddsOpen(false)} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} image={shareImage} />
    </div>
  )
}
