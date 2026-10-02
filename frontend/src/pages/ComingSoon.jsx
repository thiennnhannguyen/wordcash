/*
 * Trang tạm cho các mục chưa được làm giao diện.
 *
 * `standalone`: trang đứng riêng ngoài khung app (vd. Đăng nhập, Đăng ký), tự căn giữa màn hình.
 */

import { Hourglass } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { IconBadge } from '../components/ui/Icon'
import cx from '../utils/cx'

export default function ComingSoon({ title, standalone = false }) {
  const navigate = useNavigate()

  return (
    <div className={cx(standalone && 'grid min-h-dvh place-items-center bg-bg px-4')}>
      <Card padding="lg" className={cx('mx-auto flex max-w-md flex-col items-center gap-4 text-center', !standalone && 'mt-10')}>
        <IconBadge icon={Hourglass} bg="gold" size="lg" />
        <h1 className="text-3xl">{title}</h1>
        <p className="text-muted">Khu vực này đang được xây dựng.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/')}>
            Về trang chủ
          </Button>
          <Button variant="ghost" onClick={() => navigate('/design-system')}>
            Design System
          </Button>
        </div>
      </Card>
    </div>
  )
}
