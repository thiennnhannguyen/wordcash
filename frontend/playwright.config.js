/*
 * Kiểm thử đầu-cuối (Playwright) với backend + PostgreSQL thật.
 * `npm run e2e` tự bật backend (e2e/start-backend.sh, cổng 8100, database wordclash_e2e) và Vite (cổng 5180, gọi API thật).
 * Cần: Docker (PostgreSQL 5433, Redis 6379) đang chạy, backend/.venv đã cài, Google Chrome trên máy (channel "chrome").
 */

import { defineConfig } from '@playwright/test'

const WEB_PORT = 5180
const API_PORT = 8100

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'sh e2e/start-backend.sh',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { E2E_API_PORT: String(API_PORT), E2E_WEB_PORT: String(WEB_PORT) },
    },
    {
      command: `npx vite --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { VITE_PORT: String(WEB_PORT), API_PROXY_TARGET: `http://localhost:${API_PORT}`, VITE_USE_MOCK: 'false' },
    },
  ],
})
