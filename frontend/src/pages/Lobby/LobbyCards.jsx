/*
 * Hai card lớn của Sảnh.
 * - Học Viện (GET /me/stats): bài đang học, hình thu nhỏ địa danh của chặng hiện tại ("Đang tới: …"), chip "Bài x/y · Chặng a/b",
 *   tiến độ bài (số từ đã gặp / tổng, chỉ khi đọc được chi tiết bài), số từ đến hạn ôn. Có trạng thái tải / lỗi.
 * - Đấu Trường: chưa có backend → "ĐẤU TRƯỜNG SẮP MỞ" với linh vật đang dùng; nút Tìm trận / Phòng riêng bị vô hiệu kèm nhãn
 *   "Sắp ra mắt". Không hiện số người online, thắng/thua hay chuỗi thắng.
 */

import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, DoorOpen, GraduationCap, Hourglass, Lightning, MapPin, Play, Question, Sword } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import LevelTag from '../../components/ui/LevelTag'
import ProgressBar from '../../components/ui/ProgressBar'
import MascotBlob from '../../components/collection/MascotBlob'
import StageLandmark from '../../components/academy/landmarks/StageLandmark'
import { ErrorState, Skeleton } from '../../components/ui/DataState'
import cx from '../../utils/cx'

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
  if (!landmark) return null
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

function AcademyBody({ academy }) {
  const navigate = useNavigate()
  if (academy.lessonTitle == null) {
    return (
      <div className="flex flex-1 flex-col items-start gap-3">
        <Icon icon={CheckCircle} size={36} color="ink" />
        <h3 className="text-[26px] leading-tight">{academy.done ? 'Bạn đã đi hết lộ trình hiện có' : 'Lộ trình đang được chuẩn bị'}</h3>
        <p className="font-medium">{academy.done ? 'Cấp mới sẽ được mở thêm. Trong lúc chờ, ôn lại để giữ từ đã thuộc nhé.' : 'Chưa có bài học nào. Quay lại sau nhé.'}</p>
        <Button className="mt-auto" variant="secondary" fullWidth onClick={() => navigate('/academy')}>
          Mở Học Viện
        </Button>
      </div>
    )
  }
  const started = academy.progress ? academy.progress.learned > 0 : true
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="hud-label text-ink/70">{started ? 'Tiếp tục' : 'Bắt đầu'}</span>
        <div className="flex flex-wrap items-center gap-2">
          <LevelTag level={academy.level} size="sm" />
          <span className="font-display text-sm font-bold uppercase">{academy.topic}</span>
        </div>
        <h3 className="text-[26px] leading-tight md:text-[28px]">
          {academy.lessonNumber != null ? `Bài ${academy.lessonNumber}: ` : ''}
          {academy.lessonTitle}
        </h3>
      </div>
      {academy.progress && (
        <div className="rounded-[16px] border-thick border-line bg-surface p-3.5">
          <ProgressBar value={academy.progress.learned} max={Math.max(academy.progress.total, 1)} showValue label="Từ đã gặp trong bài" />
        </div>
      )}
      <div className="mt-auto flex flex-col gap-3">
        <Chip>
          {academy.lessonNumber != null && `Bài ${academy.lessonNumber}/${academy.lessonsInStage} · `}
          Chặng {academy.stage}/{academy.stagesTotal}
        </Chip>
        <Button size="lg" icon={Play} fullWidth onClick={() => navigate(academy.to)}>
          {started ? 'Học tiếp' : 'Bắt đầu học'}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3 border-t-2 border-line/20 pt-4">
        <span className="flex items-center gap-2 font-semibold">
          <Icon icon={Clock} size={22} color="ink" />
          {academy.dueReviews > 0 ? `${academy.dueReviews} từ đến hạn ôn` : 'Chưa có từ đến hạn ôn'}
        </span>
        <Button variant="secondary" size="sm" onClick={() => navigate('/academy/review')}>
          Ôn tập
        </Button>
      </div>
    </>
  )
}

export function AcademyCard({ core }) {
  const academy = core.data?.academy
  return (
    <section aria-labelledby="lobby-academy" aria-busy={core.status === 'loading'} className={cx(CARD, 'bg-sky')}>
      <CardTitle id="lobby-academy" icon={GraduationCap}>
        Học Viện
      </CardTitle>
      {/* Địa danh của chặng hiện tại ở góc trên phải */}
      {academy && <LandmarkThumb landmark={academy.landmark} className="absolute right-4 top-3 md:right-5" />}
      {core.status === 'loading' && (
        <div className="flex flex-1 flex-col gap-3" role="status" aria-label="Đang tải">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="mt-auto h-16 w-full" rounded="rounded-pill" />
        </div>
      )}
      {core.status === 'error' && <ErrorState title="Chưa tải được bài đang học" onRetry={core.reload} className="flex-1 justify-center" />}
      {academy && <AcademyBody academy={academy} />}
    </section>
  )
}

function VersusBox({ mascot }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[18px] border-thick border-line bg-surface px-4 py-3" aria-hidden="true">
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
        <span className="font-display text-[13px] font-bold uppercase text-ink/70">Sắp mở</span>
      </div>
    </div>
  )
}

/** Nút bị vô hiệu kèm nhãn "Sắp ra mắt" (tính năng chưa có backend). */
function SoonButton({ icon, size, children }) {
  return (
    <span className="relative block">
      <Button size={size} variant={size === 'lg' ? 'primary' : 'secondary'} icon={icon} fullWidth disabled aria-describedby="arena-soon">
        {children}
      </Button>
      <span className="absolute -right-2 -top-3 rotate-6 rounded-pill border-2 border-line bg-gold px-2 py-0.5 font-display text-[13px] font-bold uppercase shadow-hard-sm">
        Sắp ra mắt
      </span>
    </span>
  )
}

export function ArenaCard({ mascot }) {
  return (
    <section aria-labelledby="lobby-arena" className={cx(CARD, 'overflow-hidden bg-orange')}>
      <CardTitle id="lobby-arena" icon={Sword}>
        Đấu Trường
      </CardTitle>

      <div className="flex items-end justify-between gap-2">
        <h3 className="max-w-[12ch] text-[28px] leading-tight">Đấu Trường sắp mở</h3>
        {/* Linh vật đang dùng trong tư thế chờ trận */}
        <div className="relative -mb-1 mr-1 shrink-0" aria-hidden="true">
          <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={96} className="-rotate-6" />
          <span className="absolute -right-3 top-5 rotate-[25deg]">
            <IconBadge icon={Hourglass} bg="gold" size="sm" />
          </span>
        </div>
      </div>

      <VersusBox mascot={mascot} />

      <p id="arena-soon" className="font-medium">
        Đấu 1v1 thời gian thực đang được xây dựng. Học thêm từ ngay hôm nay để vào trận với vốn từ thật.
      </p>

      <div className="mt-auto flex flex-col gap-4">
        <SoonButton size="lg" icon={Lightning}>
          Tìm trận
        </SoonButton>
        <SoonButton icon={DoorOpen}>Phòng riêng</SoonButton>
      </div>
    </section>
  )
}
