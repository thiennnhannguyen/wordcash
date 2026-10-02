/*
 * Thống kê Đấu Trường trên Hồ sơ: tỉ lệ thắng dạng vòng tròn, số trận, chuỗi thắng dài nhất, tốc độ trung bình,
 * combo cao nhất, số lần K.O. và 5 trận gần đây (chấm xanh chanh = thắng, hồng = thua). Số liệu do server tính.
 */

import { Fire, Lightning, Sword, Timer, Trophy } from '@phosphor-icons/react'
import { IconBadge } from '../../components/ui/Icon'
import ProgressRing from '../../components/ui/ProgressRing'
import cx from '../../utils/cx'
import { formatDecimal, formatNumber } from '../../utils/format'
import { StatCard } from './LearningStats'

function Tile({ icon, bg, value, label }) {
  return (
    <div className="flex items-center gap-3 rounded-card border-2 border-line bg-surface p-3">
      <IconBadge icon={icon} bg={bg} size="sm" shadow={false} />
      <div className="min-w-0">
        <div className="font-num text-2xl leading-none">{value}</div>
        <div className="mt-1 font-display text-[13px] font-bold uppercase leading-tight tracking-wide text-muted">{label}</div>
      </div>
    </div>
  )
}

export default function ArenaStats({ arena }) {
  const rate = Math.round((arena.wins / arena.matches) * 100)
  return (
    <StatCard title="Đấu Trường" icon={Sword} iconBg="orange">
      <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-6">
        <div className="flex flex-col items-center gap-2">
          <ProgressRing value={arena.wins} max={arena.matches} size={156} stroke={20} tone="accent" label={`Tỉ lệ thắng ${rate}%`}>
            <span className="flex flex-col items-center">
              <span className="font-num text-[38px] leading-none">{rate}%</span>
              <span className="font-display text-[13px] font-bold uppercase text-muted">Tỉ lệ thắng</span>
            </span>
          </ProgressRing>
          <p className="font-display text-sm font-bold uppercase">
            <span className="font-num text-accent-deep">{arena.wins}</span> thắng · <span className="font-num text-danger-deep">{arena.losses}</span> thua
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3">
            <Tile icon={Sword} bg="orange" value={formatNumber(arena.matches)} label="Số trận" />
            <Tile icon={Fire} bg="gold" value={arena.bestWinStreak} label="Chuỗi thắng dài nhất" />
            <Tile icon={Timer} bg="sky" value={`${formatDecimal(arena.avgSeconds)}s`} label="Tốc độ trung bình" />
            <Tile icon={Lightning} bg="primary" value={`x${arena.bestCombo}`} label="Combo cao nhất" />
            <Tile icon={Trophy} bg="danger" value={arena.knockouts} label="Số lần K.O." />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-sm font-bold uppercase tracking-wide">Trận gần đây</span>
            <ol className="flex items-center gap-1.5" aria-label="5 trận gần đây, cũ tới mới">
              {arena.recent.map((r, i) => (
                <li
                  key={i}
                  className={cx('grid size-8 place-items-center rounded-pill border-thick border-line font-display text-[13px] font-bold', r === 'win' ? 'bg-accent' : 'bg-danger')}
                  aria-label={r === 'win' ? 'Thắng' : 'Thua'}
                >
                  {r === 'win' ? 'T' : 'B'}
                </li>
              ))}
            </ol>
            <span className="text-caption text-muted">cũ → mới</span>
          </div>
        </div>
      </div>
    </StatCard>
  )
}
