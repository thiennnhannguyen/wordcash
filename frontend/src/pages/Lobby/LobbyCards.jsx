/*
 * Hai card lớn của Sảnh.
 * - Học Viện: bài đang học, hình thu nhỏ địa danh của chặng hiện tại ("Đang tới: Big Ben"), chip "Bài 3/5 · Chặng 3/9".
 *   Người mới: lời mời làm bài xếp lớp, địa danh đầu tiên (Hồ Gươm).
 * - Đấu Trường: ô VS (linh vật của mình — VS — ô "?" xoay chờ đối thủ), số người online, chuỗi thắng.
 * Số liệu lấy từ data/mockLobby.js.
 */

import { useNavigate } from 'react-router-dom'
import {
  Clock,
  Compass,
  Crown,
  DoorOpen,
  Fire,
  GraduationCap,
  Lightning,
  MapPin,
  MapTrifold,
  Play,
  Question,
  Sword,
  Trophy,
} from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import LevelTag from '../../components/ui/LevelTag'
import ProgressBar from '../../components/ui/ProgressBar'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import StageLandmark from '../../components/academy/landmarks/StageLandmark'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'

const INTRO_ICONS = { clock: Clock, map: MapTrifold, boss: Crown }

const CARD = 'relative flex w-full min-w-0 flex-col gap-5 rounded-panel border-thick border-line p-5 shadow-hard-lg lift-lg md:p-6'

function CardTitle({ id, icon, children }) {
  return (
    <div className="flex items-center gap-3">
      <IconBadge icon={icon} bg="surface" size="md" shape="square" />
      <h2 id={id} className="whitespace-nowrap font-display text-xl font-bold uppercase tracking-wide">
        {children}
      </h2>
    </div>
  )
}

function LandmarkThumb({ landmark, className }) {
  return (
    <figure className={cx('flex flex-col items-center', className)} aria-label={`${landmark.label}: ${landmark.name}`}>
      <div className="-mb-2">
        <StageLandmark landmarkKey={landmark.key} name={landmark.name} px={58} state="done" />
      </div>
      <figcaption className="relative z-10 inline-flex items-center gap-1 whitespace-nowrap rounded-pill border-2 border-line bg-surface px-2 py-0.5 text-[13px] font-semibold shadow-hard-sm">
        <Icon icon={MapPin} size={14} color="danger-deep" />
        {landmark.label}: {landmark.name}
      </figcaption>
    </figure>
  )
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-pill border-2 border-line bg-surface px-3 py-1 font-display text-[13px] font-bold uppercase tracking-wide">
      {children}
    </span>
  )
}

