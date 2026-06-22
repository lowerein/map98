// lib/utils/sidebar-utils.ts
import { Place } from "@/app/components/types";

// =====================================================================
// 🌍 全球地域大一統清洗網 (Global Geo-Normaliser)
// =====================================================================
export const normaliseRegion = (province: string | null | undefined, country: string | null | undefined) => {
  if (!province) return "其他區域";
  
  const pStr = province.trim().toLowerCase();
  const cStr = country ? country.trim().toLowerCase() : "";

  // 🇭🇰 香港
  if (cStr.includes("hong kong") || cStr.includes("香港")) {
    if (pStr.includes("new territories") || pStr.includes("新界")) return "新界";
    if (pStr.includes("kowloon") || pStr.includes("九龍")) return "九龍";
    if (pStr.includes("island") || pStr.includes("香港島") || pStr === "hong kong" || pStr === "香港") return "香港島";
  }

  // 🇯🇵 日本
  if (cStr.includes("japan") || cStr.includes("日本")) {
    if (pStr === "tokyo" || pStr.includes("東京都")) return "東京都";
    if (pStr === "osaka" || pStr.includes("大阪")) return "大阪府";
    if (pStr === "kyoto" || pStr.includes("京都")) return "京都府";
    if (pStr === "hokkaido" || pStr.includes("北海道")) return "北海道";
    if (pStr === "okinawa" || pStr.includes("沖繩")) return "沖繩縣";
  }

  // 🇹🇼 台灣
  if (cStr.includes("taiwan") || cStr.includes("台灣")) {
    if (pStr.includes("taipei city") || pStr === "台北市") return "台北市";
    if (pStr.includes("new taipei") || pStr === "新北市") return "新北市";
    if (pStr.includes("taichung") || pStr === "台中市") return "台中市";
    if (pStr.includes("kaohsiung") || pStr === "高雄市") return "高雄市";
  }

  return province;
};

// =====================================================================
// 📂 通用側邊欄分組器 (由 User 分類先 -> 國家 -> Province)
// =====================================================================
export type SidebarGroupTree = Record<string, Record<string, Record<string, Place[]>>>;

export const buildSidebarGroups = (
  list: Place[], 
  searchQuery: string, 
  isSharedPool: boolean
): SidebarGroupTree => {
  const groups: SidebarGroupTree = {};

  const filtered = list.filter(place => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      place.name.toLowerCase().includes(q) ||
      (place.address && place.address.toLowerCase().includes(q))
    );
  });

  filtered.forEach((place) => {
    const p = place as any;
    const countryName = place.country || "其他國家";
    const cleanProvince = normaliseRegion(place.province, place.country);

    let l1 = ""; let l2 = ""; let l3 = "";

    if (isSharedPool) {
      // 👥 共用模式 (嚴格 3 層) -> L1: 協作者 | L2: 國家 | L3: 省份區域
      const collab = p.owner?.name || p.ownerName || p.owner?.email?.split('@')[0] || "協作者";
      l1 = `來自 ${collab}`;
      l2 = countryName;
      l3 = cleanProvince;
    } else {
      // 👤 我的景點 (實質 2 層) -> L1: 國家 | L2: 省份區域 | L3: "_DIRECT_" (魔法跳板)
      l1 = countryName;
      l2 = cleanProvince;
      l3 = "_DIRECT_"; 
    }

    if (!groups[l1]) groups[l1] = {};
    if (!groups[l1][l2]) groups[l1][l2] = {};
    if (!groups[l1][l2][l3]) groups[l1][l2][l3] = [];
    
    groups[l1][l2][l3].push(place);
  });

  return groups;
};