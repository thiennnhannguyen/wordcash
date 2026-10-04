/*
 * Kiểm tra bản build production (chạy tự động sau `npm run build` qua script `postbuild`).
 *
 * Quét mọi file trong dist/ và làm build thất bại nếu còn chuỗi chỉ được phép có khi dev:
 * - `__wcAuthStore`: lối vào store auth cho e2e (store/authStore.js, chỉ khi import.meta.env.DEV);
 * - `DEV_SAMPLE`: nhãn dữ liệu mẫu dev (backend/seeds/seed_dev_entries.py).
 * Dùng tay: `node scripts/check-dist.mjs [thư mục]` (mặc định dist).
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const FORBIDDEN = ['__wcAuthStore', 'DEV_SAMPLE']
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
    const content = await readFile(file, 'latin1') // so khớp byte, không phụ thuộc mã hóa của file
    for (const needle of FORBIDDEN) if (content.includes(needle)) found.push(`${relative(root, file)}: ${needle}`)
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
  console.error('check-dist: bản build production chứa chuỗi chỉ dành cho dev:')
  for (const line of found) console.error(`  - ${line}`)
  process.exit(1)
}
console.log(`check-dist: ${files} file sạch (không có ${FORBIDDEN.join(', ')}).`)
