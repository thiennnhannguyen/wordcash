/*
 * Kiểm tra bản build production (chạy tự động sau `npm run build` qua script `postbuild`).
 *
 * Quét mọi file trong dist/ và làm build thất bại nếu còn chuỗi chỉ được phép có khi dev hoặc dữ liệu giả:
 * - `__wcAuthStore`: lối vào store auth cho e2e (store/authStore.js, chỉ khi import.meta.env.DEV);
 * - `DEV_SAMPLE`: nhãn dữ liệu mẫu dev (backend/seeds/seed_dev_entries.py);
 * - dấu vết dữ liệu giả cũ: "Kẹo Dẻo" (linh vật cố định), "12.400" (số người học giả), "128 người" (số người online giả),
 *   "mockLobby", "VITE_USE_MOCK". So khớp theo byte UTF-8 (chuỗi có dấu tiếng Việt).
 * Dùng tay: `node scripts/check-dist.mjs [thư mục]` (mặc định dist).
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const FORBIDDEN = ['__wcAuthStore', 'DEV_SAMPLE', 'Kẹo Dẻo', '12.400', '128 người', 'mockLobby', 'VITE_USE_MOCK']
const NEEDLES = FORBIDDEN.map((text) => ({ text, bytes: Buffer.from(text, 'utf8') }))
const root = process.argv[2] ?? 'dist'

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}

let files = 0
const found = []
try {
  for await (const file of walk(root)) {
    files += 1
    const content = await readFile(file) // Buffer: so khớp byte UTF-8, không phụ thuộc mã hóa của file
    for (const needle of NEEDLES) if (content.includes(needle.bytes)) found.push(`${relative(root, file)}: ${needle.text}`)
  }
} catch (error) {
  console.error(`check-dist: không đọc được ${root}/ (${error.code ?? error.message}). Chạy vite build trước.`)
  process.exit(1)
}

if (files === 0) {
  console.error(`check-dist: ${root}/ trống.`)
  process.exit(1)
}
if (found.length) {
  console.error('check-dist: bản build production chứa chuỗi chỉ dành cho dev hoặc dữ liệu giả:')
  for (const line of found) console.error(`  - ${line}`)
  process.exit(1)
}
console.log(`check-dist: ${files} file sạch (không có ${FORBIDDEN.join(', ')}).`)
