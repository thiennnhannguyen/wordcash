/*
 * DỮ LIỆU MẪU CHO TRANG DEV: luật Đấu Trường dùng để vẽ giao diện Đấu Trường giả (src/dev/arena). Khi làm Đấu Trường thật,
 * các con số này phải lấy từ server (backend core/config.py: MATCH_HP, DMG_*, FAST_MS, COMBO_MULT, WRONG_SELF_DMG).
 */

// Luật Đấu Trường. Server dùng cùng bộ số (đặt trong config phía backend) để tính sát thương;
// client chỉ dùng để vẽ thanh máu, đồng hồ combo, đồng hồ đếm ngược
export const ARENA = {
  MAX_HP: 100,
  MAX_QUESTIONS: 20,
  BASE_DAMAGE: 10,
  FAST_BONUS: 5,
  FAST_MS: 2000,
  CRIT_STREAK: 3,
  CRIT_MULTIPLIER: 1.5,
  WRONG_SELF_DAMAGE: 5,
  ROUND_SECONDS: 10,
  LOW_HP: 30,
  RECONNECT_SECONDS: 15,
}
