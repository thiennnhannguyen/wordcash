/*
 * Hình linh vật đặt trong thẻ: đã có thì vẽ đủ màu, chưa có thì chỉ vẽ hình bóng (giữ dáng, không lộ màu).
 */

import MascotBlob from '../../components/collection/MascotBlob'

export default function MascotArt({ mascot, silhouette = false }) {
  return <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} silhouette={silhouette} shadow={false} size={120} />
}
