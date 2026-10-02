/*
 * Ánh xạ `landmark_key` (server trả trong từng chặng) → tranh SVG của địa danh.
 * `ground`: vị trí chân công trình theo chiều cao khung (0–1); `surface`: mặt đảo; `boss`: đảo Trận Boss lớn gấp 1.5 lần.
 * Tranh B1 (Vương quốc Anh) vẽ trước theo khung 200×200, giữ kiểu riêng khi khóa (chỉ thấy bóng) và khi đang tới (tia sáng).
 * Frontend không gán địa danh theo số chặng: chỉ tra khóa ở đây; khóa lạ thì StageLandmark dùng cột mốc km.
 */

import { createElement } from 'react'
import { LandmarkArt } from './b1/UkLandmarks'
import HoGuom from './a1/HoGuom'
import VanMieu from './a1/VanMieu'
import ChuaMotCot from './a1/ChuaMotCot'
import PhoCo from './a1/PhoCo'
import MuCangChai from './a1/MuCangChai'
import CauLongBien from './a1/CauLongBien'
import ChoDongXuan from './a1/ChoDongXuan'
import Fansipan from './a1/Fansipan'
import TrangAn from './a1/TrangAn'
import MaPiLeng from './a1/MaPiLeng'
import BossHaLong from './a1/BossHaLong'
import DaiNoiHue from './a2/DaiNoiHue'
import ChuaThienMu from './a2/ChuaThienMu'
import HoiAn from './a2/HoiAn'
import CauRong from './a2/CauRong'
import PhongNha from './a2/PhongNha'
import MuiNe from './a2/MuiNe'
import GaDaLat from './a2/GaDaLat'
import ChoBenThanh from './a2/ChoBenThanh'
import NhaThoDucBa from './a2/NhaThoDucBa'
import ChoNoiCaiRang from './a2/ChoNoiCaiRang'
import BossCauVang from './a2/BossCauVang'

const VN = (Component, extra) => ({ Component, ground: 222 / 240, surface: 'grass', ...extra })
const UK = (kind) => ({
  Component: ({ size }) => createElement(LandmarkArt, { kind, size }),
  ground: 0.94,
  surface: 'grass',
  legacy: true,
})

export const LANDMARKS = {
  // A1 · Việt Nam – Miền Bắc
  a1_ho_guom: VN(HoGuom),
  a1_van_mieu: VN(VanMieu),
  a1_chua_mot_cot: VN(ChuaMotCot),
  a1_pho_co: VN(PhoCo),
  a1_mu_cang_chai: VN(MuCangChai),
  a1_cau_long_bien: VN(CauLongBien),
  a1_cho_dong_xuan: VN(ChoDongXuan),
  a1_fansipan: VN(Fansipan),
  a1_trang_an: VN(TrangAn),
  a1_ma_pi_leng: VN(MaPiLeng),
  a1_boss_ha_long: VN(BossHaLong, { surface: 'water' }),
  // A2 · Việt Nam – Miền Trung & Nam
  a2_dai_noi_hue: VN(DaiNoiHue),
  a2_chua_thien_mu: VN(ChuaThienMu),
  a2_hoi_an: VN(HoiAn),
  a2_cau_rong: VN(CauRong),
  a2_phong_nha: VN(PhongNha),
  a2_mui_ne: VN(MuiNe),
  a2_da_lat: VN(GaDaLat),
  a2_ben_thanh: VN(ChoBenThanh),
  a2_nha_tho_duc_ba: VN(NhaThoDucBa),
  a2_cho_noi_cai_rang: VN(ChoNoiCaiRang),
  a2_boss_cau_vang: VN(BossCauVang, { surface: 'mountain' }),
  // B1 · Vương quốc Anh
  tower_bridge: UK('tower_bridge'),
  london_eye: UK('london_eye'),
  big_ben: UK('big_ben'),
  buckingham: UK('buckingham'),
  oxford: UK('oxford'),
  stonehenge: UK('stonehenge'),
  bath: UK('bath'),
  edinburgh: UK('edinburgh'),
  highlands: UK('highlands'),
}

export const getLandmark = (key) => (key ? LANDMARKS[key] ?? null : null)
