/*
 * Cấu hình Vitest (`npm test`): test hàm thuần và test component (React Testing Library, jsdom) trong tests/.
 * Dữ liệu mẫu cho test nằm ở tests/fixtures; code production không import từ tests/ (ESLint).
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
  },
})
