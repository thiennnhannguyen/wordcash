/*
 * Phòng chờ của phòng riêng.
 *
 * Hai ô người chơi đối diện nhau: người chơi (tím) bên trái, bạn bè (cam) bên phải trên desktop;
 * trên mobile bạn bè ở trên, người chơi ở dưới. Ô chưa có người là khung nét đứt nhấp nháy "Đang chờ bạn bè…".
 * Giữa là mã phòng, thông tin "B1 · 20 câu" và nút "Sao chép mã". Khi bạn vào, cả hai bấm "SẴN SÀNG"
 * (đổi thành dấu tích xanh chanh); đủ hai người sẵn sàng thì chuyển sang màn VS rồi vào sân đấu.
 * Trạng thái phòng do server gửi qua socket (hiện giả lập bằng `watchRoom` trong arenaMock.js).
 *
 * Dev: `?state=waiting|joined|ready` dừng ở một trạng thái (không chạy giả lập); `?joined=1` bạn đã ở sẵn trong phòng.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckFat, CopySimple, HourglassMedium, Lightning } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import RankBadge from '../../components/ui/RankBadge'
import MascotBlob from '../../components/collection/MascotBlob'
import RoomCode from './components/RoomCode'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { ArenaScene } from './ArenaScene'
import { OPPONENT, PLAYER_CARD, getRoom, watchRoom } from './arenaMock'
import VersusIntro from './VersusIntro'
import { getMascot } from '../fixtures/mascots'
import useSocket from '../../hooks/useSocket'

const FRIEND_PREVIEW = { ...OPPONENT, name: 'Khoa', rank: 'bac', mascot: getMascot(14), accuracy: 79, avgSeconds: 2.1 }
const START_DELAY_MS = 900

function ReadyBadge() {
  return (
    <motion.span
      initial={{ scale: 0.4, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className="flex h-16 w-full items-center justify-center gap-2 rounded-btn border-thick border-line bg-accent font-display text-lg font-bold uppercase tracking-wider text-ink shadow-hard"
    >
      <span className="grid size-9 place-items-center rounded-pill border-thick border-line bg-surface">
        <Icon icon={CheckFat} size={20} />
      </span>
      Sẵn sàng
    </motion.span>
  )
}

function PlayerSlot({ fighter, side, ready, onReady, isMe }) {
  const isPlayer = side === 'player'
  return (
    <motion.section
      layout
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={cx(
        'flex w-full flex-col gap-4 rounded-panel border-thick border-line p-4 shadow-hard-lg md:p-6',
        isPlayer ? 'bg-primary text-white' : 'bg-orange text-ink',
      )}
      aria-label={isMe ? 'Bạn' : `Bạn bè: ${fighter.name}`}
    >
      <span className={cx('self-start rounded-pill border-2 border-line bg-surface px-3 font-display text-xs font-bold uppercase leading-6 text-ink')}>
        {isMe ? 'Bạn' : 'Bạn bè'}
      </span>
      <div className="flex items-center gap-4 md:flex-col md:gap-3">
        <div className="anim-idle shrink-0">
          <MascotBlob color={fighter.mascot.color} shape={fighter.mascot.shape} size={170} className={cx('size-24 md:size-[160px]', !isPlayer && '-scale-x-100')} />
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:items-center">
          <span className="truncate font-heading text-[30px] font-black italic leading-none md:text-[40px]">{fighter.name}</span>
          <span className="inline-flex items-center gap-2 self-start rounded-pill border-thick border-line bg-surface py-0.5 pl-0.5 pr-3 text-ink md:self-center">
            <RankBadge rank={fighter.rank} size="sm" showName={false} className="[&>div]:size-7 [&>div]:shadow-none [&_svg]:size-4" />
            <span className="font-display text-xs font-bold uppercase tracking-wider">{RANK_BY_KEY[fighter.rank].name}</span>
          </span>
        </div>
      </div>
      {ready ? (
        <ReadyBadge />
      ) : isMe ? (
        <Button size="lg" variant="accent" icon={Lightning} fullWidth onClick={onReady}>
          Sẵn sàng
        </Button>
      ) : (
        <span className="anim-blink flex h-16 items-center justify-center gap-2 rounded-btn border-thick border-dashed border-line bg-surface/60 font-display text-base font-bold uppercase text-ink">
          <Icon icon={HourglassMedium} size={22} />
          Đang chuẩn bị…
        </span>
      )}
    </motion.section>
  )
}

function EmptySlot() {
  return (
    <section
      className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-panel border-4 border-dashed border-line bg-surface/90 p-6 md:min-h-[420px]"
      aria-label="Ô trống, đang chờ bạn bè"
    >
      <MascotBlob silhouette size={140} className="size-20 opacity-20 md:size-32" />
      <span className="anim-blink font-display text-lg font-bold uppercase tracking-wider">Đang chờ bạn bè…</span>
    </section>
  )
}

export default function RoomLobby() {
  // Kết nối Socket.IO chỉ mở khi vào Đấu Trường (xác thực bằng access token, tự làm mới khi hết hạn)
  useSocket()
  const navigate = useNavigate()
  const { code } = useParams()
  const [params] = useSearchParams()
  const pushToast = useToastStore((s) => s.push)
  const frozen = params.get('state')
  const [room, setRoom] = useState(null)
  const [friend, setFriend] = useState(frozen && frozen !== 'waiting' ? { ...FRIEND_PREVIEW, ready: frozen === 'ready' } : null)
  const [meReady, setMeReady] = useState(frozen === 'ready')
  const [showVs, setShowVs] = useState(false)

  useEffect(() => {
    getRoom(code).then(setRoom)
  }, [code])

  // Nghe sự kiện phòng: bạn vào, bạn sẵn sàng
  useEffect(() => {
    if (frozen) return undefined
    return watchRoom(
      { onJoin: (f) => setFriend({ ...f, ready: false }), onFriendReady: () => setFriend((f) => f && { ...f, ready: true }) },
      { joinMs: params.get('joined') === '1' ? 0 : 4000 },
    )
  }, [frozen, params])

  // Đủ hai người sẵn sàng thì bắt đầu
  const bothReady = meReady && friend?.ready
  useEffect(() => {
    if (!bothReady || frozen) return undefined
    const t = setTimeout(() => setShowVs(true), START_DELAY_MS)
    return () => clearTimeout(t)
  }, [bothReady, frozen])

  if (!room) return <div className="min-h-dvh bg-bg" aria-busy="true" />

  const info = `${room.levels.join(', ')} · ${room.questions} câu`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      pushToast({ variant: 'success', title: 'Đã chép mã phòng' })
    } catch {
      pushToast({ variant: 'error', title: 'Không chép được', message: 'Hãy chép thủ công nhé.' })
    }
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <ArenaScene className="absolute inset-0 -z-10" />
      <span className="absolute inset-0 -z-10 bg-ink/35" aria-hidden="true" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/dev/arena')}>
          Rời phòng
        </Button>
        <span className="rounded-pill border-thick border-line bg-surface px-4 font-display text-sm font-bold uppercase leading-9 shadow-hard-sm">Phòng riêng</span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-5 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 md:grid-cols-[1fr_minmax(0,400px)_1fr] md:gap-8 md:px-8 md:pb-10">
        {/* Người chơi: trái (desktop) / dưới (mobile) */}
        <div className="order-3 md:order-1">
          <PlayerSlot fighter={PLAYER_CARD} side="player" isMe ready={meReady} onReady={() => setMeReady(true)} />
        </div>

        {/* Giữa: mã phòng */}
        <div className="order-2 flex flex-col items-center gap-3 rounded-panel border-thick border-line bg-surface p-5 text-center shadow-hard-lg md:gap-4 md:p-6">
          <span className="hud-label">Mã phòng</span>
          <RoomCode code={room.code} className="md:gap-2" />
          <span className="rounded-pill border-2 border-line bg-raised px-3 font-display text-sm font-bold uppercase leading-7">{info}</span>
          <Button variant="secondary" icon={CopySimple} className="whitespace-nowrap" onClick={copy}>
            Sao chép mã
          </Button>
          <p className="text-caption text-muted">
            {bothReady ? 'Cả hai đã sẵn sàng. Vào trận!' : friend ? 'Cả hai bấm Sẵn sàng để bắt đầu.' : 'Gửi mã cho bạn bè để cùng vào phòng.'}
          </p>
        </div>

        {/* Bạn bè: phải (desktop) / trên (mobile) */}
        <div className="order-1 md:order-3">
          <AnimatePresence mode="wait">{friend ? <PlayerSlot key="friend" fighter={friend} side="opponent" ready={friend.ready} /> : <EmptySlot key="empty" />}</AnimatePresence>
        </div>
      </main>

      {showVs && friend && (
        <VersusIntro
          player={PLAYER_CARD}
          opponent={friend}
          match={{ pool: room.levels.join('–'), questions: room.questions, arenaName: room.arenaName }}
          onDone={() => navigate('/dev/arena/battle', { replace: true })}
        />
      )}
    </div>
  )
}
