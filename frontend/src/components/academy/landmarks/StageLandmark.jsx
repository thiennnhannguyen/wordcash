/*
 * Hiển thị địa danh của một chặng (hoặc Trận Boss) trên bệ đảo, theo thứ tự ưu tiên:
 * (a) `image` (landmark_image) có giá trị → ảnh PNG (ảnh đã gồm cả đảo);
 * (b) `landmarkKey` có trong landmarkRegistry → tranh SVG;
 * (c) không có gì → cột mốc km (phương án dự phòng, đầu đỏ, thân trắng, số chặng ở giữa).
 * `state`: "done" | "current" | "locked". `size`: "normal" | "boss". Điểm neo là tâm mặt đảo (xem LandmarkIsland).
 */

import LandmarkIsland, { islandMetrics } from './LandmarkIsland'
import { getLandmark } from './landmarkRegistry'
import { LandmarkArt } from './b1/UkLandmarks'

/** Kích thước và điểm neo để đặt StageLandmark trên bản đồ. */
export function stageLandmarkMetrics({ landmarkKey, px, size = 'normal' }) {
  const entry = getLandmark(landmarkKey)
  return islandMetrics(px, size, entry?.ground ?? 0.94)
}

export default function StageLandmark({ landmarkKey, image, name, number, px, size = 'normal', state = 'done', className }) {
  const entry = getLandmark(landmarkKey)
  const label = name ?? undefined

  if (image) {
    const m = islandMetrics(px, size, 0.8)
    return (
      <LandmarkIsland px={px} size={size} state={state} ground={0.8} showIsland={false} className={className}>
        <img src={image} alt={label ?? ''} width={m.art} height={m.art} className="size-full object-contain" draggable="false" />
      </LandmarkIsland>
    )
  }

  if (entry) {
    const { Component } = entry
    const m = islandMetrics(px, size, entry.ground)
    return (
      <LandmarkIsland
        px={px}
        size={size}
        state={state}
        surface={entry.surface}
        ground={entry.ground}
        lockedStyle={entry.legacy ? 'silhouette' : 'fade'}
        currentStyle={entry.legacy ? 'none' : 'halo'}
        className={className}
      >
        <Component size={m.art} />
      </LandmarkIsland>
    )
  }

  const m = islandMetrics(px, size, 0.94)
  return (
    <LandmarkIsland px={px} size={size} state={state} ground={0.94} className={className}>
      <LandmarkArt kind="milestone" size={m.art} number={number} />
    </LandmarkIsland>
  )
}
