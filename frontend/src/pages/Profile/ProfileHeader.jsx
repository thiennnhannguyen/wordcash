/*
 * Phần đầu Hồ sơ: ảnh bìa là dải màu theo rank hiện tại có họa tiết kim cương nhỏ, linh vật đại diện cỡ lớn (khung độ hiếm)
 * đứng lấn ra khỏi ảnh bìa, tên, @handle, ngày tham gia, huy hiệu rank lớn kèm số từ đã thuộc,
 * hàng viên chỉ số (streak, streak cao nhất, cấp hiện tại) và các nút hành động theo chế độ:
 * của tôi (Chỉnh sửa, Chia sẻ, Tải thẻ chứng nhận, cài đặt) hoặc người khác (THÁCH ĐẤU, Kết bạn, thành tích đối đầu).
 * Mobile: ảnh bìa thấp hơn, linh vật và tên căn giữa.
 */

import { Certificate, CheckFat, Fire, GearSix, PencilSimple, ShareNetwork, Sword, Trophy, UserPlus } from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import LevelTag from '../../components/ui/LevelTag'
import MascotCard from '../../components/collection/MascotCard'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { formatNumber } from '../../utils/format'
import MascotArt from '../Collection/MascotArt'
import RankEmblem from '../../components/ui/RankEmblem'

// Ảnh bìa: màu rank + họa tiết kim cương nhỏ lặp lại
function Cover({ rank, children }) {
  const legend = rank === 'huyen_thoai'
  return (
    <div
      className={cx('relative h-36 overflow-hidden rounded-t-[25px] border-b-thick border-line md:h-52', legend && 'bg-legend')}
      style={legend ? undefined : { background: RANK_BY_KEY[rank].color }}
    >
      <svg className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <pattern id="cover-diamonds" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <path d="M12 4 L18 12 L12 20 L6 12 Z" fill="var(--color-white)" opacity="0.45" />
            <path d="M34 26 L38 32 L34 38 L30 32 Z" fill="var(--color-ink)" opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cover-diamonds)" />
      </svg>
      {/* Dải chéo tạo chiều sâu */}
      <span className="absolute -right-10 top-0 h-full w-1/3 -skew-x-12 bg-white/20" aria-hidden="true" />
      {children}
    </div>
  )
}

function StatChip({ icon, color, className, children }) {
  return (
    <span className={cx('inline-flex h-10 items-center gap-2 rounded-pill border-thick border-line bg-surface pl-1 pr-3.5 shadow-hard-sm', className)}>
      <span className="grid size-7 place-items-center rounded-pill border-2 border-line" style={{ background: `var(--color-${color})` }}>
        <Icon icon={icon} size={16} color="ink" />
      </span>
      <span className="whitespace-nowrap font-display text-sm font-bold uppercase tracking-wide">{children}</span>
    </span>
  )
}

