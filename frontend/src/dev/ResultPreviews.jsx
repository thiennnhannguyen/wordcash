/*
 * Trang dev /dev/results: xem nhanh các màn kết quả dựng sẵn bằng dữ liệu mẫu (src/dev/fixtures/results.js), thay cho
 * tham số `?preview=` cũ của các trang production.
 * `?kind=unit-pass|unit-fail|boss-win|boss-lose|daily-perfect|daily-milestone|daily-mistake`.
 */

import { useSearchParams } from 'react-router-dom'
import { FailResult, PassResult } from '../pages/Academy/UnitTest'
import { LoseResult, WinResult } from '../pages/Academy/BossBattle'
import DailyCheckResult from '../pages/DailyCheck/DailyCheckResult'
import { PREVIEW_BOSS, PREVIEW_DAILY, PREVIEW_LESSON, PREVIEW_UNIT } from './fixtures/results'

const KINDS = ['unit-pass', 'unit-fail', 'boss-win', 'boss-lose', 'daily-perfect', 'daily-milestone', 'daily-mistake']

export default function ResultPreviews() {
  const [params, setParams] = useSearchParams()
  const kind = KINDS.includes(params.get('kind')) ? params.get('kind') : KINDS[0]
  const [group, variant] = kind.split('-')
  let screen
  if (group === 'unit') screen = variant === 'pass' ? <PassResult result={PREVIEW_UNIT.pass} lesson={PREVIEW_LESSON} /> : <FailResult result={PREVIEW_UNIT.fail} lesson={PREVIEW_LESSON} onReview={() => {}} />
  else if (group === 'boss') screen = variant === 'win' ? <WinResult result={PREVIEW_BOSS.win} /> : <LoseResult result={PREVIEW_BOSS.lose} />
  else screen = <DailyCheckResult result={PREVIEW_DAILY[variant]} />
  return (
    <>
      <nav className="fixed left-2 top-2 z-[300] flex flex-wrap gap-1 rounded-[14px] border-2 border-dashed border-line/40 bg-bg p-1.5" aria-label="Chọn màn (dev)">
        {KINDS.map((k) => (
          <button key={k} type="button" onClick={() => setParams({ kind: k })} className={`h-9 rounded-pill border-2 border-line px-2.5 font-display text-xs font-bold uppercase ${k === kind ? 'bg-ink text-white' : 'bg-surface'}`}>
            {k}
          </button>
        ))}
      </nav>
      {screen}
    </>
  )
}
