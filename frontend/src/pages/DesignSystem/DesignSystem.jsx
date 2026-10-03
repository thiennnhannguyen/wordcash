/*
 * Trang Design System của WORDCLASH (bản sáng): trình bày toàn bộ nền tảng giao diện trên một trang dài
 * (màu, chữ, nút, ô nhập, thẻ, tiến độ, đáp án, rank, độ hiếm, cấp độ, thông báo, icon, điều hướng).
 * Dùng để duyệt giao diện trước khi làm các màn hình.
 */

import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Clock,
  EnvelopeSimple,
  Fire,
  Flag,
  Gear,
  Gift,
  GraduationCap,
  Heart,
  House,
  Lightning,
  Lock,
  LockKey,
  Play,
  Shield,
  SpeakerHigh,
  Star,
  Sword,
  Trash,
  Trophy,
  User,
} from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { IconBadge } from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import LevelTag from '../../components/ui/LevelTag'
import Modal from '../../components/ui/Modal'
import ProgressBar from '../../components/ui/ProgressBar'
import RankBadge from '../../components/ui/RankBadge'
import Sticker from '../../components/ui/Sticker'
import { Toast } from '../../components/ui/Toast'
import HealthBar from '../../components/game/HealthBar'
import { AnswerOption } from '../../components/game/AnswerOptions'
import MascotBlob from '../../components/collection/MascotBlob'
import MascotCard from '../../components/collection/MascotCard'
import { BottomTabs, SidebarNav } from '../../components/layout/NavBar'
import { useToastStore } from '../../store/toastStore'
import { RANKS } from '../../utils/constants'
import { formatNumber } from '../../utils/format'
import { MASCOT_BY_ID } from '../../data/mascots'

const SECTIONS = [
  { id: 'colors', title: 'Bảng màu' },
  { id: 'type', title: 'Typography' },
  { id: 'buttons', title: 'Nút bấm' },
  { id: 'inputs', title: 'Ô nhập liệu' },
  { id: 'cards', title: 'Thẻ' },
  { id: 'progress', title: 'Thanh tiến độ' },
  { id: 'answers', title: 'Nút đáp án' },
  { id: 'ranks', title: 'Huy hiệu rank' },
  { id: 'rarity', title: 'Độ hiếm' },
  { id: 'levels', title: 'Cấp độ' },
  { id: 'feedback', title: 'Toast và modal' },
  { id: 'icons', title: 'Icon' },
  { id: 'nav', title: 'Điều hướng' },
]

const SWATCHES = [
  { token: 'bg', name: 'Nền · kem', hex: '#FFF8EC' },
  { token: 'surface', name: 'Bề mặt', hex: '#FFFFFF' },
  { token: 'raised', name: 'Bề mặt phụ', hex: '#F3EEFF' },
  { token: 'line', name: 'Viền và chữ chính', hex: '#1B1535' },
  { token: 'muted', name: 'Chữ phụ', hex: '#5B5480' },
  { token: 'primary', name: 'Tím điện · thương hiệu', hex: '#6C4DFF' },
  { token: 'accent', name: 'Xanh chanh · đúng, tiến độ', hex: '#B8F53A' },
  { token: 'danger', name: 'Hồng · sai, sát thương', hex: '#FF4D8D' },
  { token: 'gold', name: 'Vàng · streak, thưởng', hex: '#FFD43B' },
  { token: 'sky', name: 'Xanh trời · Học Viện', hex: '#3DC7FF' },
  { token: 'orange', name: 'Cam · Đấu Trường', hex: '#FF8A3D' },
]

