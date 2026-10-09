/* Thiết lập chung cho Vitest: matcher của jest-dom, dọn DOM sau mỗi test. */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
