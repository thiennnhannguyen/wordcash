/*
 * Trang trưng bày 8 phiên bản màu của thẻ chứng nhận (thu nhỏ trên cùng một trang), để so độ lộng lẫy tăng dần theo rank:
 * Tân Binh đơn giản → Huyền Thoại nền cầu vồng, ánh kim. Kèm 2 mẫu khổ Story. Bấm một thẻ để mở màn xem trước.
 * Dùng khi duyệt thiết kế; ảnh vẽ bằng cùng hàm drawCertificate với ảnh thật.
 */

import { useEffect, useState } from 'react'
import { RANKS } from '../utils/constants'
import CertificateModal from '../pages/Profile/Certificate'
import { drawCertificate } from '../pages/Profile/certificateArt'
import { fetchCertificate } from './fixtures/certificates'

function Thumb({ rank, format, scale, onOpen }) {
  const [image, setImage] = useState(null)
  useEffect(() => {
    let alive = true
    drawCertificate(fetchCertificate(rank.key), format, scale).then((img) => alive && setImage(img))
    return () => {
      alive = false
    }
  }, [rank.key, format, scale])

  return (
    <button type="button" onClick={onOpen} className="group flex flex-col items-center gap-2 text-center">
      <div className={format === 'post' ? 'aspect-[4/5] w-full' : 'aspect-[9/16] w-full'}>
        {image ? (
          <img src={image} alt={`Thẻ chứng nhận ${rank.name}`} className="size-full rounded-[12px] transition-transform group-hover:-translate-y-1 group-hover:-rotate-1" />
        ) : (
          <div className="size-full animate-pulse rounded-[12px] bg-raised" />
        )}
      </div>
      <span className="font-display text-sm font-bold uppercase tracking-wide">{rank.name}</span>
    </button>
  )
}

export default function CertificateGallery() {
  const [open, setOpen] = useState(null)
  return (
    <div className="flex flex-col gap-6 pb-20 md:gap-8 md:pb-0">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">Thẻ chứng nhận · 8 rank</h1>
        <p className="max-w-2xl text-muted">Rank càng cao thẻ càng lộng lẫy: họa tiết dày hơn, có tia sáng, viền kép, góc viền vàng, và Huyền Thoại có nền cầu vồng ánh kim. Bấm một thẻ để xem trước và tải.</p>
      </header>
      <h2 className="hud-label -mb-2">Bài đăng 1080×1350</h2>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {RANKS.map((r) => (
          <Thumb key={r.key} rank={r} format="post" scale={0.4} onOpen={() => setOpen({ cert: fetchCertificate(r.key), format: 'post' })} />
        ))}
      </div>
      <h2 className="hud-label -mb-2">Story 1080×1920</h2>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {[RANKS[0], RANKS[4], RANKS[6], RANKS[7]].map((r) => (
          <Thumb key={r.key} rank={r} format="story" scale={0.35} onOpen={() => setOpen({ cert: fetchCertificate(r.key), format: 'story' })} />
        ))}
      </div>
      {open && <CertificateModal open onClose={() => setOpen(null)} cert={open.cert} initialFormat={open.format} key={`${open.cert.rank}-${open.format}`} />}
    </div>
  )
}
