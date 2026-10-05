/*
 * Menu người dùng: tên hiển thị, @username, Hồ Sơ, Đăng xuất, Đăng xuất mọi thiết bị (POST /auth/logout, /auth/logout-all).
 *
 * `trigger` (vd. avatar linh vật trên thanh trạng thái Sảnh) mở menu. Desktop: popover bám nút; mobile (< 768px): hộp thoại,
 * vì thanh trạng thái trên mobile là dải cuộn ngang nên popover dễ bị cắt. Đăng xuất xong route guard đưa về /login.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Devices, SignOut, UserCircle } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import MascotBlob from '../collection/MascotBlob'
import { useMascot } from '../../store/mascotStore'
import useMediaQuery from '../../hooks/useMediaQuery'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { messageFor } from '../../utils/errorMessages'

export function UserAvatar({ user, size = 44, className }) {
  const mascot = useMascot(user?.avatar_mascot_id)
  return (
    <span className={cx('grid shrink-0 place-items-center overflow-hidden rounded-pill border-thick border-line bg-raised', className)} style={{ width: size + 4, height: size + 4 }}>
      <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={size} shadow={false} className="translate-y-1" />
    </span>
  )
}

function MenuBody({ user, onDone }) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const logoutAll = useAuthStore((s) => s.logoutAll)
  const [pending, setPending] = useState(null)

  const run = async (kind) => {
    setPending(kind)
    try {
      await (kind === 'all' ? logoutAll() : logout())
      useToastStore.getState().push({
        variant: 'success',
        title: kind === 'all' ? 'Đã đăng xuất mọi thiết bị' : 'Đã đăng xuất',
        message: kind === 'all' ? 'Mọi phiên đăng nhập của bạn đã bị hủy.' : 'Hẹn gặp lại chiến binh!',
      })
      onDone?.()
      navigate('/login', { replace: true })
    } catch (err) {
      useToastStore.getState().push({ variant: 'error', title: 'Chưa đăng xuất được', message: messageFor(err) })
    } finally {
      setPending(null)
    }
  }

  const item = 'flex h-11 w-full items-center gap-2.5 rounded-[12px] px-3 text-left font-semibold hover:bg-raised disabled:opacity-50'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-2 pb-2">
        <UserAvatar user={user} size={40} />
        <div className="min-w-0 leading-tight">
          <div className="truncate font-heading font-extrabold">{user?.display_name}</div>
          <div className="truncate text-caption text-muted">@{user?.username}</div>
        </div>
      </div>
      <button
        type="button"
        role="menuitem"
        className={item}
        onClick={() => {
          onDone?.()
          navigate('/profile')
        }}
      >
        <Icon icon={UserCircle} size={20} /> Hồ Sơ
      </button>
      <button type="button" role="menuitem" className={item} disabled={pending !== null} onClick={() => run('one')}>
        <Icon icon={SignOut} size={20} /> {pending === 'one' ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
      <button type="button" role="menuitem" className={cx(item, 'text-danger-deep')} disabled={pending !== null} onClick={() => run('all')}>
        <Icon icon={Devices} size={20} /> {pending === 'all' ? 'Đang đăng xuất…' : 'Đăng xuất mọi thiết bị'}
      </button>
    </div>
  )
}

export default function UserMenu({ trigger, placement = 'bottom-end', className }) {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const desktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (!open || !desktop) return undefined
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false)
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, desktop])

  // Chưa đăng nhập (vd. trang Design System): chỉ hiện phần hiển thị, không có menu
  if (!user) return trigger ?? null

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu tài khoản ${user.display_name}`}
        onClick={() => setOpen((o) => !o)}
        className="block rounded-pill focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {trigger ?? <UserAvatar user={user} />}
      </button>
      {desktop ? (
        open && (
          <div
            role="menu"
            className={cx(
              'absolute z-50 w-64 rounded-card border-thick border-line bg-surface p-2 shadow-hard-lg',
              placement === 'top-start' ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2',
            )}
          >
            <MenuBody user={user} onDone={() => setOpen(false)} />
          </div>
        )
      ) : (
        <Modal open={open} onClose={() => setOpen(false)} title="Tài khoản">
          <MenuBody user={user} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </div>
  )
}

// Nút dạng thẻ ở cuối thanh bên desktop
export function SidebarUser() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  return (
    <UserMenu
      placement="top-start"
      className="mt-auto"
      trigger={
        <span className="flex w-56 items-center gap-3 rounded-btn border-thick border-transparent px-2 py-1.5 text-left hover:border-line hover:bg-surface">
          <UserAvatar user={user} size={36} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-heading font-extrabold">{user.display_name}</span>
            <span className="block truncate text-caption text-muted">@{user.username}</span>
          </span>
        </span>
      }
    />
  )
}

