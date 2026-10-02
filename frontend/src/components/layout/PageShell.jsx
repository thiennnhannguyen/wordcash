/*
 * Khung trang chung.
 *
 * Chừa chỗ cho thanh bên (desktop) và tab dưới đáy (mobile), giới hạn bề rộng nội dung.
 */

import NavBar from './NavBar'
import cx from '../../utils/cx'

export default function PageShell({ children, className }) {
  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-64">
        <div className={cx('mx-auto w-full max-w-6xl px-4 py-6 md:px-10 md:py-10', className)}>{children}</div>
      </main>
    </div>
  )
}
