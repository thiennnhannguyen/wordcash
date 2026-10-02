/*
 * Khung chung cho Đăng nhập / Đăng ký: desktop chia đôi màn hình (form nền kem bên trái,
 * minh họa nền tím điện bên phải). Mobile bỏ nửa minh họa, đưa một linh vật nhỏ lên trên form.
 */

import { Link } from 'react-router-dom'
import { Fire } from '@phosphor-icons/react'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import { Wordmark } from '../../components/layout/NavBar'
import cx from '../../utils/cx'

// Thẻ từ vựng bay lơ lửng: vị trí, góc nghiêng, độ trễ animation
const WORD_CARDS = [
  { word: 'BRAVE', note: '/breɪv/ · dũng cảm', tilt: -8, className: 'left-[8%] top-[12%]', delay: '0s' },
  { word: 'look forward to', note: 'mong chờ', tilt: 6, className: 'right-[8%] top-[34%]', delay: '1.2s' },
  { word: 'a piece of cake', note: 'dễ ợt', tilt: -5, className: 'left-[12%] bottom-[30%]', delay: '0.6s' },
]

// Linh vật ở các "tư thế" khác nhau: dáng, cỡ, góc nghiêng
const MASCOTS = [
  { color: 'accent', shape: 'round', size: 132, tilt: -10, className: 'right-[14%] top-[8%]', delay: '0.3s' },
  { color: 'gold', shape: 'drop', size: 104, tilt: 12, className: 'left-[42%] top-[40%]', delay: '1.5s' },
  { color: 'orange', shape: 'tall', size: 112, tilt: -6, className: 'right-[10%] bottom-[24%]', delay: '0.9s' },
  { color: 'sky', shape: 'wide', size: 120, tilt: 8, className: 'left-[6%] top-[44%]', delay: '2s' },
]

function Illustration() {
  return (
    <div className="relative hidden overflow-hidden border-l-thick border-line bg-primary lg:block" aria-hidden="true">
      {WORD_CARDS.map((c) => (
        <div
          key={c.word}
          className={cx('anim-float absolute rounded-[18px] border-thick border-line bg-surface px-5 py-3 shadow-hard-lg', c.className)}
          style={{ '--tilt': `${c.tilt}deg`, animationDelay: c.delay }}
        >
          <div className="font-display text-2xl font-bold uppercase leading-tight tracking-wide">{c.word}</div>
          <div className="text-caption font-medium text-muted">{c.note}</div>
        </div>
      ))}
      {MASCOTS.map((m, i) => (
        <div key={i} className={cx('anim-float absolute', m.className)} style={{ '--tilt': `${m.tilt}deg`, animationDelay: m.delay }}>
          <MascotBlob color={m.color} shape={m.shape} size={m.size} />
        </div>
      ))}
      <Sticker bg="gold" tilt={-6} size="lg" icon={Fire} wiggle className="absolute right-[30%] top-[22%]">
        Streak 12 ngày
      </Sticker>
      <p className="absolute inset-x-10 bottom-10 font-heading text-[52px] font-black leading-[1] tracking-tight text-white">
        Học từ như <span className="text-accent">đánh trận.</span>
      </p>
    </div>
  )
}

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 md:px-10">
        <Link to="/" aria-label="WORDCLASH, về trang chủ" className="self-start">
          <Wordmark className="text-xl" />
        </Link>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 py-8">
          {/* Mobile: một linh vật nhỏ thay cho nửa minh họa */}
          <div className="flex justify-center lg:hidden" aria-hidden="true">
            <MascotBlob color="primary" shape="round" size={88} className="anim-float" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-[34px] leading-[1.05] md:text-[40px]">{title}</h1>
            {subtitle && <p className="text-muted">{subtitle}</p>}
          </div>
          {children}
          {footer && <p className="text-center font-medium">{footer}</p>}
        </main>
      </div>
      <Illustration />
    </div>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label="hoặc">
      <span className="h-0.5 flex-1 bg-line/20" />
      <span className="hud-label">hoặc</span>
      <span className="h-0.5 flex-1 bg-line/20" />
    </div>
  )
}