const TYPE_SCALE = [
  { name: 'H1', spec: 'Be Vietnam Pro Black 900 · 56px (mobile 40px)', className: 'font-heading font-black tracking-tight text-[40px] leading-[1.05] md:text-h1', sample: 'Học từ như đánh trận' },
  { name: 'H2', spec: 'Be Vietnam Pro ExtraBold 800 · 36px (mobile 30px)', className: 'font-heading font-extrabold tracking-tight text-[30px] leading-tight md:text-h2', sample: 'Học từ như đánh trận' },
  { name: 'H3', spec: 'Be Vietnam Pro ExtraBold 800 · 24px', className: 'font-heading font-extrabold tracking-tight text-h3', sample: 'Học từ như đánh trận' },
  { name: 'Nhãn game', spec: 'Chakra Petch Bold, in hoa · 14px', className: 'font-display font-bold uppercase tracking-wider text-sm', sample: 'Học từ như đánh trận' },
  { name: 'Nội dung', spec: 'Be Vietnam Pro Regular 400 · 16px', className: 'text-body', sample: 'Học từ như đánh trận. Mỗi ngày vượt Cửa Ải để giữ chuỗi ngày học và leo rank.' },
  { name: 'Chú thích', spec: 'Be Vietnam Pro Medium 500 · 14px', className: 'text-caption font-medium text-muted', sample: 'Học từ như đánh trận · cập nhật 2 phút trước' },
  { name: 'Số liệu lớn', spec: 'Chakra Petch Bold · 72px (mobile 56px)', className: 'font-num uppercase text-[56px] leading-none md:text-stat', sample: '1.250 từ' },
]

const BUTTON_VARIANTS = [
  { variant: 'primary', name: 'Chính', label: 'Học tiếp' },
  { variant: 'secondary', name: 'Phụ', label: 'Để sau' },
  { variant: 'danger', name: 'Nguy hiểm', label: 'Đầu hàng' },
  { variant: 'ghost', name: 'Ghost', label: 'Bỏ qua' },
]

const BUTTON_STATES = [
  { name: 'Thường' },
  { name: 'Hover', state: 'hover' },
  { name: 'Đang nhấn', state: 'active' },
  { name: 'Vô hiệu', disabled: true },
]

const ANSWER_STATES = [
  { state: 'idle', name: 'Bình thường', label: 'đáng tin cậy' },
  { state: 'selected', name: 'Đã chọn', label: 'đáng tin cậy' },
  { state: 'correct', name: 'Đúng', label: 'đáng tin cậy' },
  { state: 'wrong', name: 'Sai (rung)', label: 'nguy hiểm' },
]

// Mẫu khung thẻ lấy từ data/mascots.js: 4 độ hiếm, 1 thẻ chưa có, 1 ô "Sắp ra mắt"
const MASCOTS = [
  { ...MASCOT_BY_ID[4] },
  { ...MASCOT_BY_ID[7] },
  { ...MASCOT_BY_ID[9] },
  { ...MASCOT_BY_ID[10] },
  { ...MASCOT_BY_ID[18], owned: false },
  { ...MASCOT_BY_ID[40], owned: false },
]

const LEVELS = [
  { level: 'A1', name: 'Mới bắt đầu' },
  { level: 'A2', name: 'Sơ cấp' },
  { level: 'B1', name: 'Trung cấp' },
  { level: 'B2', name: 'Trung cao cấp' },
  { level: 'C1', name: 'Cao cấp' },
  { level: 'C2', name: 'Thành thạo' },
]

const ICONS = [
  { icon: House, name: 'Nhà', bg: 'primary' },
  { icon: BookOpen, name: 'Sách', bg: 'sky' },
  { icon: Sword, name: 'Kiếm', bg: 'orange' },
  { icon: Shield, name: 'Khiên', bg: 'raised' },
  { icon: Fire, name: 'Lửa (streak)', bg: 'gold' },
  { icon: Trophy, name: 'Cúp', bg: 'gold' },
  { icon: Star, name: 'Ngôi sao', bg: 'accent' },
  { icon: Lock, name: 'Ổ khóa', bg: 'surface' },
  { icon: SpeakerHigh, name: 'Loa', bg: 'sky' },
  { icon: Clock, name: 'Đồng hồ', bg: 'raised' },
  { icon: Gift, name: 'Quà', bg: 'danger' },
  { icon: User, name: 'Người dùng', bg: 'surface' },
  { icon: Gear, name: 'Cài đặt', bg: 'raised' },
  { icon: Lightning, name: 'Tia sét', bg: 'accent' },
]

