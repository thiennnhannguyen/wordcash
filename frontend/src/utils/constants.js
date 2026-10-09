/*
 * Hằng số TRÌNH BÀY (không phải luật game): tên và màu rank, tên/màu/số sao độ hiếm, thứ tự, mã cấp, tên sự kiện socket,
 * ghi công nguồn dữ liệu.
 *
 * Luật game (mốc rank, tỉ lệ quay, pity, giá đổi mảnh, mảnh khi trùng, ngưỡng qua bài, số linh vật…) KHÔNG đặt ở đây: đọc từ
 * server (GET /public/stats → store/rulesStore.js; GET /collection/rates → store/ratesStore.js).
 */

export const RANKS = [
  { key: 'tan_binh', name: 'Tân Binh', color: 'var(--color-rank-tan-binh)' },
  { key: 'dong', name: 'Đồng', color: 'var(--color-rank-dong)' },
  { key: 'bac', name: 'Bạc', color: 'var(--color-rank-bac)' },
  { key: 'vang', name: 'Vàng', color: 'var(--color-rank-vang)' },
  { key: 'bach_kim', name: 'Bạch Kim', color: 'var(--color-rank-bach-kim)' },
  { key: 'kim_cuong', name: 'Kim Cương', color: 'var(--color-rank-kim-cuong)' },
  { key: 'cao_thu', name: 'Cao Thủ', color: 'var(--color-rank-cao-thu)' },
  { key: 'huyen_thoai', name: 'Huyền Thoại', color: 'var(--color-rank-huyen-thoai)' },
]

export const RANK_BY_KEY = Object.fromEntries(RANKS.map((rank) => [rank.key, rank]))

export const RARITIES = {
  common: { name: 'Thường', color: 'var(--color-rarity-common)', stars: 0 },
  rare: { name: 'Hiếm', color: 'var(--color-rarity-rare)', stars: 1 },
  epic: { name: 'Sử Thi', color: 'var(--color-rarity-epic)', stars: 2 },
  legendary: { name: 'Huyền Thoại', color: 'var(--color-rarity-legendary)', stars: 3 },
}
// Thứ tự hiếm dần
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary']

// Mã cấp độ CEFR (tên cấp lấy từ server: GET /academy/roadmap)
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const SOCKET_EVENTS = {
  JOIN_QUEUE: 'join_queue',
  LEAVE_QUEUE: 'leave_queue',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  MATCH_FOUND: 'match_found',
  ROUND_START: 'round_start',
  SUBMIT_ANSWER: 'submit_answer',
  ROUND_RESULT: 'round_result',
  MATCH_END: 'match_end',
}

// Ghi công nguồn dữ liệu kho từ theo yêu cầu giấy phép (docs/data-sources.md). Hiện ở chân trang Landing.
export const DATA_CREDITS = [
  'Danh sách từ dựa trên CEFR-J Wordlist (Tono Laboratory, Tokyo University of Foreign Studies).',
  'Phiên âm dựa trên CMU Pronouncing Dictionary (Carnegie Mellon University).',
]

// Trang Giới thiệu (/about): chi tiết từng nguồn, khớp docs/data-sources.md
export const DATA_SOURCES = [
  {
    key: 'cefrj',
    name: 'CEFR-J Wordlist',
    owner: 'Tono Laboratory, Tokyo University of Foreign Studies',
    use: 'Danh sách từ và nhãn trình độ (A1…) để chọn từ cho lộ trình.',
    license: 'Dùng miễn phí cho nghiên cứu và thương mại với điều kiện trích dẫn đúng.',
    url: 'https://www.cefr-j.org/download.html',
  },
  {
    key: 'cmudict',
    name: 'CMU Pronouncing Dictionary',
    owner: 'Carnegie Mellon University',
    use: 'Phiên âm IPA (Anh-Mỹ) của mục từ.',
    license: 'Giấy phép kiểu BSD 2 điều khoản.',
    url: 'https://github.com/cmusphinx/cmudict',
  },
]
