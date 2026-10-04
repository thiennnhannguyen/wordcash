/*
 * Thanh điều hướng.
 *
 * Desktop (≥ md): thanh bên trái cố định, mục đang chọn nền tím điện.
 * Mobile: tab dưới đáy gồm Sảnh, Học Viện, Đấu Trường (nút giữa to, nổi lên, màu cam), Bộ Sưu Tập, Hồ Sơ.
 * `preview` hiển thị tại chỗ (không cố định, không ẩn theo màn hình), dùng cho trang Design System.
 */

import { NavLink } from 'react-router-dom'
import { Cards, GraduationCap, House, Ranking, Sword, UserCircle } from '@phosphor-icons/react'
import Icon, { IconBadge } from '../ui/Icon'
import cx from '../../utils/cx'
import { SidebarUser } from './UserMenu'

// Mỗi khu một màu nhận diện: Học Viện xanh trời, Đấu Trường cam. `mobile: false` = chỉ có trên desktop.
export const NAV_ITEMS = [
  { to: '/lobby', label: 'Sảnh', icon: House, color: 'primary' },
  { to: '/academy', label: 'Học Viện', icon: GraduationCap, color: 'sky' },
  { to: '/arena', label: 'Đấu Trường', icon: Sword, color: 'orange', featured: true },
  { to: '/collection', label: 'Bộ Sưu Tập', icon: Cards, color: 'gold' },
  { to: '/leaderboard', label: 'Bảng xếp hạng', icon: Ranking, color: 'danger', mobile: false },
  { to: '/profile', label: 'Hồ Sơ', icon: UserCircle, color: 'accent' },
]

const MOBILE_ITEMS = NAV_ITEMS.filter((item) => item.mobile !== false)

export function Wordmark({ className }) {
  return (
    <div className={cx('font-heading text-2xl font-black italic tracking-tight text-ink', className)}>
      <span className="text-primary">W</span>ORDCLASH
    </div>
  )
}

export function SidebarNav({ preview = false, activeIndex }) {
  return (
    <aside
      className={cx(
        'w-64 flex-col border-line bg-bg px-4 py-6',
        preview
          ? 'flex rounded-card border-thick bg-surface shadow-hard'
          : 'fixed inset-y-0 left-0 z-40 hidden border-r-thick md:flex',
      )}
    >
      <div className="mb-10 px-3">
        <Wordmark />
      </div>
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-2">
        {NAV_ITEMS.map((item, i) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => {
              const active = activeIndex != null ? activeIndex === i : isActive
              return (
                <span
                  className={cx(
                    'flex h-14 items-center gap-3 rounded-btn border-thick px-2.5',
                    'font-display text-sm font-bold uppercase tracking-wider transition-colors',
                    active
                      ? 'border-line bg-primary text-white shadow-hard'
                      : 'border-transparent text-ink hover:bg-raised',
                  )}
                >
                  <IconBadge icon={item.icon} bg={active ? 'surface' : item.color} size="sm" shape="square" shadow={false} />
                  {item.label}
                </span>
              )
            }}
          </NavLink>
        ))}
      </nav>
      {/* Menu tài khoản (đăng xuất) ở cuối thanh bên */}
      {!preview && <SidebarUser />}
    </aside>
  )
}

export function BottomTabs({ preview = false, activeIndex }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className={cx(
        'border-line bg-surface',
        preview
          ? 'mt-8 w-full max-w-[390px] rounded-card border-thick shadow-hard'
          : 'fixed inset-x-0 bottom-0 z-40 border-t-thick pb-[env(safe-area-inset-bottom)] md:hidden',
      )}
    >
      <ul className="grid grid-cols-5">
        {MOBILE_ITEMS.map((item, i) => (
          <li key={item.to}>
            <NavLink to={item.to} className="block">
              {({ isActive }) => {
                const active = activeIndex != null ? activeIndex === i : isActive

                if (item.featured) {
                  // Nút giữa: tròn, to, nổi lên khỏi thanh tab
                  return (
                    <span className="flex h-[72px] flex-col items-center justify-end gap-1 pb-2">
                      <span
                        className={cx(
                          'pressable -mt-8 grid size-16 place-items-center rounded-pill border-thick border-line bg-orange shadow-hard',
                          active && 'outline-[3px] outline-offset-2 outline-ink outline',
                        )}
                      >
                        <Icon icon={item.icon} size={30} color="ink" />
                      </span>
                      <span className="whitespace-nowrap font-display text-[11px] font-bold uppercase leading-none text-ink">
                        {item.label}
                      </span>
                    </span>
                  )
                }

                return (
                  <span className="flex h-[72px] flex-col items-center justify-center gap-1">
                    <span
                      className={cx(
                        'grid h-8 w-13 place-items-center rounded-pill border-thick transition-colors',
                        active ? 'border-line' : 'border-transparent text-muted',
                      )}
                      style={active ? { background: `var(--color-${item.color})` } : undefined}
                    >
                      <Icon icon={item.icon} size={22} color={active ? (item.color === 'primary' ? 'white' : 'ink') : 'current'} />
                    </span>
                    <span
                      className={cx(
                        'whitespace-nowrap font-display text-[11px] font-bold uppercase leading-none',
                        active ? 'text-ink' : 'text-muted',
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                )
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function NavBar() {
  return (
    <>
      <SidebarNav />
      <BottomTabs />
    </>
  )
}
