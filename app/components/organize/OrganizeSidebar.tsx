// components/organize/OrganizeSidebar.tsx
"use client";
import { useMemo, useState, useCallback } from "react";
import { Place } from "../types";
import PlaceDetailsPanel from "../sidebar/PlaceDetailsPanel";

interface OrganizeSidebarProps {
  availablePlaces?: Place[];
  scheduledPlaceIds?: Set<string>;
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;
  hoveredPlaceId: string | null;
  setHoveredPlaceId: (id: string | null) => void;
  dragZoneRef: React.RefObject<HTMLDivElement | null>;
  showList: boolean;
  listWidth: number;
  onFlyToPlace: (place: Place) => void;
  onEditPlace?: (place: Place) => void;
}

export default function OrganizeSidebar({
  availablePlaces = [],
  scheduledPlaceIds = new Set(),
  selectedPlace,
  setSelectedPlace,
  hoveredPlaceId,
  setHoveredPlaceId,
  dragZoneRef,
  showList,
  listWidth,
  onFlyToPlace,
  onEditPlace,
}: OrganizeSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCountries, setExpandedCountries] = useState<
    Record<string, boolean>
  >({});
  const [expandedProvinces, setExpandedProvinces] = useState<
    Record<string, boolean>
  >({});

  // =====================================================================
  // 🚀 1. 智能資產大分流：把傳進來的 Places 劏開成「我的」與「契哥給的」
  // =====================================================================
  const { myPlaces, sharedPlaces } = useMemo(() => {
    const mine: Place[] = [];
    const shared: Place[] = [];

    availablePlaces.forEach((p) => {
      if ((p as any).isShared) shared.push(p);
      else mine.push(p);
    });

    return { myPlaces: mine, sharedPlaces: shared };
  }, [availablePlaces]);

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

  // =====================================================================
  // 🚀 2. 通用降維分組器：傳入清單與模式，自動洗出對應的 Level 1 與 Level 2
  // =====================================================================
  const buildGroups = useCallback(
    (list: Place[], isSharedPool: boolean) => {
      const groups: Record<string, Record<string, Place[]>> = {};

      const filtered = list.filter(
        (place) =>
          place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (place.address &&
            place.address.toLowerCase().includes(searchQuery.toLowerCase())),
      );

      filtered.forEach((place) => {
        // 我的池 L1 是國家；共用池 L1 是「協作者名字」
        const lvl1Key = isSharedPool
          ? `來自 ${(place as any).ownerName || "協作者"}`
          : place.country || "其他國家";

        // 我的池 L2 是區域；共用池 L2 退回「國家」
        const lvl2Key = isSharedPool
          ? place.country || "未知國家"
          : normaliseRegion(place.province, place.country);

        if (!groups[lvl1Key]) groups[lvl1Key] = {};
        if (!groups[lvl1Key][lvl2Key]) groups[lvl1Key][lvl2Key] = [];

        groups[lvl1Key][lvl2Key].push(place);
      });

      return groups;
    },
    [searchQuery],
  );

  const myGrouped = useMemo(
    () => buildGroups(myPlaces, false),
    [myPlaces, buildGroups],
  );
  const sharedGrouped = useMemo(
    () => buildGroups(sharedPlaces, true),
    [sharedPlaces, buildGroups],
  );

  const toggleCountry = (country: string) => {
    setExpandedCountries((prev) => ({
      ...prev,
      [country]: !(prev[country] ?? true),
    }));
  };

  const toggleProvince = (key: string) => {
    setExpandedProvinces((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const expandAll = () => {
    setExpandedCountries({});
    setExpandedProvinces({});
  };

  const collapseAll = () => {
    const newCountries: Record<string, boolean> = {};
    const newProvinces: Record<string, boolean> = {};

    const collapsePool = (pool: Record<string, Record<string, Place[]>>) => {
      Object.entries(pool).forEach(([k1, sub]) => {
        newCountries[k1] = false;
        Object.keys(sub).forEach((k2) => {
          newProvinces[`${k1}-${k2}`] = false;
        });
      });
    };

    collapsePool(myGrouped);
    collapsePool(sharedGrouped);
    setExpandedCountries(newCountries);
    setExpandedProvinces(newProvinces);
  };

  // 通用卡片渲染迴圈
  const renderPlaceCards = (items: Place[], isReadonly: boolean) => {
    return items.map((place) => {
      const isSelected = selectedPlace?.id === place.id;
      const isHover = hoveredPlaceId === place.id;
      const isScheduled = scheduledPlaceIds.has(place.id);
      const customColor = place.color || "#3b82f6";

      return (
        <div
          key={place.id}
          data-place-id={place.id}
          data-title={place.name}
          onClick={() => setSelectedPlace(place)}
          onDoubleClick={() => onFlyToPlace(place)}
          onMouseEnter={() => setHoveredPlaceId(place.id)}
          onMouseLeave={() => setHoveredPlaceId(null)}
          style={{ borderLeftWidth: "6px", borderLeftColor: customColor }}
          className={`fc-event relative p-2.5 border rounded-md cursor-grab shadow-sm transition-all duration-200 group ${
            isSelected
              ? "border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-white font-bold ring-2 ring-blue-500/20"
              : isHover
                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                : isScheduled
                  ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-gray-400 dark:text-gray-500"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-blue-300 dark:hover:border-blue-500"
          }`}
        >
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: customColor }}
              />
              <span
                className={`font-bold text-xs md:text-sm truncate ${isScheduled ? "line-through opacity-70" : ""}`}
              >
                {place.name}
              </span>
            </div>

            {isScheduled && (
              <span className="shrink-0 text-[9px] font-black bg-emerald-500 dark:bg-emerald-600 text-white px-1 rounded select-none">
                ✓ 已排
              </span>
            )}
          </div>

          {place.address && (
            <div className="text-[10px] opacity-70 truncate pointer-events-none pl-3.5">
              📍 {place.address}
            </div>
          )}

          {/* 毛玻璃操作組 */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/95 dark:bg-gray-800/95 p-1 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 backdrop-blur-xs"
          >
            {/* 🚀 絕殺 3：主權審查！如果是契哥給的共用點，沒收 Edit 按鈕！ */}
            {!isReadonly && onEditPlace && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPlace(place);
                }}
                className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 rounded transition text-xs shadow-2xs cursor-pointer"
                title="編輯此景點"
              >
                ✏️
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFlyToPlace(place);
              }}
              className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 rounded transition text-xs shadow-2xs cursor-pointer"
              title="在地圖定位"
            >
              🎯
            </button>
          </div>
        </div>
      );
    });
  };

  // 通用樹狀層級渲染迴圈
  const renderGroupTree = (
    pool: Record<string, Record<string, Place[]>>,
    isReadonlyPool: boolean,
  ) => {
    if (Object.keys(pool).length === 0) return null;

    return Object.entries(pool).map(([lvl1Key, subGroups]) => {
      const isL1Expanded = expandedCountries[lvl1Key] ?? true;

      return (
        <div
          key={lvl1Key}
          className={`border rounded-lg p-2.5 transition-colors ${
            isReadonlyPool
              ? "border-purple-100 dark:border-purple-950/50 bg-purple-50/15 dark:bg-purple-950/10"
              : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
          }`}
        >
          <div
            onClick={() => toggleCountry(lvl1Key)}
            className={`text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer select-none hover:opacity-80 py-0.5 ${
              isReadonlyPool
                ? "text-purple-700 dark:text-purple-400 font-extrabold"
                : "text-blue-600 dark:text-blue-400"
            }`}
          >
            <span className="flex items-center gap-1 truncate pr-2">
              <span>{isReadonlyPool ? "👤" : "🌍"}</span>
              <span className="truncate">{lvl1Key}</span>
            </span>
            <span className="text-[10px] text-gray-400 shrink-0">
              {isL1Expanded ? "▼" : "▶"}
            </span>
          </div>

          {isL1Expanded && (
            <div className="flex flex-col gap-2.5 pl-1 mt-2">
              {Object.entries(subGroups).map(([lvl2Key, items]) => {
                const fullSubKey = `${lvl1Key}-${lvl2Key}`;
                const isL2Expanded = expandedProvinces[fullSubKey] ?? true;

                return (
                  <div key={lvl2Key} className="flex flex-col gap-1">
                    <div
                      onClick={() => toggleProvince(fullSubKey)}
                      className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-between cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-400 py-0.5"
                    >
                      <span>
                        {isReadonlyPool ? "📍" : "🏙️"} {lvl2Key} ({items.length}
                        )
                      </span>
                      <span className="text-[8px] text-gray-400">
                        {isL2Expanded ? "▼" : "▶"}
                      </span>
                    </div>

                    {isL2Expanded && (
                      <div className="flex flex-col gap-1.5 pl-2 border-l border-gray-200 dark:border-gray-700 mt-1 animate-fadeIn">
                        {renderPlaceCards(items, isReadonlyPool)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 flex flex-col shrink-0 overflow-hidden h-full ${showList ? "border-r border-gray-200 dark:border-gray-800" : "!w-0 p-0 opacity-0"}`}
      style={{ width: showList ? `${listWidth}px` : "0px" }}
    >
      <div className="w-full flex flex-col h-full">
        <div className="flex flex-col flex-1 overflow-hidden p-4 pb-2">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-bold text-gray-700 dark:text-gray-200 text-sm md:text-base">
              📍 地點庫 ({availablePlaces.length})
            </h2>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full select-none">
              已排 {scheduledPlaceIds.size} / {availablePlaces.length}
            </span>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 select-none">
            💡 拖拽排程 / 雙擊飛去地圖定位
          </p>

          <div className="mb-2">
            <input
              type="text"
              placeholder="🔍 搜尋地點庫景點或地址..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
            />
          </div>

          <div className="flex justify-end gap-3 mb-2 px-1">
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
              className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex items-center gap-0.5 cursor-pointer"
            >
              <span>🔼</span> 收起全部
            </button>
          </div>

          {/* 拖曳清單沙盒 */}
          <div
            id="external-events-zone"
            ref={dragZoneRef}
            className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4"
          >
            {availablePlaces.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-8">
                地點庫空空如也 📭
              </p>
            ) : Object.keys(myGrouped).length === 0 &&
              Object.keys(sharedGrouped).length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-6 italic">
                找不到符合條件的地點 🗺️
              </p>
            ) : (
              <>
                {/* 上櫃桶：我自己建立的點 */}
                {renderGroupTree(myGrouped, false)}

                {/* ===================================================================== */}
                {/* 🚀 絕殺 4：上下櫃桶優雅隔離帶 —— 只有當契哥有 share 嘢給你時才現身！ */}
                {/* ===================================================================== */}
                {Object.keys(sharedGrouped).length > 0 && (
                  <div className="pt-2 pb-1">
                    <div className="flex items-center gap-2 select-none">
                      <div className="h-px bg-gradient-to-r from-transparent to-purple-300 dark:to-purple-800 flex-1" />
                      <span className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                        <span>🤝</span> 協作者共享景點 (唯讀)
                      </span>
                      <div className="h-px bg-gradient-to-l from-transparent to-purple-300 dark:to-purple-800 flex-1" />
                    </div>
                  </div>
                )}

                {/* 下櫃桶：契哥分享給我的點 */}
                {renderGroupTree(sharedGrouped, true)}
              </>
            )}
          </div>
        </div>

        <PlaceDetailsPanel selectedPlace={selectedPlace} />
      </div>
    </div>
  );
}
