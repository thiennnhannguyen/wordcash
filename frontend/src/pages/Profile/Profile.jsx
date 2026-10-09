/*
 * Hồ sơ: rank, số từ thuộc, thống kê học.
 *
 * Hai chế độ:
 * - "Hồ sơ của tôi" (`/profile`, GET /me/profile): chỉnh sửa (tên hiển thị, hiện trên bảng xếp hạng), chia sẻ, tải thẻ chứng
 *   nhận, rank lung lay (đếm ngược từ số giây server trả), tiến độ từng cấp, lịch hoạt động 12 tuần, tỉ lệ đúng Cửa Ải 30 ngày,
 *   5 từ hay quên nhất, số khóa học, từ tự tạo đã thuộc. Tủ trưng bày đổi được (PATCH /users/me, server kiểm tra sở hữu).
 * - "Hồ sơ người khác" (`/profile/:handle`, GET /users/{username}/profile): CHỈ phần công khai (tên, username, avatar, rank,
 *   số từ đã thuộc, streak, cấp hiện tại, số linh vật, tủ trưng bày). Thách đấu và Kết bạn: "Sắp ra mắt".
 * Thống kê Đấu Trường và tủ huy hiệu: "Sắp ra mắt" (chưa có backend). Mobile: thống kê chia tab trượt, lịch nhiệt 8 tuần.
 * Mọi khối có trạng thái tải / lỗi / trống; không có số liệu nào không lấy từ server.
 *
 * Dev: `?tab=learn|arena|badges` (tab mobile), `?cert=1` (mở thẻ chứng nhận), `?edit=1` (mở chỉnh sửa). Biến thể: đăng nhập
 * bằng tài khoản dev_normal / dev_shaky / dev_new (backend/seeds/seed_dev_accounts.py).
 */

import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FloppyDisk, MagnifyingGlass, Medal, Sword } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Switch from '../../components/ui/Switch'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/DataState'
import useMediaQuery from '../../hooks/useMediaQuery'
import useServerData from '../../hooks/useServerData'
import { getMyProfile, getPublicProfile, updateMe } from '../../services/profileApi'
import { useAuthStore } from '../../store/authStore'
import { useMascot } from '../../store/mascotStore'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { messageFor } from '../../utils/errorMessages'
import CertificateModal from './Certificate'
import { CoursesStat, HardestWords, Heatmap, LevelProgress, Retention, SoonCard } from './LearningStats'
import ProfileHeader from './ProfileHeader'
import RankLadder from './RankLadder'
import Showcase from './Showcase'

const TABS = [
  { key: 'learn', label: 'Học tập' },
  { key: 'arena', label: 'Đấu trường' },
  { key: 'badges', label: 'Huy hiệu' },
]

/** JSON hồ sơ của server → dạng các khối dùng. Hàm thuần (test ở tests/profile.test.jsx). */
export function toProfile(p, isMe) {
  const base = {
    isMe,
    name: p.display_name,
    handle: p.username,
    avatarId: p.avatar_mascot_id,
    rank: p.rank,
    masteredWords: p.mastered_count,
    streak: p.streak_current,
    bestStreak: p.streak_best,
    level: p.current_level,
    mascotsOwned: p.mascots_owned,
    showcase: p.showcase,
  }
  if (!isMe) return base
  return {
    ...base,
    joined: p.created_at,
    rankProgress: p.rank_progress,
    shaky: p.rank_shaky ? { wordsNeeded: p.words_to_recover, secondsLeft: p.shaky_seconds_left, threshold: p.rank_progress.current_min } : null,
    levels: p.levels,
    activity: p.activity.map((d) => ({ date: d.date, words: d.new_words + d.reviews })),
    accuracy: p.daily_check_accuracy,
    hardest: p.most_forgotten.map((w) => ({ id: w.entry_id, word: w.headword, meaning: w.meaning_vi, forgot: w.lapse_count })),
    courses: p.courses_count,
    customMastered: p.custom_mastered_count,
    showOnLeaderboard: p.show_on_leaderboard,
    rankFirstReachedAt: p.rank_first_reached_at,
  }
}

