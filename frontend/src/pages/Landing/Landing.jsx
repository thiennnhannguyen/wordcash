/*
 * Trang landing: màn hình đầu tiên người dùng thấy. Mục tiêu duy nhất là bấm "CHƠI NGAY".
 * Thứ tự: header · hero (mini màn đấu) · số liệu · hai khu chính · cách chơi · thang rank ·
 * linh vật · Cửa Ải Hôm Nay · CTA cuối · footer.
 */

import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckFat,
  Fire,
  GraduationCap,
  Lightning,
  Lock,
  Play,
  Smiley,
  Star,
  Sword,
} from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Reveal from '../../components/ui/Reveal'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import { Wordmark } from '../../components/layout/NavBar'
import cx from '../../utils/cx'
import { DATA_CREDITS } from '../../utils/constants'
import HeroBattle from './HeroBattle'
import LandingHeader, { LANDING_LINKS } from './LandingHeader'
import MascotFan from './MascotFan'
import RankStairs from './RankStairs'

const STATS = [
  { icon: BookOpen, bg: 'primary', value: '10.000', label: 'từ vựng' },
  { icon: GraduationCap, bg: 'sky', value: '6 cấp độ', label: 'A1–C2' },
  { icon: Smiley, bg: 'gold', value: '100', label: 'linh vật' },
  { icon: Sword, bg: 'orange', value: 'Đấu 1v1', label: 'thời gian thực' },
]

const STEPS = [
  { icon: GraduationCap, bg: 'sky', title: 'Học theo lộ trình', text: 'Mỗi bài 15–20 từ, đi từ nhận diện nghĩa tới tự điền vào câu.' },
  { icon: Fire, bg: 'gold', title: 'Qua Cửa Ải mỗi ngày', text: 'Trả bài vài từ đã học để giữ streak và không bị tụt từ.' },
  { icon: Sword, bg: 'orange', title: 'Vào Đấu Trường', text: 'Dùng vốn từ thật để hạ đối thủ và leo bảng xếp hạng.' },
]

// Trạm trên bản đồ lộ trình minh họa
const ROADMAP = [
  { state: 'done', label: 'Bài 1' },
  { state: 'done', label: 'Bài 2' },
  { state: 'current', label: 'Bài 3' },
  { state: 'locked', label: 'Bài 4' },
  { state: 'locked', label: 'Boss' },
]

const WEEK = [
  { day: 'T2', done: true },
  { day: 'T3', done: true },
  { day: 'T4', done: true },
  { day: 'T5', done: true },
  { day: 'T6', done: false, today: true },
  { day: 'T7', done: false },
  { day: 'CN', done: false },
]

function Container({ className, children }) {
  return <div className={cx('mx-auto w-full max-w-6xl px-4 md:px-8', className)}>{children}</div>
}

function SectionTitle({ eyebrow, title, sticker, className }) {
  return (
    <div className={cx('mb-10 flex flex-col gap-3 md:mb-14', className)}>
      {eyebrow && <span className="hud-label">{eyebrow}</span>}
      <h2 className="text-[34px] leading-[1.05] md:text-[52px]">
        {title}
        {sticker}
      </h2>
    </div>
  )
}

