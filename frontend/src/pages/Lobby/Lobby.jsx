/*
 * Sảnh chính: vào Học Viện, Đấu Trường, Bộ Sưu Tập; hiện rank, streak, lượt quay.
 *
 * Màn người dùng thấy mỗi ngày sau khi làm xong Cửa Ải Hôm Nay; mục tiêu là cho biết ngay "hôm nay làm gì tiếp".
 * Hiện dùng dữ liệu mẫu (lobbyMock.js). Biến thể xem bằng `?variant=shaky` hoặc `?variant=new`;
 * thanh chuyển biến thể chỉ hiện ở môi trường dev.
 */

import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircle,
  Clock,
  Compass,
  DoorOpen,
  GraduationCap,
  Lightning,
  Play,
  Sword,
  Trophy,
  WarningCircle,
} from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import LevelTag from '../../components/ui/LevelTag'
import ProgressBar from '../../components/ui/ProgressBar'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import StatusBar from '../../components/layout/StatusBar'
import cx from '../../utils/cx'
import { getLobbyMock, LOBBY_VARIANTS } from './lobbyMock'
import { FriendsWidget, MascotWidget, NextRankWidget, NextSpinWidget } from './LobbyWidgets'

function VariantSwitcher({ current, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[16px] border-2 border-dashed border-line/40 p-2">
      <span className="hud-label px-1">Biến thể (dev)</span>
      {LOBBY_VARIANTS.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onChange(v.key)}
          aria-pressed={current === v.key}
          className={cx(
            'h-9 rounded-pill border-2 border-line px-3 font-display text-xs font-bold uppercase',
            current === v.key ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-raised',
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

function AcademyCard({ academy }) {
  const navigate = useNavigate()

  return (
    <section
      aria-labelledby="lobby-academy"
      className="flex min-w-0 flex-col gap-5 rounded-panel border-thick border-line bg-sky p-5 shadow-hard-lg md:p-6"
    >
      <div className="flex items-center gap-3">
        <IconBadge icon={GraduationCap} bg="surface" size="md" shape="square" />
        <h2 id="lobby-academy" className="font-display text-xl font-bold uppercase tracking-wide">
          Học Viện
        </h2>
      </div>

      {academy.isNew ? (
        <>
          <div className="flex flex-col gap-2">
            <LevelTag level="A1" size="sm" className="self-start" />
            <h3 className="text-[28px] leading-tight">Bắt đầu hành trình A1</h3>
            <p className="font-medium">Làm bài xếp lớp khoảng 5 phút để vào thẳng cấp phù hợp với bạn.</p>
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Button size="lg" icon={Compass} fullWidth onClick={() => navigate('/academy/placement')}>
              Làm bài xếp lớp
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/academy')}>
              Hoặc học từ A1
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className="hud-label text-ink/70">Tiếp tục</span>
            <div className="flex flex-wrap items-center gap-2">
              <LevelTag level={academy.level} size="sm" />
              <span className="font-display text-sm font-bold uppercase">{academy.topic}</span>
            </div>
            <h3 className="text-[26px] leading-tight md:text-[28px]">
              Bài {academy.lessonNumber}: {academy.lessonTitle}
            </h3>
          </div>
          <div className="rounded-[16px] border-thick border-line bg-surface p-3.5">
            <ProgressBar value={academy.learned} max={academy.total} showValue label="Tiến độ bài" />
          </div>
          <Button size="lg" icon={Play} fullWidth onClick={() => navigate('/academy/lesson')}>
            Học tiếp
          </Button>
          <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-line/20 pt-4">
            <span className="flex items-center gap-2 font-semibold">
              <Icon icon={Clock} size={22} color="ink" />
              {academy.dueReviews} từ đến hạn ôn
            </span>
            <Button variant="secondary" size="sm" onClick={() => navigate('/academy/review')}>
              Ôn ngay
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

function ArenaCard({ arena }) {
  const navigate = useNavigate()
  const played = arena.weekWins + arena.weekLosses

  return (
    <section
      aria-labelledby="lobby-arena"
      className="relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-panel border-thick border-line bg-orange p-5 shadow-hard-lg md:p-6"
    >
      <div className="flex items-center gap-3">
        <IconBadge icon={Sword} bg="surface" size="md" shape="square" />
        <h2 id="lobby-arena" className="font-display text-xl font-bold uppercase tracking-wide">
          Đấu Trường
        </h2>
      </div>

      <div className="flex items-end justify-between gap-2">
        <h3 className="max-w-[12ch] text-[28px] leading-tight">Sẵn sàng thách đấu?</h3>
        {/* Linh vật tạm trong tư thế chiến đấu */}
        <div className="relative -mb-1 mr-1 shrink-0" aria-hidden="true">
          <MascotBlob color="primary" shape="round" size={112} className="-rotate-6" />
          <span className="absolute -right-3 top-6 rotate-[25deg]">
            <IconBadge icon={Sword} bg="gold" size="sm" />
          </span>
          <Sticker bg="surface" tilt={-8} size="sm" className="absolute -left-10 -top-2">
            Vào!
          </Sticker>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <Button size="lg" icon={Lightning} fullWidth onClick={() => navigate('/arena/matchmaking')}>
          Tìm trận
        </Button>
        <Button variant="secondary" icon={DoorOpen} fullWidth onClick={() => navigate('/arena')}>
          Phòng riêng
        </Button>
      </div>
      <div className="flex items-center gap-2 border-t-2 border-line/20 pt-4 font-semibold">
        <Icon icon={Trophy} size={22} color="ink" />
        {played > 0 ? (
          <span>
            Tuần này: <span className="font-num">{arena.weekWins}</span> thắng ·{' '}
            <span className="font-num">{arena.weekLosses}</span> thua
          </span>
        ) : (
          <span>Tuần này chưa có trận nào</span>
        )}
      </div>
    </section>
  )
}

export default function Lobby() {
  const [params, setParams] = useSearchParams()
  const variant = params.get('variant') ?? 'default'
  const data = getLobbyMock(variant)

  return (
    <div className="flex flex-col gap-6">
      {import.meta.env.DEV && (
        <VariantSwitcher current={variant} onChange={(key) => setParams(key === 'default' ? {} : { variant: key })} />
      )}

      <StatusBar stats={data.stats} mascot={data.mascot} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
        {/* Cột chính */}
        <div className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-3">
            <h1 className="text-[34px] leading-[1.05] md:text-[40px]">
              Chào {data.user.name}! <br className="sm:hidden" />
              Hôm nay đánh trận nào?
            </h1>
            {data.dailyCheck && (
              <p
                className={cx(
                  'inline-flex items-center gap-2 self-start rounded-pill border-thick border-line px-3.5 py-1.5 text-caption font-semibold shadow-hard-sm',
                  data.dailyCheck.correct === data.dailyCheck.total ? 'bg-accent' : 'bg-gold',
                )}
              >
                <Icon icon={CheckCircle} size={18} color="ink" />
                Cửa Ải hôm nay: {data.dailyCheck.correct}/{data.dailyCheck.total} đúng
                {data.dailyCheck.streakGained && ' · Streak +1'}
              </p>
            )}
            {data.shaky && (
              <p className="anim-alert inline-flex items-center gap-2 self-start rounded-pill border-thick border-danger bg-surface px-3.5 py-1.5 text-caption font-semibold">
                <Icon icon={WarningCircle} size={18} color="danger-deep" />
                Rank lung lay · còn {data.shaky.daysLeft} ngày · Ôn {data.shaky.wordsToReview} từ để giữ rank
              </p>
            )}
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <AcademyCard academy={data.academy} />
            <ArenaCard arena={data.arena} />
          </div>
        </div>

        {/* Cột phải: widget */}
        <aside aria-label="Tiện ích" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
          <NextRankWidget nextRank={data.nextRank} shaky={data.shaky} />
          <NextSpinWidget nextSpin={data.nextSpin} spins={data.stats.spins} />
          <MascotWidget mascot={data.mascot} />
          <FriendsWidget friends={data.friends} />
        </aside>
      </div>
    </div>
  )
}