function EditModal({ open, onClose, profile, onSaved }) {
  const [name, setName] = useState(profile.name)
  const [visible, setVisible] = useState(profile.showOnLeaderboard)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const user = await updateMe({ display_name: name.trim(), show_on_leaderboard: visible })
      onSaved(user)
    } catch (e) {
      setError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chỉnh sửa hồ sơ"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button icon={FloppyDisk} onClick={save} disabled={busy || !name.trim()}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Tên hiển thị" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        <p className="text-caption text-muted">
          Tên người dùng <b>@{profile.handle}</b> chưa đổi được. Linh vật đại diện đổi trong Bộ Sưu Tập (nút “Đặt làm avatar”).
        </p>
        <div className="flex flex-col gap-1">
          <Switch checked={visible} onChange={setVisible}>
            <span className="font-semibold">Hiện trên bảng xếp hạng</span>
          </Switch>
          <p className="text-caption text-muted">Tắt thì người khác không thấy bạn trên bảng xếp hạng; bạn vẫn xem được hạng của mình.</p>
        </div>
        {error && (
          <p role="alert" className="text-caption font-semibold text-danger-deep">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function MobileTabs({ tab, setTab, panes }) {
  const index = TABS.findIndex((t) => t.key === tab)
  const [dir, setDir] = useState(1)
  const go = (next) => {
    const i = TABS.findIndex((t) => t.key === next)
    setDir(i > index ? 1 : -1)
    setTab(next)
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 bg-bg px-4 py-2">
        <div className="relative grid grid-cols-3 rounded-pill border-thick border-line bg-surface p-1 shadow-hard-sm" role="tablist" aria-label="Thống kê">
          <motion.span
            className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-pill border-2 border-line bg-primary"
            animate={{ x: `${index * 100}%` }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            aria-hidden="true"
          />
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => go(t.key)}
              className={cx('relative h-11 rounded-pill font-display text-sm font-bold uppercase tracking-wide transition-colors', tab === t.key ? 'text-white' : 'text-ink')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={tab}
            role="tabpanel"
            custom={dir}
            variants={{ enter: (d) => ({ x: d * 60, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d) => ({ x: d * -60, opacity: 0 }) }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 && index < TABS.length - 1) go(TABS[index + 1].key)
              if (info.offset.x > 60 && index > 0) go(TABS[index - 1].key)
            }}
            className="flex flex-col gap-4"
          >
            {panes[tab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5 md:gap-8" role="status" aria-label="Đang tải hồ sơ">
      <Skeleton className="h-[360px] w-full md:h-[400px]" rounded="rounded-panel" />
      <Skeleton className="h-48 w-full" rounded="rounded-panel" />
      <Skeleton className="h-64 w-full" rounded="rounded-panel" />
    </div>
  )
}

function ProfileBody({ profile, setProfile, params }) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const pushToast = useToastStore((s) => s.push)
  const mascot = useMascot(profile.avatarId)
  const [tab, setTab] = useState(params.get('tab') ?? 'learn')
  const [editOpen, setEditOpen] = useState(params.get('edit') === '1')
  const [certOpen, setCertOpen] = useState(params.get('cert') === '1')

  const share = async () => {
    const url = `${window.location.origin}/profile/${profile.handle}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.name} trên WORDCLASH`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      pushToast({ variant: 'success', title: 'Đã chép liên kết hồ sơ', message: url })
    } catch {
      // Người dùng đóng hộp chia sẻ
    }
  }

  const learning = profile.isMe
    ? [
        <LevelProgress key="levels" levels={profile.levels} />,
        <Retention key="retention" accuracy={profile.accuracy} />,
        <Heatmap key="heat" activity={profile.activity} weeks={desktop ? 12 : 8} />,
        <HardestWords key="hard" words={profile.hardest} />,
        <CoursesStat key="courses" courses={profile.courses} customMastered={profile.customMastered} />,
      ]
    : null

  const panes = {
    learn: learning,
    arena: <SoonCard title="Thống kê Đấu Trường" icon={Sword} iconBg="orange" text="Số trận, tỉ lệ thắng, chuỗi thắng sẽ có khi Đấu Trường mở." />,
    badges: <SoonCard title="Tủ huy hiệu" icon={Medal} iconBg="gold" text="Huy hiệu thành tích đang được chuẩn bị." />,
  }

  const cert = profile.isMe && {
    fullName: profile.name,
    handle: profile.handle,
    rank: profile.rank,
    words: profile.masteredWords,
    achievedAt: profile.rankFirstReachedAt,
    streak: profile.streak,
    level: profile.level,
    mascots: profile.mascotsOwned,
    mascot,
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:gap-8 md:pb-0">
      <ProfileHeader profile={profile} mascot={mascot} onEdit={() => setEditOpen(true)} onShare={share} onCertificate={() => setCertOpen(true)} />

      <RankLadder rank={profile.rank} masteredWords={profile.masteredWords} shaky={profile.isMe ? profile.shaky : null} />

      <Showcase
        profile={profile}
        onSaved={(user) => setProfile((p) => ({ ...p, showcaseIds: user.showcase_mascot_ids }))}
        onChange={(showcase) => setProfile((p) => ({ ...p, showcase }))}
      />

      {desktop ? (
        <>
          {learning && (
            <>
              <h2 className="hud-label -mb-3 mt-2">Học tập</h2>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">{learning}</div>
            </>
          )}
          <h2 className="hud-label -mb-3 mt-2">Đấu trường</h2>
          {panes.arena}
          <h2 className="hud-label -mb-3 mt-2">Thành tích</h2>
          {panes.badges}
        </>
      ) : (
        <MobileTabs tab={tab} setTab={setTab} panes={learning ? panes : { ...panes, learn: <SoonCard title="Thống kê học tập" icon={Medal} iconBg="sky" text="Chỉ chủ hồ sơ xem được thống kê học tập chi tiết." /> }} />
      )}

      {profile.isMe && (
        <>
          <EditModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            profile={profile}
            onSaved={(user) => {
              useAuthStore.getState().refreshUser()
              setProfile((p) => ({ ...p, name: user.display_name, showOnLeaderboard: user.show_on_leaderboard }))
              setEditOpen(false)
              pushToast({ variant: 'success', title: 'Đã lưu hồ sơ' })
            }}
          />
          <CertificateModal open={certOpen} onClose={() => setCertOpen(false)} cert={cert} initialFormat={params.get('format') === 'story' ? 'story' : 'post'} />
        </>
      )}
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { handle } = useParams()
  const [params] = useSearchParams()
  const me = useAuthStore((s) => s.user)
  const isMe = !handle
  const state = useServerData(() => (isMe ? getMyProfile() : getPublicProfile(handle)), [handle])
  const [override, setOverride] = useState(null)

  // /profile/<username của chính mình> → hồ sơ của tôi
  if (handle && me && handle.toLowerCase() === me.username) return <Navigate to="/profile" replace />
  if (state.status === 'loading') return <ProfileSkeleton />
  if (state.status === 'error') {
    if (state.error?.code === 'USER_NOT_FOUND') {
      return (
        <EmptyState
          title="Không tìm thấy người chơi"
          message={`Không có hồ sơ nào với tên @${handle}.`}
          action={
            <Button icon={MagnifyingGlass} variant="secondary" onClick={() => navigate('/leaderboard')}>
              Xem bảng xếp hạng
            </Button>
          }
        />
      )
    }
    return <ErrorState title="Chưa tải được hồ sơ" onRetry={state.reload} />
  }

  const base = toProfile(state.data, isMe)
  const profile = override?.for === state.data ? override.profile : base
  const setProfile = (update) => setOverride({ for: state.data, profile: typeof update === 'function' ? update(profile) : update })
  return <ProfileBody key={handle ?? '@me'} profile={profile} setProfile={setProfile} params={params} />
}
