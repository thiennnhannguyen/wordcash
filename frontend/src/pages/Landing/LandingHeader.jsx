/*
 * Header landing (dính trên cùng): logo, menu giữa, "Đăng nhập" và "Chơi ngay".
 * Mobile: logo + nút menu mở bảng điều hướng.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, X } from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import { Wordmark } from '../../components/layout/NavBar'

export const LANDING_LINKS = [
  { href: '#hoc-vien', label: 'Học Viện' },
  { href: '#dau-truong', label: 'Đấu Trường' },
  { href: '#linh-vat', label: 'Linh Vật' },
  { href: '#rank', label: 'Bảng xếp hạng' },
]

export default function LandingHeader() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b-thick border-line bg-bg">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-6 px-4 md:px-8">
        <a href="#top" aria-label="WORDCLASH, về đầu trang" className="shrink-0">
          <Wordmark />
        </a>

        <nav aria-label="Điều hướng landing" className="hidden items-center gap-1 lg:flex">
          {LANDING_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="inline-flex h-11 items-center rounded-pill px-4 font-display text-sm font-bold uppercase tracking-wide text-ink transition-colors hover:bg-raised"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
            Đăng nhập
          </Button>
          <Button size="sm" onClick={() => navigate('/register')}>
            Chơi ngay
          </Button>
        </div>

        <IconButton
          icon={menuOpen ? X : List}
          label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          variant="secondary"
          size="sm"
          className="lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="landing-menu"
          onClick={() => setMenuOpen((v) => !v)}
        />
      </div>

      {menuOpen && (
        <div id="landing-menu" className="border-t-thick border-line bg-surface px-4 pb-5 pt-3 lg:hidden">
          <nav aria-label="Điều hướng landing" className="flex flex-col">
            {LANDING_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="flex h-13 items-center border-b-2 border-line/10 font-display text-base font-bold uppercase tracking-wide text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => navigate('/login')}>
              Đăng nhập
            </Button>
            <Button onClick={() => navigate('/register')}>Chơi ngay</Button>
          </div>
        </div>
      )}
    </header>
  )
}
