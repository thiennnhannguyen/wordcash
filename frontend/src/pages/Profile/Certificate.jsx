/*
 * Thẻ chứng nhận rank, tải về/chia sẻ.
 *
 * Màn xem trước trong ứng dụng: thẻ ở giữa nghiêng nhẹ, công tắc "Bài đăng / Story" (1080×1350 / 1080×1920),
 * các nút "TẢI ẢNH", "Chia sẻ Facebook", "Chia sẻ Instagram", "Sao chép link". Ảnh vẽ bằng canvas trong certificateArt.js.
 * Instagram không có liên kết chia sẻ trên web: dùng bảng chia sẻ của máy nếu có, nếu không thì tải ảnh và hướng dẫn đăng Story.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DownloadSimple, FacebookLogo, InstagramLogo, LinkSimple } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { FORMATS, drawCertificate } from './certificateArt'

export function profileUrl(handle) {
  return `https://wordclash.vn/@${handle}`
}

function download(image, format) {
  const a = document.createElement('a')
  a.href = image
  a.download = `wordclash-chung-nhan-${format}.png`
  a.click()
}

export default function CertificateModal({ open, onClose, cert, initialFormat = 'post' }) {
  const pushToast = useToastStore((s) => s.push)
  const [format, setFormat] = useState(initialFormat)
  const [images, setImages] = useState({})

  useEffect(() => {
    if (!open || images[format]) return
    let alive = true
    drawCertificate(cert, format).then((img) => alive && setImages((prev) => ({ ...prev, [format]: img })))
    return () => {
      alive = false
    }
  }, [open, format, images, cert])

  const image = images[format]
  const url = profileUrl(cert.handle)

  const shareInstagram = async () => {
    try {
      const blob = await (await fetch(image)).blob()
      const file = new File([blob], 'wordclash-chung-nhan.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'WORDCLASH' })
        return
      }
      download(image, format)
      pushToast({ variant: 'info', title: 'Đã tải ảnh', message: 'Mở Instagram, tạo Story mới rồi chọn ảnh vừa tải nhé.' })
    } catch {
      // Người dùng đóng hộp chia sẻ
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      pushToast({ variant: 'success', title: 'Đã sao chép link hồ sơ', message: url.replace('https://', '') })
    } catch {
      pushToast({ variant: 'error', title: 'Không sao chép được', message: url.replace('https://', '') })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Thẻ chứng nhận" mobileSheet className="max-w-4xl">
      <div className="grid gap-6 text-ink md:grid-cols-[minmax(0,1fr)_300px] md:items-center md:gap-10">
        {/* Thẻ ở giữa, nghiêng nhẹ */}
        <div className="grid min-h-[46dvh] place-items-center py-2 md:min-h-[62dvh]">
          <motion.div
            key={format}
            initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
            animate={{ rotate: -2.5, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={cx('relative', format === 'post' ? 'aspect-[4/5] h-[44dvh] md:h-[60dvh]' : 'aspect-[9/16] h-[46dvh] md:h-[62dvh]')}
          >
            {image ? (
              <img src={image} alt={`Thẻ chứng nhận rank ${RANK_BY_KEY[cert.rank].name}, khổ ${FORMATS[format].label}`} className="size-full rounded-[18px] shadow-hard-lg" />
            ) : (
              <div className="size-full animate-pulse rounded-[18px] bg-raised" aria-busy="true" />
            )}
          </motion.div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 rounded-pill border-thick border-line bg-surface p-1 shadow-hard-sm" role="radiogroup" aria-label="Khổ ảnh">
            {Object.entries(FORMATS).map(([key, f]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={format === key}
                onClick={() => setFormat(key)}
                className={cx('h-11 rounded-pill font-display text-sm font-bold uppercase tracking-wide transition-colors', format === key ? 'bg-primary text-white ring-2 ring-line' : 'text-ink hover:bg-raised')}
              >
                {f.label}
                <span className={cx('ml-1.5 font-num text-[13px]', format === key ? 'text-white/70' : 'text-muted')}>{key === 'post' ? '4:5' : '9:16'}</span>
              </button>
            ))}
          </div>

          <Button size="lg" variant="gold" icon={DownloadSimple} disabled={!image} onClick={() => download(image, format)}>
            Tải ảnh
          </Button>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <Button
              variant="sky"
              icon={FacebookLogo}
              className="whitespace-nowrap px-3"
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,width=640,height=560')}
            >
              <span className="md:hidden">Facebook</span>
              <span className="max-md:hidden">Chia sẻ Facebook</span>
            </Button>
            <Button variant="danger" icon={InstagramLogo} className="whitespace-nowrap px-3" disabled={!image} onClick={shareInstagram}>
              <span className="md:hidden">Instagram</span>
              <span className="max-md:hidden">Chia sẻ Instagram</span>
            </Button>
          </div>
          <Button variant="secondary" icon={LinkSimple} onClick={copyLink}>
            Sao chép link
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-caption text-muted">
            <Icon icon={LinkSimple} size={14} color="muted" /> {url.replace('https://', '')}
          </p>
        </div>
      </div>
    </Modal>
  )
}
