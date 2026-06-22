// components/organize/OrganizeSidebar.tsx
"use client";
import { useMemo, useState } from "react";
import { Place } from "../types";
import { buildSidebarGroups, SidebarGroupTree } from "@/app/utils/sidebar-utils"; // 🚀 1. 引入中央處理器與三維樹型別
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
  
  // 🚀 1. 正式解封 L1, L2, L3 三層獨立狀態矩陣！
  const [expandedLvl1, setExpandedLvl1] = useState<Record<string, boolean>>({});
  const [expandedLvl2, setExpandedLvl2] = useState<Record<string, boolean>>({});
  const [expandedLvl3, setExpandedLvl3] = useState<Record<string, boolean>>({});

  // 資產大分流：劏開「我的」與「契哥給的」
  const { myPlaces, sharedPlaces } = useMemo(() => {
    const mine: Place[] = [];
    const shared: Place[] = [];

    availablePlaces.forEach((p) => {
      if ((p as any).isShared) shared.push(p);
      else mine.push(p);
    });

    return { myPlaces: mine, sharedPlaces: shared };
  }, [availablePlaces]);

  // =====================================================================
  // 🚀 2. 雙軌接通中央處理器：原先百幾行的清洗邏輯，被這兩行徹底取代！
  // =====================================================================
  const myGrouped: SidebarGroupTree = useMemo(() => buildSidebarGroups(myPlaces, searchQuery, false), [myPlaces, searchQuery]);
  const sharedGrouped: SidebarGroupTree = useMemo(() => buildSidebarGroups(sharedPlaces, searchQuery, true), [sharedPlaces, searchQuery]);

  // L1 預設為 true (展開第一層：國家或協作者)
  const toggleLvl1 = (key: string) => {
    setExpandedLvl1((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  // L2 預設為 false (收起第二層：區域或國家)
  const toggleLvl2 = (key: string) => {
    setExpandedLvl2((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  // L3 預設為 false (收起第三層：共享池的省份區域)
  const toggleLvl3 = (key: string) => {
    setExpandedLvl3((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  // =====================================================================
  // 🚀 3. 針對「上下雙櫃桶」編寫的：三維雙引擎全域開合掃描器
  // =====================================================================
  const expandAll = () => {
    setExpandedLvl1({}); // L1 預設 true，清空等於全開
    const openAllL2: Record<string, boolean> = {};
    const openAllL3: Record<string, boolean> = {};

    // 同時深度刮走「上櫃桶(Mine)」同「下櫃桶(Shared)」嘅所有 L2 與 L3 Key
    const scrapePool = (pool: SidebarGroupTree) => {
      Object.entries(pool).forEach(([k1, lvl2Obj]) => {
        Object.entries(lvl2Obj).forEach(([k2, lvl3Obj]) => {
          const fullL2Key = `${k1}-${k2}`;
          openAllL2[fullL2Key] = true;
          
          Object.keys(lvl3Obj).forEach((k3) => {
            openAllL3[`${fullL2Key}-${k3}`] = true;
          });
        });
      });
    };

    scrapePool(myGrouped);
    scrapePool(sharedGrouped);
    setExpandedLvl2(openAllL2);
    setExpandedLvl3(openAllL3);
  };

  const collapseAll = () => {
    const closeAllL1: Record<string, boolean> = {};
    
    const scrapeL1 = (pool: SidebarGroupTree) => {
      Object.keys(pool).forEach((k1) => {
        closeAllL1[k1] = false;
      });
    };

    scrapeL1(myGrouped);
    scrapeL1(sharedGrouped);
    
    setExpandedLvl1(closeAllL1);
    setExpandedLvl2({}); // L2/L3 預設 false，清空等於物理全合
    setExpandedLvl3({});
  };

  // =====================================================================
  // 🚀 4. 可拖拽地標卡片渲染模組抽離 (DRY 原則)
  // =====================================================================
  const renderDragCard = (place: Place, isReadonly: boolean) => {
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
            <span className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: customColor }} />
            <span className={`font-bold text-xs md:text-sm truncate ${isScheduled ? "line-through opacity-70" : ""}`}>
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
          {!isReadonly && onEditPlace && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditPlace(place); }}
              className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 rounded transition text-xs shadow-2xs cursor-pointer"
              title="編輯此景點"
            >✏️</button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFlyToPlace(place); }}
            className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 rounded transition text-xs shadow-2xs cursor-pointer"
            title="在地圖定位"
          >🎯</button>
        </div>
      </div>
    );
  };

  // =====================================================================
  // 🚀 5. 核心精髓：支援解讀 _DIRECT_ 跳板的「真．三層超立方體物理套娃」
  // =====================================================================
  const renderGroupTree = (pool: SidebarGroupTree, isReadonlyPool: boolean) => {
    if (Object.keys(pool).length === 0) return null;

    return Object.entries(pool).map(([lvl1Key, lvl2Obj]) => {
      const isL1Expanded = expandedLvl1[lvl1Key] ?? true; // 國家層/人名層預設展開

      return (
        <div
          key={lvl1Key}
          className={`border rounded-xl p-3 transition-colors ${
            isReadonlyPool
              ? "border-purple-100 dark:border-purple-950/50 bg-purple-50/15 dark:bg-purple-950/10"
              : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
          }`}
        >
          {/* === [LAYER 1 HEADER] === */}
          <div
            onClick={() => toggleLvl1(lvl1Key)}
            className={`text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer select-none py-1 ${
              isReadonlyPool ? "text-purple-700 dark:text-purple-400 font-extrabold" : "text-blue-600 dark:text-blue-400"
            }`}
          >
            <span className="flex items-center gap-1 truncate pr-2">
              <span>{isReadonlyPool ? "👤" : "🌍"}</span>
              <span className="truncate">{lvl1Key}</span>
            </span>
            <span className="text-[10px] text-gray-400 shrink-0 transition-transform duration-200">
              {isL1Expanded ? "▼" : "▶"}
            </span>
          </div>

          {isL1Expanded && (
            <div className="flex flex-col gap-3 pl-1 mt-2">
              {Object.entries(lvl2Obj).map(([lvl2Key, lvl3Obj]) => {
                const fullSubKey = `${lvl1Key}-${lvl2Key}`;
                const isL2Expanded = expandedLvl2[fullSubKey] ?? false; // 預設收起

                return (
                  <div key={lvl2Key} className="flex flex-col gap-1.5">
                    {/* === [LAYER 2 HEADER] === */}
                    <div
                      onClick={() => toggleLvl2(fullSubKey)}
                      className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-between cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-400 py-0.5"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isReadonlyPool ? "🌍" : "🏙️"}</span> {lvl2Key}
                      </div>
                      <span className="text-[9px] text-gray-400">
                        {isL2Expanded ? "▼" : "▶"}
                      </span>
                    </div>

                    {isL2Expanded && (
                      <div className="flex flex-col gap-1.5 pl-2.5 border-l border-gray-200 dark:border-gray-700 animate-fadeIn pt-0.5">
                        
                        {Object.entries(lvl3Obj).map(([lvl3Key, items]) => {
                          const fullL3Key = `${fullSubKey}-${lvl3Key}`;
                          const isL3Expanded = expandedLvl3[fullL3Key] ?? false; // 預設收起

                          // 🌟 核心魔法跳板：遇到 "_DIRECT_" 訊號，代表這是上櫃桶（我的景點），直接吐出可拖拽卡片！
                          if (lvl3Key === "_DIRECT_") {
                            return (items as Place[]).map((place) => renderDragCard(place, isReadonlyPool));
                          }

                          // 🌟 純血 Level 3：下櫃桶（與我共用），老老實實渲染第三層的 [省份/區域] Header！
                          return (
                            <div key={lvl3Key} className="flex flex-col gap-1 mt-0.5 mb-1 pl-1.5 border-l border-purple-200 dark:border-purple-800">
                              {/* === [LAYER 3 HEADER] === */}
                              <div
                                onClick={() => toggleLvl3(fullL3Key)}
                                className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 flex items-center justify-between cursor-pointer select-none py-0.5 hover:opacity-80"
                              >
                                <div className="flex items-center gap-1">
                                  <span>🏙️</span> {lvl3Key} ({(items as Place[]).length})
                                 </div>
                                <span className="text-[8px] text-purple-300 dark:text-purple-500">
                                  {isL3Expanded ? "▼" : "▶"}
                                </span>
                              </div>

                              {isL3Expanded && (
                                <div className="flex flex-col gap-1.5 pl-2 pt-1 animate-fadeIn">
                                  {(items as Place[]).map((place) => renderDragCard(place, isReadonlyPool))}
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
                {/* 上櫃桶：我自己建立的點 (2層樹，點開見卡) */}
                {renderGroupTree(myGrouped, false)}

                {/* 隔離帶 */}
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

                {/* 下櫃桶：契哥分享給我的點 (3層雲端硬碟，點開見國家->省份->卡) */}
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