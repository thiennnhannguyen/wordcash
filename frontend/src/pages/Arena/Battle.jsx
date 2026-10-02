/*
 * Màn đấu: từ chạy phía trên, 2 linh vật, thanh máu, đáp án, hiệu ứng bắn.
 *
 * Ba lớp: sân đấu "Thành Phố Kẹo" (nền, 2 linh vật ~220px) → HUD (thanh máu, đồng hồ combo, khiên số câu,
 * đồng hồ đếm ngược) → khu câu hỏi (băng từ vựng, card, 4 đáp án). Trên cùng là lớp hiệu ứng.
 * Mobile (dọc, kiểu Clash Royale): đối thủ ở trên, người chơi ở dưới, đạn bay dọc, đáp án xếp dọc cao 60px.
 *
 * Client không tự chấm gì: mọi kết quả (đúng/sai, ai trúng, sát thương, máu, combo, K.O.) đến từ server
 * (hiện là battleMock.js); màn này chỉ dàn dựng hiệu ứng theo thông số chuyển động:
 * đạn bay 250ms ease-in → hit-stop 80ms → rung 200ms (6px, chí mạng 10px) → máu tụt ngay, máu trễ rút sau 400ms
 * → số sát thương bay lên 40px trong 700ms → lật card lộ nghĩa → câu kế tiếp trượt vào.
 *
 * Dev: `?scene=intro|shoot|hit|crit|hurt|wrong|draw|reveal|ko|timeup|listen|fill|opp-offline|offline|stickers`
 * dựng sẵn từng trạng thái và giữ nguyên hiệu ứng để xem; không có `scene` là chơi thử cả trận với đối thủ giả.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useAnimate } from 'framer-motion'
import MascotFighter from '../../components/game/MascotFighter'
import WordTicker from '../../components/game/WordTicker'
import { Bullet, Sparks } from '../../components/game/BulletEffect'
import useMediaQuery from '../../hooks/useMediaQuery'
import cx from '../../utils/cx'
import { ARENA } from '../../utils/constants'
import { OPPONENT, PLAYER_CARD } from './arenaMock'
import { STICKERS, createBattle } from './battleMock'
import BattleScene from './battle/BattleScene'
import { HpPanel, RoundCenter } from './battle/BattleHud'
import { AnswerGrid, BattleCard, StatusLine } from './battle/BattleQuestion'
import { Banner, DamagePopup, EdgeFlash, HpCompare, OpponentOfflineBanner, ReconnectOverlay, StickerPicker, WhiteFlash } from './battle/BattleFx'

const HIT_STOP_MS = 80
const STICKER_MS = 2000
const NO_REVEAL_SCENES = new Set(['hit', 'shoot', 'crit', 'hurt', 'draw', 'wrong', 'ko'])

const centerOf = (el) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
const headOf = (el) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + 8 }
}

export default function Battle() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const scene = params.get('scene') ?? 'play'
  const hold = scene !== 'play'
  const desktop = useMediaQuery('(min-width: 768px)')

  const [round, setRound] = useState(null)
  const [hp, setHp] = useState({ me: ARENA.MAX_HP, opp: ARENA.MAX_HP })
  const [combo, setCombo] = useState({ me: 0, opp: 0 })
  const [myChoice, setMyChoice] = useState(null)
  const [myVerdict, setMyVerdict] = useState(null)
  const [slowerBy, setSlowerBy] = useState(null)
  const [result, setResult] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const [banner, setBanner] = useState(null)
  const [poses, setPoses] = useState({ me: { pose: 'idle', key: 0 }, opp: { pose: 'idle', key: 0 } })
  const [bullet, setBullet] = useState(null)
  const [sparks, setSparks] = useState(null)
  const [popups, setPopups] = useState([])
  const [flash, setFlash] = useState(null)
  const [whiteFlash, setWhiteFlash] = useState(null)
  const [hitstop, setHitstop] = useState(false)
  const [compare, setCompare] = useState(null)
  const [shatter, setShatter] = useState({ me: null, opp: null })
  const [hitKeys, setHitKeys] = useState({ me: 0, opp: 0 })
  const [oppLostUntil, setOppLostUntil] = useState(null)
  const [selfLost, setSelfLost] = useState(false)
  const [stickers, setStickers] = useState({ me: null, opp: null })
  const [pickerOpen, setPickerOpen] = useState(scene === 'stickers')

  const [stageRef, animateStage] = useAnimate()
  const meRef = useRef(null)
  const oppRef = useRef(null)
  const battleRef = useRef(null)
  const firstCardRef = useRef(true)
  const comboRef = useRef(combo)
  const timers = useRef([])
  const later = useCallback((ms, fn) => timers.current.push(setTimeout(fn, ms)), [])
  const fighterEl = (side) => (side === 'me' ? meRef.current : oppRef.current)
  comboRef.current = combo

  const setPose = (side, pose) => setPoses((p) => ({ ...p, [side]: { pose, key: p[side].key + 1 } }))
  const shake = (amp, duration = 0.2) =>
    stageRef.current && animateStage(stageRef.current, { x: [0, -amp, amp, -amp * 0.6, amp * 0.6, 0], y: [0, amp * 0.4, -amp * 0.4, amp * 0.2, 0, 0] }, { duration })
  const popup = (side, data) => {
    const el = fighterEl(side)
    if (!el) return
    // Mobile: linh vật nhỏ, đối thủ sát mép trên, nên số bay lên cạnh phải linh vật thay vì trên đầu
    const c = centerOf(el)
    const at = desktop ? headOf(el) : { x: Math.min(c.x + 100, window.innerWidth - 70), y: c.y + 50 }
    setPopups((list) => [...(hold ? list : list.slice(-2)), { key: Date.now() + Math.random(), at, ...data }])
  }
  const breakCombo = (side, prev) => prev > 0 && setShatter((s) => ({ ...s, [side]: { key: Date.now(), count: prev } }))
  const canReveal = !NO_REVEAL_SCENES.has(scene)

  // ---------- Dàn dựng theo sự kiện server ----------

  function impact(e) {
    const { damage } = e
    setBullet(null)
    setHitstop(true)
    later(HIT_STOP_MS, () => {
      setHitstop(false)
      setHp(e.hp)
      setCombo(e.combo)
      shake(damage.crit ? 10 : 6)
      setPose(damage.target, 'hit')
      const el = fighterEl(damage.target)
      if (el) setSparks({ key: Date.now(), at: centerOf(el), big: damage.crit })
      popup(damage.target, {
        amount: damage.amount,
        crit: damage.crit,
        label: damage.fast ? `Nhanh! +${damage.bonus}` : null,
      })
      setHitKeys((k) => ({ ...k, [damage.target]: k[damage.target] + 1 }))
      if (damage.target === 'me') setFlash({ key: Date.now(), color: 'danger', side: desktop ? 'left' : 'bottom' })
      if (e.ko) knockOut(e.ko)
      else if (canReveal) later(900, () => setFlipped(true))
    })
  }

  function knockOut(target) {
    const el = fighterEl(target)
    setPose(target, 'ko')
    if (el && stageRef.current) {
      const c = centerOf(el)
      // Chuyển chậm và phóng to vào linh vật bị hạ
      stageRef.current.style.transformOrigin = `${c.x}px ${c.y}px`
      animateStage(stageRef.current, { scale: 1.22 }, { duration: 1.1, ease: [0.2, 0.8, 0.3, 1] })
    }
    later(900, () => {
      setBanner('ko')
      shake(10, 0.25)
    })
    later(1250, () => setWhiteFlash(Date.now()))
  }

  function handle(e) {
    const battle = battleRef.current
    switch (e.type) {
      case 'intro':
        setBanner('ready')
        later(850, () => {
          setBanner('fight')
          shake(6, 0.15)
        })
        if (scene !== 'intro') later(1650, () => setBanner(null))
        break

      case 'round_start':
        setRound({ round: e.round, total: e.total, question: e.question, endsAt: e.endsAt, ticker: e.ticker, first: firstCardRef.current })
        firstCardRef.current = false
        setHp(e.hp)
        setCombo(e.combo)
        setMyChoice(null)
        setMyVerdict(null)
        setSlowerBy(null)
        setResult(null)
        setFlipped(false)
        setBullet(null)
        setFlash(null)
        setPopups([])
        setPoses({ me: { pose: 'idle', key: 0 }, opp: { pose: 'idle', key: 0 } })
        if (e.question.type === 2) later(500, () => battle.playAudio(e.question.id))
        break

      case 'self_result':
        setMyVerdict('wrong')
        setMyChoice(e.choice)
        breakCombo('me', comboRef.current.me)
        setHp(e.hp)
        setCombo(e.combo)
        setPose('me', 'stumble')
        popup('me', { amount: e.amount, label: 'Tự trúng đòn', labelTone: 'danger' })
        setHitKeys((k) => ({ ...k, me: k.me + 1 }))
        break

      case 'opponent_self':
        breakCombo('opp', comboRef.current.opp)
        setHp(e.hp)
        setCombo(e.combo)
        setPose('opp', 'stumble')
        popup('opp', { amount: e.amount, label: 'Tự trúng đòn', labelTone: 'danger' })
        break

      case 'late':
        setMyChoice(e.choice)
        setMyVerdict('late')
        setSlowerBy(e.slowerBy)
        break

      case 'round_result': {
        setResult(e)
        if (e.myChoice != null) setMyChoice((c) => c ?? e.myChoice)
        const { damage } = e
        if (damage) {
          const shooter = damage.from
          setPose(shooter, 'recoil')
          if (damage.crit) {
            setBanner('crit')
            setFlash({ key: Date.now(), color: 'gold', side: 'all' })
            if (!hold) later(1000, () => setBanner(null))
          }
          later(60, () => {
            const from = fighterEl(shooter)
            const to = fighterEl(damage.target)
            if (!from || !to) return impact(e)
            setBullet({
              frozen: scene === 'shoot',
              key: Date.now(),
              from: centerOf(from),
              to: centerOf(to),
              letter: e.word.charAt(0).toUpperCase(),
              color: shooter === 'me' ? 'primary' : 'orange',
              crit: damage.crit,
              result: e,
            })
          })
        } else {
          setHp(e.hp)
          setCombo(e.combo)
          if (e.ko) knockOut(e.ko)
          else {
            setPose('me', 'scratch')
            setPose('opp', 'scratch')
            setBanner('draw')
            if (!hold) later(1000, () => setBanner(null))
            if (canReveal) later(1100, () => setFlipped(true))
          }
        }
        break
      }

      case 'match_end':
        if (e.reason === 'rounds') {
          later(200, () => setBanner('timeup'))
          later(1500, () => {
            setBanner(null)
            setCompare({ hp: e.hp, winner: e.winner })
          })
          if (!hold) later(4200, () => navigate('/arena/result', { replace: true, state: e }))
        } else if (!hold) {
          later(400, () => navigate('/arena/result', { replace: true, state: e }))
        }
        break

      case 'opponent_connection':
        setOppLostUntil(e.status === 'lost' ? Date.now() + e.graceSeconds * 1000 : null)
        break

      case 'connection':
        setSelfLost(e.status === 'lost')
        break

      case 'sticker': {
        const text = STICKERS.find((s) => s.id === e.id)?.text
        setStickers((s) => ({ ...s, [e.side]: { key: Date.now(), text } }))
        if (!hold) later(STICKER_MS, () => setStickers((s) => ({ ...s, [e.side]: null })))
        break
      }
      default:
    }
  }

  const handlerRef = useRef(handle)
  handlerRef.current = handle

  useEffect(() => {
    const battle = createBattle({ scene, onEvent: (e) => handlerRef.current(e) })
    battleRef.current = battle
    battle.start()
    const pending = timers.current
    return () => {
      battle.dispose()
      pending.forEach(clearTimeout)
    }
  }, [scene])

  // ---------- Người chơi trả lời ----------

  const question = round?.question
  const answerDisabled = !question || myChoice != null || !!result || selfLost || !!oppLostUntil
  const answer = useCallback(
    (i) => {
      if (answerDisabled) return
      setMyChoice(i)
      battleRef.current.submit(question.id, i)
    },
    [answerDisabled, question],
  )

  // Phím tắt 1–4
  useEffect(() => {
    const onKey = (event) => {
      const n = Number(event.key)
      if (n >= 1 && n <= 4) answer(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])

  const stickerWindow = !!result && !result.ko
  const sendSticker = (id) => {
    if (battleRef.current.sendSticker(id)) setPickerOpen(false)
  }

  const lockedOut = result?.outcome === 'opp_hit' && (myChoice == null || myVerdict === 'late')
  const choiceText = myChoice != null && question ? question.options[myChoice] : null
  const timerProps = {
    round: round?.round ?? 1,
    total: round?.total ?? ARENA.MAX_QUESTIONS,
    endsAt: round?.endsAt,
    running: !result && !oppLostUntil && !selfLost,
    frozenSeconds: hold ? 8 : undefined,
  }
  const questionProps = question && {
    card: (
      <BattleCard
        question={question}
        result={result}
        flipped={flipped}
        first={round.first}
        compact={!desktop}
        choiceText={choiceText}
        onPlayAudio={(opts) => battleRef.current.playAudio(question.id, opts)}
      />
    ),
    answers: (
      <AnswerGrid question={question} result={result} myChoice={myChoice} myVerdict={myVerdict} slowerBy={slowerBy} disabled={answerDisabled} onAnswer={answer} compact={!desktop} />
    ),
    status: <StatusLine myChoice={myChoice} result={result} myVerdict={myVerdict} lockedOut={lockedOut} />,
  }

  const fighter = (side, sizeClass, className) => (
    <MascotFighter
      innerRef={side === 'me' ? meRef : oppRef}
      mascot={side === 'me' ? PLAYER_CARD.mascot : OPPONENT.mascot}
      facing={side === 'me' ? 'right' : 'left'}
      pose={poses[side].pose}
      poseKey={`${side}-${poses[side].key}`}
      sticker={stickers[side]}
      sizeClass={sizeClass}
      className={className}
    />
  )
  const panel = (side, compact) => (
    <HpPanel side={side} fighter={side === 'me' ? PLAYER_CARD : OPPONENT} hp={hp[side]} combo={combo[side]} shatter={shatter[side]} hitKey={hitKeys[side]} compact={compact} />
  )
  const picker = (className) => (
    <StickerPicker stickers={STICKERS} open={pickerOpen} onToggle={() => setPickerOpen((o) => !o)} enabled={stickerWindow} onSend={sendSticker} className={className} />
  )

  return (
    <div className={cx('fixed inset-0 select-none overflow-hidden bg-bg', hitstop && 'hitstop')}>
      <div ref={stageRef} className="absolute inset-0 isolate">
        <BattleScene className="absolute inset-0 -z-10" />

        {desktop ? (
          <>
            <div className="absolute bottom-[4%] left-[7%] z-10">{fighter('me', 'size-[220px]')}</div>
            <div className="absolute bottom-[4%] right-[7%] z-10">{fighter('opp', 'size-[220px]')}</div>

            <div className="absolute inset-x-0 top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-8 px-8 pt-5">
              {panel('me')}
              <RoundCenter {...timerProps} />
              {panel('opp')}
            </div>

            {question && (
              <main className="absolute left-1/2 top-[178px] z-20 flex w-[600px] -translate-x-1/2 flex-col gap-4">
                <WordTicker items={round.ticker} />
                {questionProps.card}
                {questionProps.answers}
                {questionProps.status}
              </main>
            )}
            <div className="absolute bottom-6 left-6 z-30">{picker()}</div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col gap-1.5 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            {panel('opp', true)}
            <div className="flex h-[92px] shrink-0 items-end justify-center">{fighter('opp', 'size-[92px]')}</div>
            <div className="flex shrink-0 items-center gap-2" aria-hidden={false}>
              <span className="h-0 flex-1 border-t-4 border-dashed border-line/40" />
              <RoundCenter {...timerProps} row />
              <span className="h-0 flex-1 border-t-4 border-dashed border-line/40" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
              {questionProps?.card}
              {questionProps?.status}
            </div>
            <div className="relative flex h-[88px] shrink-0 items-end justify-center">
              <div className="absolute bottom-1 left-0 z-30">{picker()}</div>
              {fighter('me', 'size-[88px]')}
            </div>
            {panel('me', true)}
            <div className="mt-1 shrink-0">{questionProps?.answers}</div>
          </div>
        )}
      </div>

      {/* Nối tiếp vệt trắng của màn VS: sân đấu lộ ra từ màn trắng */}
      {!hold && <motion.div className="pointer-events-none fixed inset-0 z-[80] bg-white" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />}

      {/* Lớp hiệu ứng */}
      {bullet && <Bullet key={bullet.key} from={bullet.from} to={bullet.to} letter={bullet.letter} color={bullet.color} crit={bullet.crit} frozen={bullet.frozen} onImpact={() => !bullet.frozen && impact(bullet.result)} />}
      {sparks && <Sparks key={sparks.key} at={sparks.at} big={sparks.big} />}
      {popups.map((p) => (
        <DamagePopup key={p.key} at={p.at} amount={p.amount} label={p.label} labelTone={p.labelTone} crit={p.crit} hold={hold} />
      ))}
      <EdgeFlash flash={flash} hold={hold} />
      <WhiteFlash flashKey={whiteFlash} hold={hold} />
      <Banner kind={banner} />
      {compare && <HpCompare me={PLAYER_CARD} opp={OPPONENT} hp={compare.hp} winner={compare.winner} />}
      {oppLostUntil && <OpponentOfflineBanner until={oppLostUntil} />}
      {selfLost && <ReconnectOverlay mascot={PLAYER_CARD.mascot} />}
    </div>
  )
}
