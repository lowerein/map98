// components/sidebar/PlaceLibrary.tsx
"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { Place } from "../types";

interface PlaceLibraryProps {
  places: Place[];
  onPlaceClick: (place: Place) => void;
  onEditPlace?: (place: Place) => void;
  onDeletePlace?: (placeId: string) => void;
  hoveredPlaceId?: string | null;
  onHoverPlace?: (id: string | null) => void;

  // 🚀 核心對接：共享全庫彈窗的觸發開關
  onOpenShareModal?: () => void;
}

export default function PlaceLibrary({
  places,
  onPlaceClick,
  onEditPlace,
  onDeletePlace,
  hoveredPlaceId,
  onHoverPlace,
  onOpenShareModal,
}: PlaceLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 🚀 Style 乙：頂部雙 Tab 狀態
  const [libraryTab, setLibraryTab] = useState<"mine" | "shared">("mine");

  const [expandedLvl1, setExpandedLvl1] = useState<Record<string, boolean>>({});
  const [expandedLvl2, setExpandedLvl2] = useState<Record<string, boolean>>({});

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (hoveredPlaceId && cardRefs.current[hoveredPlaceId]) {
      cardRefs.current[hoveredPlaceId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [hoveredPlaceId]);

  const myCount = useMemo(
    () => places.filter((p) => !p.isShared).length,
    [places],
  );
  const sharedCount = useMemo(
    () => places.filter((p) => p.isShared).length,
    [places],
  );

  // =====================================================================
  // 🚀 動態維度分組引擎 ＋ 全球地域字串大一統海關 (Global Geo-Normaliser)
  // =====================================================================
  const groupedPlaces = useMemo(() => {
    const groups: Record<string, Record<string, Place[]>> = {};

    // 1. 雙重篩選
    const filtered = places.filter((place) => {
      const matchSearch =
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (place.address &&
          place.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTab =
        libraryTab === "mine" ? !place.isShared : !!place.isShared;

      return matchSearch && matchTab;
    });

    // 🌟 全球清洗過濾網
    const normaliseRegion = (
      province: string | null | undefined,
      country: string | null | undefined,
    ) => {
      if (!province) return "其他區域";

      const pStr = province.trim().toLowerCase();
      const cStr = country ? country.trim().toLowerCase() : "";

      // 🇭🇰 香港大一統
      if (cStr.includes("hong kong") || cStr.includes("香港")) {
        if (pStr.includes("new territories") || pStr.includes("新界"))
          return "新界";
        if (pStr.includes("kowloon") || pStr.includes("九龍")) return "九龍";
        if (
          pStr.includes("island") ||
          pStr.includes("香港島") ||
          pStr === "hong kong" ||
          pStr === "香港"
        )
          return "香港島";
      }

      // 🇯🇵 日本大一統
      if (cStr.includes("japan") || cStr.includes("日本")) {
        if (pStr === "tokyo" || pStr.includes("東京都")) return "東京都";
        if (pStr === "osaka" || pStr.includes("大阪")) return "大阪府";
        if (pStr === "kyoto" || pStr.includes("京都")) return "京都府";
        if (pStr === "hokkaido" || pStr.includes("北海道")) return "北海道";
        if (pStr === "okinawa" || pStr.includes("沖繩")) return "沖繩縣";
      }

      // 🇹🇼 台灣大一統
      if (cStr.includes("taiwan") || cStr.includes("台灣")) {
        if (pStr.includes("taipei city") || pStr === "台北市") return "台北市";
        if (pStr.includes("new taipei") || pStr === "新北市") return "新北市";
        if (pStr.includes("taichung") || pStr === "台中市") return "台中市";
        if (pStr.includes("kaohsiung") || pStr === "高雄市") return "高雄市";
      }

      // 🇺🇸 美國大一統
      if (
        cStr.includes("united states") ||
        cStr.includes("美國") ||
        cStr === "us"
      ) {
        if (pStr === "ny" || pStr === "new york") return "New York";
        if (pStr === "ca" || pStr === "california") return "California";
      }

      return province;
    };

    // 2. 執行分組
    filtered.forEach((place) => {
      const lvl1Key =
        libraryTab === "mine"
          ? place.country || "其他國家"
          : `來自 ${place.ownerName || "協作者"}`;

      const lvl2Key =
        libraryTab === "mine"
          ? normaliseRegion(place.province, place.country) // 🔥 注入清洗網！
          : place.country || "未知國家";

      if (!groups[lvl1Key]) groups[lvl1Key] = {};
      if (!groups[lvl1Key][lvl2Key]) groups[lvl1Key][lvl2Key] = [];

      groups[lvl1Key][lvl2Key].push(place);
    });

    return groups;
  }, [places, searchQuery, libraryTab]);

  const toggleLvl1 = (key: string) => {
    setExpandedLvl1((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };
  const toggleLvl2 = (key: string) => {
    setExpandedLvl2((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const expandAll = () => {
    setExpandedLvl1({});
    setExpandedLvl2({});
  };
  const collapseAll = () => {
    const newL1: Record<string, boolean> = {};
    const newL2: Record<string, boolean> = {};
    Object.entries(groupedPlaces).forEach(([k1, sub]) => {
      newL1[k1] = false;
      Object.keys(sub).forEach((k2) => {
        newL2[`${k1}-${k2}`] = false;
      });
    });
    setExpandedLvl1(newL1);
    setExpandedLvl2(newL2);
  };

  if (places.length === 0) {
    return (
      <p className="text-xs text-center text-gray-400 py-8">
        暫時未有已儲存地點 📍
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <div className="sticky top-0 z-[50] transform translate-y-0 bg-white dark:bg-gray-900 -mt-4 -mx-4 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 dark:bg-gray-800/90 rounded-xl mb-3">
          <button
            type="button"
            onClick={() => setLibraryTab("mine")}
            className={`py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              libraryTab === "mine"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs scale-[1.01]"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            <span>👤</span> 我的景點 ({myCount})
          </button>

          <button
            type="button"
            onClick={() => setLibraryTab("shared")}
            className={`py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              libraryTab === "shared"
                ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-xs scale-[1.01]"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            <span>👥</span> 與我共用 ({sharedCount})
          </button>
        </div>

        <input
          type="text"
          placeholder={
            libraryTab === "mine"
              ? "🔍 搜尋我的景點或地址..."
              : "🔍 搜尋好友共給我的地標..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner mb-2"
        />

        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {libraryTab === "mine" ? "📂 國家區域檢視" : "🤝 協作者分類檢視"}
          </span>

          <div className="flex gap-2.5 items-center">
            <button
              type="button"
              onClick={expandAll}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition flex items-center gap-0.5 cursor-pointer"
            >
              <span>🔽</span> 展開全部
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[10px] font-bold text-gray-500 hover:text-gray-700 transition flex items-center gap-0.5 cursor-pointer"
            >
              <span>🔼</span> 收起全部
            </button>

            {libraryTab === "mine" && onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="text-[10px] font-black bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md shadow-2xs transition active:scale-95 flex items-center gap-0.5 cursor-pointer select-none"
                title="與他人共享我的整個景點庫"
              >
                <span>🤝</span> 共享全庫
              </button>
            )}
          </div>
        </div>
      </div>

      {Object.keys(groupedPlaces).length === 0 && (
        <p className="text-xs text-center text-gray-400 py-6 italic">
          {libraryTab === "mine"
            ? "找不到符合條件的地點 🗺️"
            : "暫時未有其他人分享景點給你 🤝"}
        </p>
      )}

      <div className="relative z-0 flex flex-col gap-3">
        {Object.entries(groupedPlaces).map(([lvl1Key, subGroups]) => {
          const isL1Expanded = expandedLvl1[lvl1Key] ?? true;

          return (
            <div
              key={lvl1Key}
              className={`border rounded-xl p-3 transition-colors ${
                libraryTab === "mine"
                  ? "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
                  : "border-purple-100/80 dark:border-purple-950/40 bg-purple-50/20 dark:bg-purple-950/10"
              }`}
            >
              <div
                onClick={() => toggleLvl1(lvl1Key)}
                className={`text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer select-none py-1 ${
                  libraryTab === "mine"
                    ? "text-blue-600 dark:text-blue-400 hover:opacity-80"
                    : "text-purple-700 dark:text-purple-300 font-extrabold hover:opacity-80"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span>{libraryTab === "mine" ? "🌍" : "👤"}</span>
                  <span className="truncate">{lvl1Key}</span>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 transition-transform duration-200">
                  {isL1Expanded ? "▼" : "▶"}
                </span>
              </div>

              {isL1Expanded && (
                <div className="flex flex-col gap-3 pl-1 mt-2">
                  {Object.entries(subGroups).map(([lvl2Key, items]) => {
                    const fullSubKey = `${lvl1Key}-${lvl2Key}`;
                    const isL2Expanded = expandedLvl2[fullSubKey] ?? true;

                    return (
                      <div key={lvl2Key} className="flex flex-col gap-1.5">
                        <div
                          onClick={() => toggleLvl2(fullSubKey)}
                          className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-between cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-400 py-0.5"
                        >
                          <div className="flex items-center gap-1">
                            <span>{libraryTab === "mine" ? "🏙️" : "📍"}</span>{" "}
                            {lvl2Key} ({items.length})
                          </div>
                          <span className="text-[9px] text-gray-400">
                            {isL2Expanded ? "▼" : "▶"}
                          </span>
                        </div>

                        {isL2Expanded && (
                          <div className="flex flex-col gap-1.5 pl-2.5 border-l border-gray-200 dark:border-gray-700 animate-fadeIn">
                            {items.map((place) => {
                              const isThisHovered = hoveredPlaceId === place.id;

                              return (
                                <div
                                  key={place.id}
                                  ref={(el) => {
                                    cardRefs.current[place.id] = el;
                                  }}
                                  onClick={() => onPlaceClick(place)}
                                  onMouseEnter={() => onHoverPlace?.(place.id)}
                                  onMouseLeave={() => onHoverPlace?.(null)}
                                  className={`p-2 rounded-lg transition-all duration-200 cursor-pointer text-sm flex justify-between items-center group border ${
                                    isThisHovered
                                      ? "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 shadow-md ring-2 ring-amber-400/20 translate-x-0.5"
                                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-300"
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <div
                                      className={`font-bold truncate transition-colors ${isThisHovered ? "text-amber-900 dark:text-amber-200" : "text-gray-800 dark:text-gray-200"}`}
                                    >
                                      {place.name}
                                    </div>
                                    {place.address && (
                                      <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                        📍 {place.address}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {libraryTab === "mine" && onEditPlace && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditPlace(place);
                                        }}
                                        title="編輯景點"
                                        className="text-[13px] text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition px-1.5 py-1 cursor-pointer"
                                      >
                                        ✏️
                                      </button>
                                    )}

                                    {libraryTab === "mine" && onDeletePlace && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (
                                            confirm(
                                              `確定要刪除「${place.name}」嗎？`,
                                            )
                                          )
                                            onDeletePlace(place.id);
                                        }}
                                        title="刪除景點"
                                        className="text-[13px] text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition px-1.5 py-1 cursor-pointer"
                                      >
                                        🗑️
                                      </button>
                                    )}

                                    {libraryTab === "shared" && (
                                      <span className="text-[10px] font-extrabold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded shadow-2xs select-none">
                                        🔒 唯讀
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
