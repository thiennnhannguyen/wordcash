/*
 * Trang xem trước địa danh (chỉ môi trường dev, route /dev/landmarks).
 * Lưới mọi địa danh A1, A2 ở 3 trạng thái (done / current / locked), đảo Boss ở kích thước boss, trên nền cỏ của bản đồ.
 * Hàng đầu đặt cột mốc km và một tranh B1 để so phong cách (độ dày viền, bóng đổ, màu).
 * `?px=140` xem cỡ mobile, `?state=current` chỉ xem một trạng thái.
 */

import { useSearchParams } from 'react-router-dom'
import StageLandmark from '../components/academy/landmarks/StageLandmark'
import { LANDMARKS } from '../components/academy/landmarks/landmarkRegistry'

const STATES = ['done', 'current', 'locked']

function Cell({ k, px, state, size = 'normal' }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <StageLandmark landmarkKey={k} px={px} state={state} size={size} number={1} />
      <figcaption className="font-num text-[13px] uppercase text-ink">
        {k ?? 'cột mốc km'} · {state}
      </figcaption>
    </figure>
  )
}

export default function LandmarkGallery() {
  const [params] = useSearchParams()
  const px = Number(params.get('px')) || 210
  const states = params.get('state') ? [params.get('state')] : STATES
  const only = params.get('only')
  const keys = Object.keys(LANDMARKS).filter((k) => /^a[12]_/.test(k) && (!only || k.includes(only)))
  const normal = keys.filter((k) => !k.includes('_boss_'))
  const bosses = keys.filter((k) => k.includes('_boss_'))

  return (
    <div className="min-h-dvh bg-map-grass p-6">
      <h1 className="mb-6 text-[28px]">Địa danh A1 · A2 (dev)</h1>
      <section className="mb-10">
        <h2 className="hud-label mb-3">So phong cách</h2>
        <div className="flex flex-wrap items-end gap-6">
          <Cell k={null} px={px} state="done" />
          <Cell k="big_ben" px={px} state="done" />
          {normal[0] && <Cell k={normal[0]} px={px} state="done" />}
        </div>
      </section>
      {states.length === 1 && (
        <section className="mb-8 flex flex-wrap items-end gap-6">
          {normal.map((k) => (
            <Cell key={k} k={k} px={px} state={states[0]} />
          ))}
          {bosses.map((k) => (
            <Cell key={k} k={k} px={px} state={states[0]} size="boss" />
          ))}
        </section>
      )}
      {states.length > 1 && normal.map((k) => (
        <section key={k} className="mb-8">
          <h2 className="hud-label mb-3">{k}</h2>
          <div className="flex flex-wrap items-end gap-6">
            {states.map((s) => (
              <Cell key={s} k={k} px={px} state={s} />
            ))}
          </div>
        </section>
      ))}
      {states.length > 1 && bosses.map((k) => (
        <section key={k} className="mb-8">
          <h2 className="hud-label mb-3">{k} · boss</h2>
          <div className="flex flex-wrap items-end gap-6">
            {states.map((s) => (
              <Cell key={s} k={k} px={px} state={s} size="boss" />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
