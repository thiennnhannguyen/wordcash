/*
 * Cấu hình Playwright cho script chụp ảnh (`npm run screenshots`), tách khỏi `npm run e2e`.
 * Dùng lại backend + Vite của e2e (cổng 8100/5180, ENV=e2e; backend tự seed 3 tài khoản dev_normal / dev_shaky / dev_new),
 * chỉ chạy các file *.shots.js trong thư mục này (accounts.shots.js đăng nhập bằng các tài khoản đó).
 * Ảnh lưu vào E2E_SHOTS (mặc định frontend/screenshots/, đã gitignore).
 */

import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'
import base from '../../playwright.config.js'

const root = fileURLToPath(new URL('../..', import.meta.url))
process.env.E2E_SHOTS ??= `${root}screenshots`
mkdirSync(process.env.E2E_SHOTS, { recursive: true })

export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: '**/*.shots.js',
  timeout: 1_200_000,
  webServer: base.webServer.map((server) => ({ ...server, cwd: root })),
})
