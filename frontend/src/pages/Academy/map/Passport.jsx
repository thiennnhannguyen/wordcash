/*
 * Widget "Hộ chiếu": cuốn sổ mở ra hai trang, mỗi địa danh đã đến có một con dấu (tròn hoặc vuông, nghiêng,
 * màu mực khác nhau), ô chưa có dấu để nét đứt. Danh sách con dấu và số địa danh do server trả.
 */

import cx from '../../../utils/cx'

function Stamp({ name, style }) {
  const color = `var(--color-${style.ink})`
  // Xuống dòng theo "\n" nếu server ghi sẵn, nếu không thì theo khoảng trắng
  const words = name.includes('\n') ? name.split('\n') : name.split(' ')
  return (
    <div
      className={cx('grid place-items-center border-[3px] text-center mix-blend-multiply', style.shape === 'round' ? 'size-[62px] rounded-pill' : 'h-[50px] w-[70px] rounded-[8px]')}
      style={{ borderColor: color, color, transform: `rotate(${style.tilt}deg)`, background: `color-mix(in srgb, ${color} 8%, transparent)` }}
      title={name.replace('\n', ' ')}
    >
      <div className={cx('grid size-[calc(100%-6px)] place-items-center border-[1.5px] border-dashed', style.shape === 'round' ? 'rounded-pill' : 'rounded-[5px]')} style={{ borderColor: color }}>
        <span className="font-display text-[13px] font-bold uppercase leading-[1.05]">
          {words.map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

function Slot({ entry, index }) {
  if (entry.visited) return <Stamp name={entry.stamp} style={entry.style} />
  return (
    <div
      className={cx(
        'grid size-[54px] place-items-center rounded-pill border-2 border-dashed font-num text-[13px]',
        entry.target ? 'border-primary text-primary' : 'border-muted/50 text-muted',
      )}
      title={entry.target ? `Đang tới: ${entry.place}` : undefined}
    >
      {entry.target ? '?' : index + 1}
    </div>
  )
}

function Page({ entries, offset, pageNumber, side }) {
  return (
    <div
      className={cx('relative grid grid-cols-2 place-items-center gap-y-1.5 bg-bg px-1 py-2.5', side === 'left' ? 'rounded-l-[10px]' : 'rounded-r-[10px]')}
      style={{
        backgroundImage:
          'repeating-radial-gradient(circle at 50% 120%, transparent 0 7px, color-mix(in srgb, var(--color-primary) 7%, transparent) 7px 8px)',
      }}
    >
      {entries.map((e, i) => (
        <div key={e.key} className="grid h-[64px] w-full place-items-center">
          <Slot entry={e} index={offset + i} />
        </div>
      ))}
      <span className="font-num col-start-2 self-end justify-self-end pr-1.5 text-[13px] text-muted">{pageNumber}</span>
    </div>
  )
}

export function passportEntries(map, withBoss = true) {
  const list = map.stages.map((s) => ({
    key: s.id,
    stamp: s.stamp,
    place: s.landmark_name,
    style: s.stampStyle,
    visited: s.visit.status === 'visited',
    target: s.visit.status === 'target',
  }))
  if (withBoss) list.push({ key: 'boss', stamp: map.boss.stamp, place: map.boss.landmark_name, style: map.boss.stampStyle, visited: map.boss.status === 'done', target: false })
  return list
}

export default function Passport({ map, className, withBoss = true, caption = true }) {
  const entries = passportEntries(map, withBoss)
  const half = Math.ceil(entries.length / 2)
  return (
    <div className={className}>
      <div className="relative rounded-[14px] border-thick border-line bg-primary p-1.5 shadow-hard-sm">
        <div className="relative grid grid-cols-2">
          <Page entries={entries.slice(0, half)} offset={0} pageNumber={2} side="left" />
          <Page entries={entries.slice(half)} offset={half} pageNumber={3} side="right" />
          {/* Gáy sổ */}
          <span className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-ink)_14%,transparent),transparent)]" />
          <span className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-line/30" />
        </div>
      </div>
      {caption && (
      <p className="mt-3 text-caption font-semibold text-ink">
        <span className="font-num">
          {map.passport.visited}/{map.passport.total}
        </span>{' '}
        địa danh {map.level.code} ·{' '}
        <span className="font-num">
          {map.passport.journeyVisited}/{map.passport.journeyTotal}
        </span>{' '}
        toàn hành trình
      </p>
      )}
    </div>
  )
}
