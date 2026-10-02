/*
 * Hồ sơ: rank, số từ thuộc, thống kê học và đấu.
 *
 * Hai chế độ: "Hồ sơ của tôi" (`/profile`: chỉnh sửa, chia sẻ, tải thẻ chứng nhận, cài đặt, thống kê riêng như độ ghi nhớ
 * và từ khó nhất, trạng thái rank lung lay) và "Hồ sơ người khác" (`/profile/:handle`: THÁCH ĐẤU, Kết bạn, thành tích đối đầu).
 * Bố cục: phần đầu (ảnh bìa theo rank, linh vật đại diện, tên, rank), thang rank, kệ trưng bày linh vật,
 * thống kê học tập, Đấu Trường và tủ huy hiệu. Mobile: thống kê chia 3 tab trượt, lịch nhiệt còn 8 tuần.
 * Dữ liệu do server trả (hiện lấy từ profileMock.js).
 *
 * Dev: `/profile?variant=shaky` (rank lung lay), `/profile/minhthu` (hồ sơ người khác), `?tab=learn|arena|badges` (tab mobile),
 * `?cert=1` (mở thẻ chứng nhận), `?edit=1` (mở chỉnh sửa).
 */

import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FloppyDisk } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import useMediaQuery from '../../hooks/useMediaQuery'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { MASCOT_BY_ID } from '../Collection/collectionMock'
import Achievements from './Achievements'
import ArenaStats from './ArenaStats'
import CertificateModal from './Certificate'
import { HardestWords, Heatmap, LevelProgress, Retention } from './LearningStats'
import ProfileHeader from './ProfileHeader'
import RankLadder from './RankLadder'
import Showcase from './Showcase'
import { fetchCertificate, fetchProfile, sendFriendRequest, updateProfile, updateShowcase } from './profileMock'

const TABS = [
  { key: 'learn', label: 'Học tập' },
  { key: 'arena', label: 'Đấu trường' },
  { key: 'badges', label: 'Huy hiệu' },
]

function EditModal({ open, onClose, profile, onSaved }) {
  const [name, setName] = useState(profile.name)
  const [handle, setHandle] = useState(profile.handle)
  const [busy, setBusy] = useState(false)
  const handleOk = /^[a-z0-9._]{3,24}$/.test(handle)

  const save = async () => {
    setBusy(true)
    const next = await updateProfile({ name: name.trim(), handle })
    setBusy(false)
    onSaved(next)
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
          <Button icon={FloppyDisk} onClick={save} disabled={busy || !name.trim() || !handleOk}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Tên hiển thị" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Tên người dùng"
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
          hint={handleOk ? 'Bạn bè tìm bạn bằng tên này.' : 'Từ 3–24 ký tự: chữ thường, số, dấu chấm hoặc gạch dưới.'}
          status={handleOk ? undefined : 'error'}
        />
        <p className="text-caption text-muted">Linh vật đại diện đổi trong Bộ Sưu Tập (nút “Đặt làm avatar”).</p>
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

export default function Profile() {
  const navigate = useNavigate()
  const { handle } = useParams()
  const [params] = useSearchParams()
  const desktop = useMediaQuery('(min-width: 768px)')
  const pushToast = useToastStore((s) => s.push)

  const [profile, setProfile] = useState(() => fetchProfile(handle, params.get('variant') ?? 'default'))
  const [showcase, setShowcase] = useState(profile.showcase)
  const [friendState, setFriendState] = useState(profile.friendship ?? 'none')
  const [tab, setTab] = useState(params.get('tab') ?? 'learn')
  const [editOpen, setEditOpen] = useState(params.get('edit') === '1')
  const [certOpen, setCertOpen] = useState(params.get('cert') === '1')
  const [cert] = useState(fetchCertificate)

  // Đổi URL giữa hồ sơ mình và người khác thì nạp lại
  const [loadedFor, setLoadedFor] = useState(handle)
  if (loadedFor !== handle) {
    const next = fetchProfile(handle, params.get('variant') ?? 'default')
    setLoadedFor(handle)
    setProfile(next)
    setShowcase(next.showcase)
    setFriendState(next.friendship ?? 'none')
  }

  const mascot = MASCOT_BY_ID[profile.avatar.id]

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
    ? {
        a: <LevelProgress levels={profile.levels} />,
        b: <Retention retention={profile.retention} />,
        c: <Heatmap activity={profile.activity} weeks={desktop ? 12 : 8} />,
        d: <HardestWords words={profile.hardest} />,
      }
    : { a: <LevelProgress levels={profile.levels} />, c: <Heatmap activity={profile.activity} weeks={desktop ? 12 : 8} /> }

  const panes = {
    learn: (
      <>
        {learning.a}
        {learning.c}
        {learning.b}
        {learning.d}
      </>
    ),
    arena: <ArenaStats arena={profile.arena} />,
    badges: <Achievements achievements={profile.achievements} />,
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:gap-8 md:pb-0">
      <ProfileHeader
        profile={profile}
        mascot={mascot}
        friendState={friendState}
        onEdit={() => setEditOpen(true)}
        onShare={share}
        onCertificate={() => setCertOpen(true)}
        onSettings={() => pushToast({ variant: 'info', title: 'Cài đặt sắp ra mắt', message: 'Âm thanh, thông báo và quyền riêng tư sẽ có ở đây.' })}
        onChallenge={() => {
          pushToast({ variant: 'info', title: `Đã gửi lời thách đấu tới ${profile.name}`, message: 'Chờ bạn ấy vào phòng nhé.' })
          navigate('/arena/room/WX7K2?state=waiting')
        }}
        onFriend={async () => {
          setFriendState(await sendFriendRequest(profile.handle))
          pushToast({ variant: 'success', title: 'Đã gửi lời mời kết bạn', message: `Chờ ${profile.name} đồng ý nhé.` })
        }}
      />

      <RankLadder rank={profile.rank} masteredWords={profile.masteredWords} shaky={profile.shaky} />

      <Showcase
        ids={showcase}
        mascots={MASCOT_BY_ID}
        collection={profile.collection}
        isMe={profile.isMe}
        onChange={async (ids) => {
          setShowcase(ids)
          await updateShowcase(ids)
        }}
      />

      {desktop ? (
        <>
          <h2 className="hud-label -mb-3 mt-2">Học tập</h2>
          {profile.isMe ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              {learning.a}
              {learning.b}
              {learning.c}
              {learning.d}
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {learning.a}
              {learning.c}
            </div>
          )}
          <h2 className="hud-label -mb-3 mt-2">Đấu trường</h2>
          {panes.arena}
          <h2 className="hud-label -mb-3 mt-2">Thành tích</h2>
          {panes.badges}
        </>
      ) : (
        <MobileTabs tab={tab} setTab={setTab} panes={panes} />
      )}

      {profile.isMe && (
        <>
          <EditModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            profile={profile}
            onSaved={(next) => {
              setProfile({ ...next })
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
