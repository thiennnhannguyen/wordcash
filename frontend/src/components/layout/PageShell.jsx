/*
 * Khung trang chung.
 *
 * Chừa chỗ cho thanh bên (desktop) và tab dưới đáy (mobile), giới hạn bề rộng nội dung.
 * Chân trang: dòng ghi công nguồn dữ liệu (DATA_CREDITS) và liên kết tới trang Giới thiệu (/about).
 */

import { Link } from 'react-router-dom'
import NavBar from './NavBar'
import cx from '../../utils/cx'
import { DATA_CREDITS } from '../../utils/constants'

export default function PageShell({ children, className }) {
  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-64">
        <div className={cx('mx-auto w-full max-w-6xl px-4 py-6 md:px-10 md:py-10', className)}>{children}</div>
        <footer className="mx-auto w-full max-w-6xl border-t-2 border-line/10 px-4 py-4 text-caption text-muted md:px-10">
          {DATA_CREDITS.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <Link to="/about" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
            Giới thiệu và nguồn dữ liệu
          </Link>
        </footer>
      </main>
    </div>
  )
}