function RoadmapStation({ state, label }) {
  const done = state === 'done'
  const current = state === 'current'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Khung cố định để mọi trạm thẳng hàng dù trạm đang học to hơn */}
      <span className="grid size-13 place-items-center md:size-16">
      <span
        className={cx(
          'grid place-items-center rounded-pill border-thick border-line',
          current
            ? 'size-12 bg-gold shadow-[0_0_0_4px_var(--color-surface),0_0_0_7px_var(--color-line)] anim-glow md:size-16'
            : 'size-10 shadow-hard-sm md:size-12',
          done && 'bg-accent',
          state === 'locked' && 'bg-raised text-muted',
        )}
      >
        <Icon icon={done ? CheckFat : current ? Star : Lock} size={current ? 30 : 22} color={state === 'locked' ? 'muted' : 'ink'} />
      </span>
      </span>
      <span className="font-display text-xs font-bold uppercase text-ink">{label}</span>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const play = () => navigate('/register')

  return (
    <div id="top" className="min-h-dvh overflow-x-clip bg-bg">
      <LandingHeader />

      <main>
        {/* 2. HERO */}
        <section className="relative">
          <Container className="grid items-center gap-12 pb-16 pt-10 md:pt-16 lg:grid-cols-[1.25fr_1fr] lg:gap-12 lg:pb-24">
            <div className="flex flex-col gap-6">
              <Sticker bg="gold" tilt={-3} size="sm" wiggle className="self-start">
                Mới · Đấu từ vựng 1v1
              </Sticker>
              <h1 className="text-[48px] leading-[0.98] tracking-[-0.04em] sm:text-[64px] lg:text-[72px] xl:text-[78px]">
                Học từ
                <br />
                <span className="whitespace-nowrap">
                  như{' '}
                  <span className="relative inline-block">
                    <span aria-hidden="true" className="absolute inset-x-[-0.1em] bottom-[0.08em] top-[0.38em] -rotate-1 rounded-[10px] bg-accent" />
                    <span className="relative">đánh trận.</span>
                  </span>
                </span>
              </h1>
              <p className="max-w-lg text-lg text-muted md:text-xl">
                Học 10.000 từ vựng từ A1 đến C2, rồi thách đấu bạn bè. Trả lời nhanh hơn, bắn trúng trước.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Button size="lg" icon={Play} onClick={play}>
                  Chơi ngay – miễn phí
                </Button>
                <Button size="lg" variant="secondary" onClick={() => document.getElementById('cach-choi')?.scrollIntoView({ behavior: 'smooth' })}>
                  Xem cách chơi
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex">
                  {['sky', 'danger', 'accent'].map((c, i) => (
                    <span
                      key={c}
                      className={cx('grid size-11 place-items-center overflow-hidden rounded-pill border-thick border-line', i > 0 && '-ml-3')}
                      style={{ background: `var(--color-${c})`, zIndex: 3 - i }}
                    >
                      <MascotBlob color="surface" shape="round" size={40} className="translate-y-1" />
                    </span>
                  ))}
                </div>
                <p className="text-caption font-medium text-muted">
                  <span className="font-num text-base text-ink">12.400+</span> người đang luyện từ mỗi ngày
                </p>
              </div>
            </div>

            <HeroBattle className="mx-auto w-full max-w-[520px] lg:mr-0" />
          </Container>
        </section>

        {/* 3. DẢI SỐ LIỆU */}
        <section className="border-y-thick border-line bg-surface">
          <Container className="grid grid-cols-2 gap-4 py-8 md:grid-cols-4 md:gap-6 md:py-10">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06} className="flex items-center gap-3 md:gap-4">
                <IconBadge icon={s.icon} bg={s.bg} size="lg" shape="square" />
                <div className="leading-tight">
                  <div className="font-num text-xl md:text-2xl">{s.value}</div>
                  <div className="text-caption font-medium text-muted">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </Container>
        </section>

        {/* 4. HAI KHU CHÍNH */}
        <section className="py-20 md:py-28">
          <Container>
            <SectionTitle eyebrow="Hai khu chính" title="Học xong là có đất dụng võ." />
            <div className="grid gap-8 lg:grid-cols-2">
              <Reveal
                id="hoc-vien"
                className="flex min-w-0 scroll-mt-28 flex-col gap-6 rounded-panel border-thick border-line bg-sky p-5 shadow-hard-lg md:p-8"
              >
                <div className="flex items-center gap-3">
                  <IconBadge icon={GraduationCap} bg="surface" size="md" shape="square" />
                  <h3 className="text-[30px] font-black">Học Viện</h3>
                </div>
                <p className="text-lg font-medium text-ink">
                  Lộ trình rõ ràng từ A1 đến C2. Học theo từ, theo cụm, theo ngữ cảnh. Ôn đúng lúc sắp quên.
                </p>
                <div className="mt-auto rounded-card border-thick border-line bg-surface p-4 shadow-hard md:p-5">
                  <div className="hud-label mb-4">A1 · Chặng Gia đình</div>
                  <div className="relative flex items-start justify-between">
                    <span aria-hidden="true" className="absolute inset-x-6 top-6 h-[3px] bg-line md:inset-x-8 md:top-8" />
                    <span aria-hidden="true" className="absolute left-6 top-6 h-[3px] w-[45%] bg-accent-deep md:left-8 md:top-8" />
                    {ROADMAP.map((st) => (
                      <div key={st.label} className="relative z-10">
                        <RoadmapStation {...st} />
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal
                id="dau-truong"
                delay={0.08}
                className="flex min-w-0 scroll-mt-28 flex-col gap-6 rounded-panel border-thick border-line bg-orange p-5 shadow-hard-lg md:p-8"
              >
                <div className="flex items-center gap-3">
                  <IconBadge icon={Sword} bg="surface" size="md" shape="square" />
                  <h3 className="text-[30px] font-black">Đấu Trường</h3>
                </div>
                <p className="text-lg font-medium text-ink">
                  Ghép trận cùng rank hoặc rủ bạn bằng mã phòng. Ai đúng và nhanh hơn thì bắn trước.
                </p>
                <div className="mt-auto flex flex-col gap-4 rounded-card border-thick border-line bg-surface p-4 shadow-hard md:p-5">
                  <div className="hud-label">Mã phòng</div>
                  <div className="flex gap-2" aria-label="Mã phòng WX7K2">
                    {'WX7K2'.split('').map((ch, i) => (
                      <span
                        key={i}
                        className="grid h-14 min-w-0 flex-1 place-items-center rounded-[14px] border-thick border-line bg-raised font-num text-2xl shadow-hard-sm"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                  <Button icon={Lightning} fullWidth onClick={play}>
                    Tìm trận
                  </Button>
                </div>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* 5. CÁCH CHƠI */}
        <section id="cach-choi" className="scroll-mt-20 border-y-thick border-line bg-raised py-20 md:py-28">
          <Container>
            <SectionTitle eyebrow="Cách chơi" title="Ba bước để lên đồ." />
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 0.08} className="relative flex flex-col gap-4 rounded-card border-thick border-line bg-surface p-6 shadow-hard">
                  <div className="flex items-start justify-between">
                    <span className="font-num text-[64px] leading-none text-primary">{String(i + 1).padStart(2, '0')}</span>
                    <IconBadge icon={step.icon} bg={step.bg} size="lg" />
                  </div>
                  <h3 className="text-h3">{step.title}</h3>
                  <p className="text-muted">{step.text}</p>
                  {i < STEPS.length - 1 && (
                    <span aria-hidden="true" className="absolute -right-6 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                      <IconBadge icon={ArrowRight} bg="gold" size="sm" />
                    </span>
                  )}
                </Reveal>
              ))}
            </ol>
          </Container>
        </section>

        {/* 6. THANG RANK */}
        <section id="rank" className="scroll-mt-20 py-20 md:py-28">
          <Container>
            <SectionTitle
              eyebrow="Thang rank"
              title="Leo rank bằng số từ đã thuộc."
            />
            <Reveal>
              <RankStairs />
            </Reveal>
          </Container>
        </section>

        {/* 7. LINH VẬT */}
        <section id="linh-vat" className="scroll-mt-20 border-y-thick border-line bg-surface py-20 md:py-28">
          <Container className="flex flex-col items-center text-center">
            <SectionTitle eyebrow="Bộ sưu tập" title="Sưu tầm 100 linh vật" className="items-center" />
            <Reveal className="w-full">
              <MascotFan />
            </Reveal>
            <p className="flex items-center gap-2 text-base font-medium md:text-lg">
              <IconBadge icon={Star} bg="gold" size="sm" shadow={false} />
              Cứ mỗi 50 từ thuộc được 1 lượt quay.
            </p>
          </Container>
        </section>

        {/* 8. CỬA ẢI HÔM NAY */}
        <section className="py-20 md:py-28">
          <Container>
            <Reveal className="relative grid gap-8 rounded-panel border-thick border-line bg-gold p-6 shadow-hard-lg md:grid-cols-[auto_1fr] md:items-center md:gap-10 md:p-10">
              <Sticker bg="surface" tilt={6} size="sm" wiggle className="absolute -top-4 right-6">
                Streak 4 ngày
              </Sticker>
              <IconBadge icon={Fire} bg="orange" size="xl" />
              <div className="flex flex-col gap-5">
                <h2 className="text-[34px] leading-[1.05] md:text-[44px]">Cửa Ải Hôm Nay</h2>
                <p className="max-w-2xl text-lg font-medium">
                  Mỗi ngày một cửa ải. Mở web là phải trả bài 2–5 từ. Quên là tụt từ, có thể tụt rank. Giữ streak để nhận
                  lượt quay.
                </p>
                <ul className="grid max-w-md grid-cols-7 gap-1.5 md:gap-2" aria-label="Streak trong tuần">
                  {WEEK.map((d) => (
                    <li
                      key={d.day}
                      className={cx(
                        'flex h-16 flex-col items-center justify-center gap-0.5 rounded-[14px] border-thick border-line',
                        d.done ? 'bg-orange' : 'bg-surface',
                        d.today && 'shadow-hard outline-[3px] outline-offset-2 outline-ink outline-dashed',
                      )}
                    >
                      <Icon icon={Fire} size={20} color={d.done ? 'ink' : 'muted'} />
                      <span className="font-display text-xs font-bold">{d.day}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* 9. CTA CUỐI */}
        <section className="pb-20 md:pb-28">
          <Container>
            <Reveal className="relative flex flex-col items-center gap-7 overflow-hidden rounded-panel border-thick border-line bg-primary px-6 py-16 text-center shadow-hard-lg md:py-20">
              <MascotBlob color="accent" shape="round" size={110} className="absolute -bottom-6 -left-4 hidden -rotate-12 md:block" />
              <MascotBlob color="gold" shape="drop" size={96} className="absolute -right-2 -top-3 hidden rotate-12 md:block" />
              <h2 className="text-[40px] leading-[1.02] text-white md:text-[64px]">Sẵn sàng vào trận?</h2>
              <p className="max-w-md text-lg text-white/85">Tạo tài khoản miễn phí, làm bài xếp lớp và vào trận đầu tiên ngay hôm nay.</p>
              <Button variant="accent" size="lg" icon={Lightning} onClick={play}>
                Tạo tài khoản ngay
              </Button>
            </Reveal>
          </Container>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="border-t-thick border-line bg-surface">
        <Container className="flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Wordmark />
            <p className="text-caption text-muted">Học từ như đánh trận.</p>
          </div>
          <nav aria-label="Liên kết cuối trang" className="flex flex-wrap gap-x-6 gap-y-2">
            {LANDING_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="inline-flex h-11 items-center font-medium text-ink hover:text-primary">
                {l.label}
              </a>
            ))}
          </nav>
        </Container>
        <div className="border-t-2 border-line/10">
          <Container className="flex flex-col gap-1 py-5 text-caption text-muted">
            <span>© 2026 WORDCLASH</span>
            {DATA_CREDITS.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </Container>
        </div>
      </footer>
    </div>
  )
}
