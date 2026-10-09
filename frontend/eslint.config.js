/*
 * ESLint (flat config) cho frontend.
 *
 * Chốt chặn để dữ liệu giả không quay lại code production (CLAUDE.md, mục Frontend):
 * - Code production (src/, trừ src/dev) KHÔNG được import từ src/dev/** hay tests/**, và không được import đường dẫn nào có
 *   chữ "mock" (no-restricted-imports). Trang dev chỉ được nạp bằng import động trong routes.jsx (nhánh import.meta.env.DEV).
 * - src/dev và tests được dùng dữ liệu mẫu.
 */

import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

const NO_MOCK = {
  patterns: [
    { group: ['**/dev/**', '**/dev', '*/dev/*'], message: 'Code production không được import từ src/dev (chỉ trang dev mới dùng được dữ liệu mẫu).' },
    { group: ['**/tests/**'], message: 'Code production không được import từ tests/.' },
    { regex: '[Mm]ock', message: 'Không dùng dữ liệu giả trong code production: lấy từ server hoặc hiện trạng thái "Sắp ra mắt".' },
  ],
}

export default [
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'screenshots/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/dev/**'],
    rules: { 'no-restricted-imports': ['error', NO_MOCK] },
  },
]
