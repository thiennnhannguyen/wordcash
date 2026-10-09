/*
 * DỮ LIỆU MẪU CHO TRANG DEV: bản ghi thẻ chứng nhận rank (8 phiên bản màu) cho /dev/certificates và /dev/rank-up.
 * Thẻ thật vẽ từ GET /me/profile (pages/Profile/Profile.jsx).
 */

import { MASCOT_BY_ID } from './mascots'

const RANK_KEYS = ['tan_binh', 'dong', 'bac', 'vang', 'bach_kim', 'kim_cuong', 'cao_thu', 'huyen_thoai']
const OWNED_COUNT = 21
const ME = { handle: 'dev.preview' }

const GALLERY_MASCOTS = [2, 9, 7, 14, 15, 27, 10, 20]
const GALLERY_WORDS = [64, 100, 300, 600, 1000, 2000, 3500, 5000]

export function fetchCertificate(rank) {
  const base = {
    fullName: 'Người Xem Thử',
    handle: ME.handle,
    rank: 'bach_kim',
    words: 1000,
    achievedAt: '2026-09-18',
    code: '#WC-2026-00482',
    streak: 31,
    level: 'B1',
    mascots: OWNED_COUNT,
    mascot: MASCOT_BY_ID[1],
  }
  if (!rank || rank === base.rank) return base
  const i = RANK_KEYS.indexOf(rank)
  return { ...base, rank, words: GALLERY_WORDS[i], mascot: MASCOT_BY_ID[GALLERY_MASCOTS[i]], code: `#WC-2026-${String(482 + i * 37).padStart(5, '0')}` }
}