function joinedLabel(iso) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function ProfileHeader({ profile, mascot, onEdit, onShare, onCertificate, onSettings, onChallenge, onFriend, friendState }) {
  const rank = RANK_BY_KEY[profile.rank]
  const shaky = Boolean(profile.shaky)

  return (
    <section className="relative rounded-panel border-thick border-line bg-surface shadow-hard-lg">
      <Cover rank={profile.rank}>
        {profile.isMe && (
          <IconButton icon={GearSix} label="Cài đặt" size="sm" onClick={onSettings} className="absolute right-3 top-3 md:right-5 md:top-5" />
        )}
        {!profile.isMe && profile.headToHead && (
          <span className="absolute right-3 top-3 inline-flex h-10 items-center gap-2 rounded-pill max-md:hidden border-thick border-line bg-surface px-3.5 font-display text-sm font-bold uppercase tracking-wide shadow-hard-sm md:right-5 md:top-5">
            Đối đầu
            <span className="font-num text-primary">{profile.headToHead.me}</span>–<span className="font-num text-orange">{profile.headToHead.them}</span>
          </span>
        )}
      </Cover>

      <div className="flex flex-col gap-5 px-4 pb-5 md:px-8 md:pb-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:gap-7">
          {/* Linh vật đại diện lấn ra khỏi ảnh bìa */}
          <div className="relative z-10 -mt-24 w-[128px] shrink-0 -rotate-3 md:-mt-32 md:w-[168px]">
            <MascotCard rarity={mascot.rarity} name={mascot.name} number={mascot.number} art={<MascotArt mascot={mascot} />} holo={mascot.rarity === 'legendary'} interactive />
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center md:items-start md:pb-1 md:text-left">
            <h1 className="font-heading text-[34px] font-black leading-none md:text-[48px]">{profile.name}</h1>
            <p className="font-display text-base font-bold text-muted">@{profile.handle}</p>
            <p className="text-caption font-medium text-muted">Tham gia {joinedLabel(profile.joined)}</p>
            <div className="mt-3 flex w-full flex-wrap justify-center gap-2 md:justify-start">
              <StatChip icon={Fire} color="orange">
                Streak <span className="font-num">{profile.streak}</span> ngày
              </StatChip>
              <StatChip icon={Trophy} color="gold">
                Cao nhất <span className="font-num">{profile.bestStreak}</span>
              </StatChip>
              <span className="inline-flex h-10 items-center gap-2 rounded-pill border-thick border-line bg-surface pl-1.5 pr-3.5 shadow-hard-sm">
                <LevelTag level={profile.level} size="sm" />
                <span className="font-display text-sm font-bold uppercase tracking-wide">Cấp hiện tại</span>
              </span>
              {!profile.isMe && profile.headToHead && (
                <StatChip icon={Sword} color="primary" className="md:hidden">
                  Đối đầu <span className="font-num">{profile.headToHead.me}–{profile.headToHead.them}</span>
                </StatChip>
              )}
            </div>
          </div>

          {/* Rank lớn + số từ đã thuộc */}
          <div className="flex items-center gap-3 md:pb-2">
            <RankEmblem rank={profile.rank} state={shaky ? 'shaky' : 'current'} className="size-16 md:size-20" />
            <div className="flex flex-col">
              <span className={cx('font-display text-xl font-bold uppercase leading-tight tracking-wider md:text-2xl', shaky && 'text-danger-deep')}>
                {rank.name}
                {shaky && <span className="ml-2 align-middle text-sm">· Lung lay</span>}
              </span>
              <span className="font-num text-[28px] leading-none md:text-[36px]">{formatNumber(profile.masteredWords)}</span>
              <span className="font-display text-[13px] font-bold uppercase tracking-wide text-muted">Từ đã thuộc</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 border-t-2 border-dashed border-line/20 pt-4 md:flex-row md:justify-end md:pt-5">
          {profile.isMe ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
              <Button size="sm" variant="secondary" icon={PencilSimple} onClick={onEdit} className="whitespace-nowrap">
                <span className="sm:hidden">Chỉnh sửa</span>
                <span className="max-sm:hidden">Chỉnh sửa hồ sơ</span>
              </Button>
              <Button size="sm" variant="sky" icon={ShareNetwork} onClick={onShare} className="whitespace-nowrap">
                <span className="sm:hidden">Chia sẻ</span>
                <span className="max-sm:hidden">Chia sẻ hồ sơ</span>
              </Button>
              <Button size="sm" variant="gold" icon={Certificate} onClick={onCertificate} className="col-span-2 whitespace-nowrap">
                Tải thẻ chứng nhận
              </Button>
            </div>
          ) : (
            <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
              <Button size="lg" variant="orange" icon={Sword} onClick={onChallenge} className="min-w-0 flex-1 whitespace-nowrap px-3 text-lg sm:flex-none sm:px-10 sm:text-xl">
                Thách đấu
              </Button>
              {friendState === 'friends' ? (
                <Button size="lg" variant="accent" icon={CheckFat} disabled className="px-5 disabled:opacity-100">
                  Bạn bè
                </Button>
              ) : friendState === 'pending' ? (
                <Button size="lg" variant="secondary" icon={CheckFat} disabled className="whitespace-nowrap px-3 text-base disabled:opacity-80 sm:px-5">
                  Đã gửi lời mời
                </Button>
              ) : (
                <Button size="lg" variant="secondary" icon={UserPlus} onClick={onFriend} className="whitespace-nowrap px-3 text-base sm:px-5">
                  Kết bạn
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