export function AcademyCard({ academy }) {
  const navigate = useNavigate()

  return (
    <section aria-labelledby="lobby-academy" className={cx(CARD, 'bg-sky')}>
      <CardTitle id="lobby-academy" icon={GraduationCap}>
        Học Viện
      </CardTitle>
      {/* Địa danh của chặng hiện tại ở góc trên phải */}
      <LandmarkThumb landmark={academy.landmark} className="absolute right-4 top-3 md:right-5" />

      {academy.isNew ? (
        <>
          <div className="flex flex-col gap-2">
            <LevelTag level="A1" size="sm" className="self-start" />
            <h3 className="text-[28px] leading-tight">Bắt đầu hành trình A1</h3>
            <p className="font-medium">Làm bài xếp lớp khoảng 5 phút để vào thẳng cấp phù hợp với bạn.</p>
          </div>
          <ul className="flex flex-col gap-2 rounded-[16px] border-thick border-line bg-surface p-3.5">
            {academy.intro.map((item) => (
              <li key={item.icon} className="flex items-center gap-2.5 text-caption font-semibold">
                <Icon icon={INTRO_ICONS[item.icon] ?? MapPin} size={20} color="primary" className="shrink-0" />
                {item.text}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-3">
            <Chip>Chặng 1/{academy.stagesTotal} · Việt Nam</Chip>
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
          <div className="mt-auto flex flex-col gap-3">
            <Chip>
              Bài {academy.lessonNumber}/{academy.lessonsInStage} · Chặng {academy.stage}/{academy.stagesTotal}
            </Chip>
            <Button size="lg" icon={Play} fullWidth onClick={() => navigate('/academy/lesson')}>
              Học tiếp
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t-2 border-line/20 pt-4">
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

function VersusBox({ mascot }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[18px] border-thick border-line bg-surface px-4 py-3" aria-label="Đang chờ ghép đối thủ">
      <div className="flex flex-col items-center gap-1">
        <span className="grid size-14 place-items-center overflow-hidden rounded-pill border-thick border-line bg-primary/25">
          <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={50} shadow={false} className="translate-y-1" />
        </span>
        <span className="font-display text-[13px] font-bold uppercase">Bạn</span>
      </div>
      <span
        aria-hidden="true"
        className="-rotate-6 font-display text-[34px] font-bold italic leading-none text-gold [-webkit-text-stroke:5px_var(--color-ink)] [paint-order:stroke_fill]"
        style={{ textShadow: '3px 3px 0 var(--color-ink)' }}
      >
        VS
      </span>
      <div className="flex flex-col items-center gap-1">
        <span className="relative grid size-14 place-items-center">
          <span className="anim-spin absolute inset-0 rounded-pill border-thick border-dashed border-line bg-raised" />
          <Icon icon={Question} size={26} color="ink" className="relative" />
        </span>
        <span className="font-display text-[13px] font-bold uppercase text-ink/70">Đang chờ…</span>
      </div>
    </div>
  )
}

function OnlineDot() {
  return (
    <span className="relative inline-flex size-3 shrink-0" aria-hidden="true">
      <span className="anim-ping absolute inset-0 rounded-pill bg-accent" />
      <span className="relative size-3 rounded-pill border-2 border-line bg-accent" />
    </span>
  )
}

export function ArenaCard({ arena, mascot, isNew }) {
  const navigate = useNavigate()
  const played = arena.weekWins + arena.weekLosses

  return (
    <section aria-labelledby="lobby-arena" className={cx(CARD, 'overflow-hidden bg-orange')}>
      <CardTitle id="lobby-arena" icon={Sword}>
        Đấu Trường
      </CardTitle>

      <div className="flex items-end justify-between gap-2">
        <h3 className="max-w-[12ch] text-[28px] leading-tight">Sẵn sàng thách đấu?</h3>
        {/* Linh vật tạm trong tư thế chiến đấu */}
        <div className="relative -mb-1 mr-1 shrink-0" aria-hidden="true">
          <MascotBlob color="primary" shape="round" size={96} className="-rotate-6" />
          <span className="absolute -right-3 top-5 rotate-[25deg]">
            <IconBadge icon={Sword} bg="gold" size="sm" />
          </span>
          <Sticker bg="surface" tilt={-8} size="sm" className="absolute -left-10 -top-2">
            Vào!
          </Sticker>
        </div>
      </div>

      <VersusBox mascot={mascot} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-semibold">
          <OnlineDot />
          <span>
            <span className="font-num">{formatNumber(arena.online)}</span> người đang online
          </span>
        </span>
        {arena.winStreak > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill border-2 border-line bg-gold px-3 py-1 font-display text-[13px] font-bold uppercase shadow-hard-sm">
            <Icon icon={Fire} size={16} color="danger-deep" />
            Chuỗi thắng: <span className="font-num">{arena.winStreak}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-pill border-2 border-line bg-surface px-3 py-1 font-display text-[13px] font-bold uppercase">
            <Icon icon={Fire} size={16} color="muted" />
            {isNew ? 'Trận đầu tiên đang chờ' : 'Thắng 1 trận để mở chuỗi'}
          </span>
        )}
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