const DEMO_TOASTS = {
  success: { variant: 'success', title: 'Chính xác!', message: '+1 từ đã thuộc: environment' },
  error: { variant: 'error', title: 'Sai rồi', message: 'Từ "reliable" đã vào danh sách ôn gấp.' },
  info: { variant: 'info', title: 'Đến giờ ôn tập', message: 'Bạn có 12 từ đến hạn ôn hôm nay.' },
  reward: { variant: 'reward', title: 'Nhận lượt quay', message: 'Chuỗi 7 ngày! +1 lượt quay thẻ.' },
}

function Section({ id, index, title, description, children }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-6">
      <div className="flex items-start gap-4">
        <span className="font-num grid size-11 shrink-0 place-items-center rounded-[14px] border-thick border-line bg-surface text-base shadow-hard-sm">
          {String(index).padStart(2, '0')}
        </span>
        <div>
          <h2 className="text-[30px] md:text-h2">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Caption({ children }) {
  return <div className="hud-label">{children}</div>
}

export default function DesignSystem() {
  const pushToast = useToastStore((state) => state.push)
  const [modalOpen, setModalOpen] = useState(false)
  const [hp, setHp] = useState(72)
  const [shakeKey, setShakeKey] = useState(0)

  return (
    <div className="flex flex-col gap-20">
      {/* Mở đầu */}
      <header className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5">
            <Sticker bg="sky" tilt={-3} size="sm" className="self-start">
              Design System · bản sáng
            </Sticker>
            <h1 className="text-[40px] md:text-h1">
              Học từ như{' '}
              <span className="inline-block rotate-[-2deg] rounded-[16px] border-thick border-line bg-accent px-3 shadow-hard">
                đánh trận.
              </span>
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Neo-brutalism sáng: nền kem, khối màu kẹo, viền mực 2.5px, bo góc 20–28px, bóng cứng lệch 4px và nút lún
              xuống khi nhấn. Mọi màu lấy từ <code className="font-num text-ink">styles/tokens.css</code>.
            </p>
          </div>
          <div className="relative mx-auto flex shrink-0 items-end gap-2 pt-6 lg:mx-0">
            <Sticker bg="gold" tilt={-6} className="absolute -top-2 left-0 z-10">
              Combo x3
            </Sticker>
            <MascotBlob color="primary" shape="round" size={120} />
            <MascotBlob color="orange" shape="drop" size={96} />
            <Sticker bg="danger" tilt={5} className="absolute -right-4 top-10 z-10">
              +15 DMG
            </Sticker>
          </div>
        </div>
        <nav aria-label="Mục lục" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-pill border-thick border-line bg-surface px-4 font-display text-sm font-bold uppercase tracking-wide text-ink transition-colors hover:bg-gold"
            >
              {i + 1}. {s.title}
            </a>
          ))}
        </nav>
      </header>

      {/* 1. Bảng màu */}
      <Section id="colors" index={1} title="Bảng màu">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SWATCHES.map((s) => (
            <div key={s.token} className="overflow-hidden rounded-card border-thick border-line bg-surface shadow-hard">
              <div className="h-24 border-b-thick border-line" style={{ background: `var(--color-${s.token})` }} />
              <div className="p-3.5">
                <div className="font-semibold leading-snug">{s.name}</div>
                <div className="font-num text-sm text-muted">{s.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Typography */}
      <Section id="type" index={2} title="Typography" description="Be Vietnam Pro 800–900 cho tiêu đề lớn. Chakra Petch in hoa cho con số, nhãn game và nút. Be Vietnam Pro 400–500 cho nội dung.">
        <Card padding="none" className="overflow-hidden">
          {TYPE_SCALE.map((t, i) => (
            <div
              key={t.name}
              className={`grid gap-3 p-5 md:grid-cols-[220px_1fr] md:items-center md:gap-8 md:p-6 ${i > 0 ? 'border-t-2 border-line/10' : ''}`}
            >
              <div>
                <div className="font-display font-bold uppercase text-primary">{t.name}</div>
                <div className="text-caption text-muted">{t.spec}</div>
              </div>
              <div className={t.className}>{t.sample}</div>
            </div>
          ))}
        </Card>
      </Section>

      {/* 3. Nút bấm */}
      <Section id="buttons" index={3} title="Nút bấm" description="Rê chuột và nhấn giữ để thử trạng thái thật. Khi nhấn, nút dịch 4px xuống dưới-phải và mất bóng.">
        <Card padding="lg" className="flex flex-col gap-8">
          {BUTTON_VARIANTS.map((v) => (
            <div key={v.variant} className="flex flex-col gap-3">
              <Caption>{v.name}</Caption>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-4">
                {BUTTON_STATES.map((s) => (
                  <div key={s.name} className="flex flex-col items-start gap-2">
                    <Button variant={v.variant} state={s.state} disabled={s.disabled}>
                      {v.label}
                    </Button>
                    <span className="text-caption text-muted">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 border-t-2 border-line/10 pt-8">
            <Caption>Nút kèm icon · màu theo khu</Caption>
            <div className="flex flex-wrap gap-4">
              <Button icon={Play}>Vào học</Button>
              <Button variant="sky" icon={GraduationCap}>Học Viện</Button>
              <Button variant="orange" icon={Sword}>Tìm trận</Button>
              <Button variant="secondary" iconRight={ArrowRight}>Xem lộ trình</Button>
              <Button variant="danger" icon={Trash}>Xóa phòng</Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Caption>Nút tròn chỉ có icon</Caption>
            <div className="flex flex-wrap items-center gap-4">
              <IconButton icon={Play} label="Bắt đầu" variant="primary" size="lg" />
              <IconButton icon={SpeakerHigh} label="Nghe phát âm" variant="sky" size="lg" />
              <IconButton icon={Heart} label="Yêu thích" variant="danger" />
              <IconButton icon={Flag} label="Đầu hàng" variant="secondary" />
              <IconButton icon={Gear} label="Cài đặt" variant="ghost" />
              <IconButton icon={Lock} label="Đã khóa" variant="secondary" size="sm" disabled />
            </div>
          </div>
        </Card>
      </Section>

      {/* 4. Ô nhập liệu */}
      <Section id="inputs" index={4} title="Ô nhập liệu">
        <Card padding="lg" className="grid gap-6 md:grid-cols-2">
          <Input label="Bình thường" placeholder="Nhập email của bạn" icon={EnvelopeSimple} />
          <Input label="Đang focus" placeholder="Nhập email của bạn" icon={EnvelopeSimple} state="focus" />
          <Input
            label="Báo lỗi"
            type="password"
            defaultValue="1234"
            icon={LockKey}
            status="error"
            hint="Mật khẩu phải có ít nhất 8 ký tự."
          />
          <Input label="Đúng" defaultValue="environment" status="success" hint="Chính xác! +1 lần đúng ở mức 3." />
        </Card>
      </Section>

      {/* 5. Thẻ */}
      <Section id="cards" index={5} title="Thẻ">
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          <div className="flex flex-col gap-3">
            <Caption>Thẻ thường</Caption>
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <LevelTag level="A1" size="sm" />
                <span className="text-caption text-muted">18 mục từ</span>
              </div>
              <h3 className="text-h3">Bài 2 · Gia đình</h3>
              <ProgressBar value={18} max={18} size="sm" label="Hoàn thành" showValue />
            </Card>
          </div>
          <div className="flex flex-col gap-3">
            <Caption>Thẻ nổi bật</Caption>
            <Card highlight className="flex flex-col gap-4">
              <Sticker bg="primary" tilt={4} size="sm" className="absolute -right-3 -top-4">
                Đang học
              </Sticker>
              <div className="flex items-center justify-between">
                <LevelTag level="A1" size="sm" />
                <span className="text-caption text-muted">16 mục từ</span>
              </div>
              <h3 className="text-h3">Bài 3 · Nhà cửa</h3>
              <ProgressBar value={7} max={16} size="sm" label="Tiến độ" showValue />
            </Card>
          </div>
          <div className="flex flex-col gap-3">
            <Caption>Thẻ bị khóa</Caption>
            <Card locked lockLabel="Đạt 80% bài 3 để mở" className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <LevelTag level="A1" size="sm" />
                <span className="text-caption text-muted">15 mục từ</span>
              </div>
              <h3 className="text-h3">Bài 4 · Thời tiết</h3>
            </Card>
          </div>
        </div>
      </Section>

      {/* 6. Thanh tiến độ */}
      <Section id="progress" index={6} title="Thanh tiến độ" description="Thanh máu đổi màu theo lượng máu: trên 50% xanh chanh, 26–50% vàng, từ 25% trở xuống hồng.">
        <Card padding="lg" className="flex flex-col gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            <ProgressBar label="Thanh học tập · Bài 3" value={12} max={18} showValue />
            <ProgressBar label="Thanh học tập · Cấp A1" value={640} max={800} showValue />
          </div>

          <div className="flex flex-col gap-4 border-t-2 border-line/10 pt-8">
            <Caption>Thanh máu HP · bấm thử</Caption>
            <HealthBar label="Máu của bạn" value={hp} />
            <div className="flex flex-wrap gap-3">
              <Button variant="danger" size="sm" onClick={() => setHp((v) => Math.max(0, v - 15))}>
                Trúng đòn −15
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setHp((v) => Math.min(100, v + 10))}>
                Hồi máu +10
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setHp(72)}>
                Đặt lại 72
              </Button>
            </div>
          </div>

          <div className="grid gap-6 border-t-2 border-line/10 pt-8 md:grid-cols-3">
            <HealthBar label="Khỏe" value={72} />
            <HealthBar label="Nguy hiểm" value={45} />
            <HealthBar label="Sắp gục" value={18} />
          </div>
        </Card>
      </Section>

      {/* 7. Nút đáp án */}
      <Section id="answers" index={7} title="Nút đáp án trắc nghiệm">
        <Card padding="lg" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <IconButton icon={SpeakerHigh} label="Nghe phát âm" variant="sky" />
              <div>
                <Caption>Chọn nghĩa đúng</Caption>
                <div className="font-heading text-4xl font-black tracking-tight">reliable</div>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShakeKey((k) => k + 1)}>
              Phát lại hiệu ứng rung
            </Button>
          </div>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            {ANSWER_STATES.map((a, i) => (
              <div key={a.state} className="flex flex-col gap-2">
                <AnswerOption key={a.state === 'wrong' ? shakeKey : a.state} index={i} label={a.label} state={a.state} />
                <span className="text-caption text-muted">{a.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* 8. Huy hiệu rank */}
      <Section id="ranks" index={8} title="Huy hiệu rank" description="Rank tính theo số từ đã thuộc. Huy hiệu rung khi đang ở vùng đệm 3 ngày trước khi tụt rank.">
        <Card padding="lg" className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {RANKS.map((r) => (
              <div key={r.key} className="flex flex-col gap-2">
                <RankBadge rank={r.key} size="lg" />
                <span className="font-num text-sm text-muted">Từ {formatNumber(r.min)} từ</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t-2 border-line/10 pt-8">
            <Caption>Trạng thái lung lay</Caption>
            <RankBadge rank="bach_kim" size="lg" shaky />
          </div>
        </Card>
      </Section>

      {/* 9. Độ hiếm */}
      <Section id="rarity" index={9} title="Khung thẻ theo độ hiếm" description="Tỉ lệ 3:4, bo góc 20px; số sao theo độ hiếm. Rê chuột để thẻ nghiêng 3D, thẻ Huyền Thoại lóe ánh kim. Thẻ chưa sở hữu hiện hình bóng trên nền kẻ sọc.">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {MASCOTS.map((m) => (
            <MascotCard
              key={m.id}
              rarity={m.rarity}
              name={m.name}
              number={m.number}
              owned={m.owned ?? true}
              comingSoon={m.status === 'coming_soon'}
              interactive
              art={<MascotBlob color={m.color} shape={m.shape} traits={m.traits} size={112} silhouette={m.owned === false} />}
            />
          ))}
        </div>
      </Section>

      {/* 10. Cấp độ */}
      <Section id="levels" index={10} title="Nhãn cấp độ">
        <Card padding="lg" className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {LEVELS.map((l) => (
            <div key={l.level} className="flex flex-col items-start gap-2">
              <LevelTag level={l.level} size="lg" />
              <span className="text-caption text-muted">{l.name}</span>
            </div>
          ))}
          <div className="col-span-full flex flex-wrap items-center gap-2.5 border-t-2 border-line/10 pt-5">
            <span className="text-caption text-muted">Cỡ nhỏ và vừa:</span>
            {LEVELS.map((l) => (
              <LevelTag key={l.level} level={l.level} size="sm" />
            ))}
            {LEVELS.map((l) => (
              <LevelTag key={`md-${l.level}`} level={l.level} />
            ))}
          </div>
        </Card>
      </Section>

      {/* 11. Toast và modal */}
      <Section id="feedback" index={11} title="Thông báo và hộp thoại">
        <Card padding="lg" className="flex flex-col gap-8">
          <div className="grid gap-5 md:grid-cols-2">
            {Object.values(DEMO_TOASTS).map((t) => (
              <Toast key={t.variant} {...t} onClose={() => {}} />
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t-2 border-line/10 pt-8">
            <Caption>Bấm thử</Caption>
            <div className="flex flex-wrap gap-3">
              <Button variant="accent" size="sm" onClick={() => pushToast(DEMO_TOASTS.success)}>Toast đúng</Button>
              <Button variant="danger" size="sm" onClick={() => pushToast(DEMO_TOASTS.error)}>Toast sai</Button>
              <Button variant="gold" size="sm" onClick={() => pushToast(DEMO_TOASTS.reward)}>Toast thưởng</Button>
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>Mở hộp thoại</Button>
            </div>
          </div>
        </Card>
      </Section>

      {/* 12. Icon */}
      <Section id="icons" index={12} title="Bộ icon" description="Phosphor Icons kiểu fill, tô màu phẳng, đặt trong ô tròn hoặc vuông bo góc có viền mực.">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {ICONS.map(({ icon, name, bg }, i) => (
            <div key={name} className="flex flex-col items-center gap-2.5 rounded-card border-thick border-line bg-surface px-2 py-4 shadow-hard">
              <IconBadge icon={icon} bg={bg} size="lg" shape={i % 2 ? 'square' : 'circle'} />
              <span className="text-center text-caption font-medium">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 13. Điều hướng */}
      <Section id="nav" index={13} title="Thanh điều hướng" description="Mỗi khu có màu nhận diện riêng: Học Viện xanh trời, Đấu Trường cam.">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-3">
            <Caption>Desktop · thanh bên trái</Caption>
            <SidebarNav preview activeIndex={1} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Caption>Mobile · tab dưới đáy</Caption>
            <BottomTabs preview activeIndex={2} />
          </div>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Lên rank!"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Để sau
            </Button>
            <Button variant="gold" icon={Gift} onClick={() => setModalOpen(false)}>
              Nhận lượt quay
            </Button>
          </>
        }
      >
        <div className="mb-4 flex justify-center">
          <RankBadge rank="bac" size="lg" />
        </div>
        Chúc mừng! Bạn đã thuộc 300 từ và đạt rank Bạc. Phần thưởng: 1 lượt quay đặc biệt.
      </Modal>
    </div>
  )
}
