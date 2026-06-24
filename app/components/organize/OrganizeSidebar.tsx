// components/organize/OrganizeSidebar.tsx
"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { Place } from "../types";
import { buildSidebarGroups } from "@/app/utils/sidebar-utils"; // 🚀 100% 對齊你的原生中央處理器路徑
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
  
  // 👑 1. 正式接通 L1, L2, L3 三層獨立狀態矩陣！
  const [expandedLvl1, setExpandedLvl1] = useState<Record<string, boolean>>({});
  const [expandedLvl2, setExpandedLvl2] = useState<Record<string, boolean>>({});
  const [expandedLvl3, setExpandedLvl3] = useState<Record<string, boolean>>({});

  // 🛡️ 敵我識別反自抽搐印章
  const selfClickedIdRef = useRef<string | null>(null);

  // 2. 純淨分流：區分「我的景點」與「共享景點」
  const { myPlaces, sharedPlaces } = useMemo(() => {
    const mine: Place[] = []; const shared: Place[] = [];
    availablePlaces.forEach((p) => { if ((p as any).isShared) shared.push(p); else mine.push(p); });
    return { myPlaces: mine, sharedPlaces: shared };
  }, [availablePlaces]);

  // 3. 丟入中央處理器，洗出與外部 100% 一致的 3D 三維模型結構
  const myGrouped = useMemo(() => buildSidebarGroups(myPlaces, searchQuery, false), [myPlaces, searchQuery]);
  const sharedGrouped = useMemo(() => buildSidebarGroups(sharedPlaces, searchQuery, true), [sharedPlaces, searchQuery]);

  // =====================================================================
  // 👑 3D 立體導航破門導彈：向下連穿三層節點，精準爆破全自動展開！
  // =====================================================================
  useEffect(() => {
    if (!selectedPlace?.id || !dragZoneRef.current) return;
    if (selfClickedIdRef.current === selectedPlace.id) return;

    const targetId = selectedPlace.id;
    let foundL1 = "";
    let foundL2 = "";
    let foundL3 = "";

    const scan3DTree = (treePool: any) => {
      if (!treePool || typeof treePool !== "object") return;

      Object.entries(treePool).forEach(([k1, lvl2Obj]) => {
        if (!lvl2Obj || typeof lvl2Obj !== "object") return;
        
        Object.entries(lvl2Obj).forEach(([k2, lvl3Obj]) => {
          if (!lvl3Obj || typeof lvl3Obj !== "object") return;
          
          Object.entries(lvl3Obj).forEach(([k3, list]) => {
            if (Array.isArray(list) && list.some(p => p?.id === targetId)) {
              foundL1 = k1;
              foundL2 = `${k1}-${k2}`;
              if (k3 !== "_DIRECT_") {
                foundL3 = `${k1}-${k2}-${k3}`;
              }
            }
          });
        });
      });
    };

    scan3DTree(myGrouped);
    if (!foundL1) scan3DTree(sharedGrouped);

    if (foundL1) {
      // 💥 破開三層大門！
      setExpandedLvl1(prev => ({ ...prev, [foundL1]: true }));
      setExpandedLvl2(prev => ({ ...prev, [foundL2]: true }));
      if (foundL3) setExpandedLvl3(prev => ({ ...prev, [foundL3]: true }));

      // 🎯 延遲發射狙擊滾動
      setTimeout(() => {
        const cardEl = dragZoneRef.current?.querySelector<HTMLElement>(`[data-place-id="${targetId}"]`);
        cardEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 75);
    }
  }, [selectedPlace, myGrouped, sharedGrouped, dragZoneRef]);

  const toggleLvl1 = (key: string) => setExpandedLvl1(p => ({ ...p, [key]: !(p[key] ?? true) }));
  const toggleLvl2 = (key: string) => setExpandedLvl2(p => ({ ...p, [key]: !(p[key] ?? false) }));
  const toggleLvl3 = (key: string) => setExpandedLvl3(p => ({ ...p, [key]: !(p[key] ?? false) }));

  // =====================================================================
  // 🚀 三維正反向全開合演算法（完美適配你的 3D Tree）
  // =====================================================================
  const expandAll = () => {
    setExpandedLvl1({}); 
    const openAllL2: Record<string, boolean> = {};
    const openAllL3: Record<string, boolean> = {};

    const scrape3D = (pool: any) => {
      if (!pool || typeof pool !== "object") return;
      Object.entries(pool).forEach(([k1, lvl2Obj]) => {
        Object.entries(lvl2Obj as Record<string, any>).forEach(([k2, lvl3Obj]) => {
          const fullL2Key = `${k1}-${k2}`;
          openAllL2[fullL2Key] = true;
          if (lvl3Obj && typeof lvl3Obj === "object") {
            Object.keys(lvl3Obj).forEach((k3) => {
              openAllL3[`${fullL2Key}-${k3}`] = true;
            });
          }
        });
      });
    };

    scrape3D(myGrouped); scrape3D(sharedGrouped);
    setExpandedLvl2(openAllL2); setExpandedLvl3(openAllL3);
  };

  const collapseAll = () => {
    const closeAllL1: Record<string, boolean> = {};
    Object.keys(myGrouped).concat(Object.keys(sharedGrouped)).forEach((k1) => { closeAllL1[k1] = false; });
    setExpandedLvl1(closeAllL1); setExpandedLvl2({}); setExpandedLvl3({});
  };

  // 景點卡片渲染器（保留 fc-event 與 drag 屬性）
  const renderPlaceCards = (items: Place[], isReadonly: boolean) => {
    if (!Array.isArray(items)) return null;

    return items.map((place) => {
      const isSelected = selectedPlace?.id === place.id;
      const isHover = hoveredPlaceId === place.id;
      const isScheduled = scheduledPlaceIds.has(place.id);
      const customColor = place.color || "#3b82f6";

      return (
        <div
          key={place.id} data-place-id={place.id} data-title={place.name}
          onClick={() => { selfClickedIdRef.current = place.id; setSelectedPlace(place); }}
          onDoubleClick={() => onFlyToPlace(place)}
          onMouseEnter={() => setHoveredPlaceId(place.id)} onMouseLeave={() => setHoveredPlaceId(null)}
          style={{ borderLeftWidth: "6px", borderLeftColor: customColor }}
          className={`fc-event relative p-2.5 border rounded-md cursor-grab shadow-sm transition-all duration-200 group ${
            isSelected ? "border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-white font-bold ring-2 ring-blue-500/20" : isHover ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300" : isScheduled ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-gray-400 dark:text-gray-500" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-blue-300 dark:hover:border-blue-500"
          }`}
        >
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: customColor }} />
              <span className={`font-bold text-xs md:text-sm truncate ${isScheduled ? "line-through opacity-70" : ""}`}>{place.name}</span>
            </div>
            {isScheduled && <span className="shrink-0 text-[9px] font-black bg-emerald-500 text-white px-1 rounded select-none">✓ 已排</span>}
          </div>
          {place.address && <div className="text-[10px] opacity-70 truncate pointer-events-none pl-3.5">📍 {place.address}</div>}
          
          <div onMouseDown={(e) => e.stopPropagation()} className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/95 dark:bg-gray-800/95 p-1 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 backdrop-blur-xs">
            {!isReadonly && onEditPlace && (<button type="button" onClick={(e) => { e.stopPropagation(); onEditPlace(place); }} className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-amber-500 hover:text-white text-amber-600 rounded transition text-xs">✏️</button>)}
            <button type="button" onClick={(e) => { e.stopPropagation(); onFlyToPlace(place); }} className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white text-blue-600 rounded transition text-xs">🎯</button>
          </div>
        </div>
      );
    });
  };

  // =====================================================================
  // 🏙️ 3D 立體樹狀渲染引擎（100% 正確還原你的 3 層結構）
  // =====================================================================
  const render3DGroupTree = (pool: Record<string, any>, isReadonlyPool: boolean) => {
    if (!pool || Object.keys(pool).length === 0) return null;

    return Object.entries(pool).map(([lvl1Key, lvl2Obj]) => {
      const isL1Expanded = expandedLvl1[lvl1Key] ?? true; // L1預設展開

      return (
        <div key={lvl1Key} className={`border rounded-xl p-3 mb-3 transition-colors ${isReadonlyPool ? "border-purple-100 dark:border-purple-950/40 bg-purple-50/15 dark:bg-purple-950/10" : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"}`}>
          
          {/* === [LAYER 1 HEADER] === */}
          <div onClick={() => toggleLvl1(lvl1Key)} className={`text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer select-none py-1 ${isReadonlyPool ? "text-purple-700 dark:text-purple-400 font-extrabold" : "text-blue-600 dark:text-blue-400"}`}>
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span>{isReadonlyPool ? "👤" : "🌍"}</span><span className="truncate">{lvl1Key}</span>
            </div>
            <span className="text-[10px] text-gray-400 shrink-0">{isL1Expanded ? "▼" : "▶"}</span>
          </div>

          {/* LAYER 1 肚子 */}
          {isL1Expanded && (
            <div className="flex flex-col gap-3 pl-1 mt-2">
              {Object.entries(lvl2Obj as Record<string, any>).map(([lvl2Key, lvl3Obj]) => {
                const fullSubKey = `${lvl1Key}-${lvl2Key}`;
                const isL2Expanded = expandedLvl2[fullSubKey] ?? false; // L2預設收起

                return (
                  <div key={lvl2Key} className="flex flex-col gap-1.5">
                    {/* === [LAYER 2 HEADER] === */}
                    <div onClick={() => toggleLvl2(fullSubKey)} className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-between cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-400 py-0.5">
                      <div className="flex items-center gap-1"><span>{isReadonlyPool ? "🌍" : "🏙️"}</span> {lvl2Key}</div>
                      <span className="text-[9px] text-gray-400">{isL2Expanded ? "▼" : "▶"}</span>
                    </div>

                    {/* LAYER 2 肚子 */}
                    {isL2Expanded && (
                      <div className="flex flex-col gap-1.5 pl-2.5 border-l border-gray-200 dark:border-gray-700 animate-fadeIn">
                        {Object.entries(lvl3Obj || {}).map(([lvl3Key, items]) => {
                          const fullL3Key = `${fullSubKey}-${lvl3Key}`;
                          const isL3Expanded = expandedLvl3[fullL3Key] ?? false; // L3預設收起

                          // ⚡ 核心分流：如果是 "_DIRECT_" 訊號，代表是兩層結構，原地直接噴卡片！
                          if (lvl3Key === "_DIRECT_") {
                            return renderPlaceCards(items as Place[], isReadonlyPool);
                          }

                          // ⚡ 純血 Level 3：如果是正規三層，渲染第三層的 [省份/區域] Panel！
                          return (
                            <div key={lvl3Key} className="flex flex-col gap-1 mt-0.5 mb-1 pl-1.5 border-l border-purple-200 dark:border-purple-800">
                              {/* === [LAYER 3 HEADER] === */}
                              <div onClick={() => toggleLvl3(fullL3Key)} className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 flex items-center justify-between cursor-pointer select-none py-0.5 hover:opacity-80">
                                <div className="flex items-center gap-1"><span>🏙️</span> {lvl3Key} ({(items as Place[]).length})</div>
                                <span className="text-[8px] text-purple-300 dark:text-purple-500">{isL3Expanded ? "▼" : "▶"}</span>
                              </div>

                              {/* LAYER 3 肚子 */}
                              {isL3Expanded && (
                                <div className="flex flex-col gap-1.5 pl-2 pt-1 animate-fadeIn">
                                  {renderPlaceCards(items as Place[], isReadonlyPool)}
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
    <div className={`bg-white dark:bg-gray-900 flex flex-col shrink-0 overflow-hidden h-full ${showList ? "border-r border-gray-200 dark:border-gray-800" : "!w-0 p-0 opacity-0"}`} style={{ width: showList ? `${listWidth}px` : "0px" }}>
      <div className="w-full flex flex-col h-full">
        <div className="flex flex-col flex-1 overflow-hidden p-4 pb-2">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-bold text-gray-700 dark:text-gray-200 text-sm md:text-base">📍 地點庫 ({availablePlaces.length})</h2>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">已排 {scheduledPlaceIds.size} / {availablePlaces.length}</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">💡 拖拽排程 / 雙擊飛去地圖定位</p>
          <input type="text" placeholder="🔍 搜尋地點庫..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none mb-2" />
          
          <div className="flex justify-end gap-3 mb-2 px-1">
            <button type="button" onClick={expandAll} className="text-[10px] font-bold text-blue-600">🔽 展開全部</button>
            <button type="button" onClick={collapseAll} className="text-[10px] font-bold text-gray-500">🔼 收起全部</button>
          </div>

          {/* ===================================================================== */}
          {/* 🚀 3D 渲染星系通電 */}
          {/* ===================================================================== */}
          <div id="external-events-zone" ref={dragZoneRef} className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4">
            {render3DGroupTree(myGrouped, false)}
            {Object.keys(sharedGrouped).length > 0 && (<div className="pt-2 pb-1"><div className="h-px bg-purple-200 dark:bg-purple-900 my-1"/></div>)}
            {render3DGroupTree(sharedGrouped, true)}
          </div>
        </div>
        <PlaceDetailsPanel selectedPlace={selectedPlace} />
      </div>
    </div>
  );
}