// components/sidebar/PlaceLibrary.tsx
"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { Place } from "../types";
import { buildSidebarGroups } from "@/app/utils/sidebar-utils"; // 🚀 保持你原生的中央處理器路徑

interface PlaceLibraryProps {
  places: Place[];
  onPlaceClick: (place: Place) => void;
  onEditPlace?: (place: Place) => void;
  onDeletePlace?: (placeId: string) => void;
  hoveredPlaceId?: string | null;
  onHoverPlace?: (id: string | null) => void;
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
  const [libraryTab, setLibraryTab] = useState<"mine" | "shared">("mine");

  // 🚀 1. 正式解封 L1, L2, L3 三層獨立狀態矩陣！
  const [expandedLvl1, setExpandedLvl1] = useState<Record<string, boolean>>({});
  const [expandedLvl2, setExpandedLvl2] = useState<Record<string, boolean>>({});
  const [expandedLvl3, setExpandedLvl3] = useState<Record<string, boolean>>({});

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (hoveredPlaceId && cardRefs.current[hoveredPlaceId]) {
      cardRefs.current[hoveredPlaceId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [hoveredPlaceId]);

  const myCount = useMemo(() => places.filter((p) => !p.isShared).length, [places]);
  const sharedCount = useMemo(() => places.filter((p) => p.isShared).length, [places]);

  // =====================================================================
  // 🚀 2. 智能前置過濾，再丟入中央處理器，洗出標準的 3D JSON 樹
  // =====================================================================
  const groupedPlaces = useMemo(() => {
    const isSharedMode = libraryTab === "shared";
    const targetList = isSharedMode
      ? places.filter((p) => p.isShared)
      : places.filter((p) => !p.isShared);

    // 強制轉換為三維型別 Record<string, Record<string, Record<string, Place[]>>>
    return buildSidebarGroups(targetList, searchQuery, isSharedMode) as any;
  }, [places, searchQuery, libraryTab]);

  // L1 預設為 true (展開第一層：國家或協作者)
  const toggleLvl1 = (key: string) => {
    setExpandedLvl1((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  // L2 預設為 false (收起第二層：區域或國家)
  const toggleLvl2 = (key: string) => {
    setExpandedLvl2((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  // 🚀 3. 新增 L3 狀態切換掣，預設同樣為 false (收起第三層：共享池的省份區域)
  const toggleLvl3 = (key: string) => {
    setExpandedLvl3((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  // =====================================================================
  // 🚀 4. 全自動「三維正反向補完」全開合演算法
  // =====================================================================
  const expandAll = () => {
    setExpandedLvl1({}); // L1 歸零等於全部預設展開 (true)
    const openAllL2: Record<string, boolean> = {};
    const openAllL3: Record<string, boolean> = {};

    // 深度刮取 3 層 Tree 內所有的複合鍵，通通強制註冊為 true
    Object.entries(groupedPlaces).forEach(([k1, lvl2Obj]) => {
      Object.entries(lvl2Obj as Record<string, any>).forEach(([k2, lvl3Obj]) => {
        const fullL2Key = `${k1}-${k2}`;
        openAllL2[fullL2Key] = true;
        
        Object.keys(lvl3Obj).forEach((k3) => {
          openAllL3[`${fullL2Key}-${k3}`] = true;
        });
      });
    });

    setExpandedLvl2(openAllL2);
    setExpandedLvl3(openAllL3);
  };

  const collapseAll = () => {
    const closeAllL1: Record<string, boolean> = {};
    Object.keys(groupedPlaces).forEach((k1) => {
      closeAllL1[k1] = false; // 強制將 L1 關閉
    });
    setExpandedLvl1(closeAllL1);
    setExpandedLvl2({}); // L2/L3 歸零等於觸發預設值 (false)，瞬間全疊埋！
    setExpandedLvl3({});
  };

  // =====================================================================
  // 🚀 5. 卡片渲染元件抽離 (DRY 原則)，避免下面套娃迴圈內重寫兩次
  // =====================================================================
  const renderPlaceCard = (place: Place, isReadonly: boolean) => {
    const isThisHovered = hoveredPlaceId === place.id;

    return (
      <div
        key={place.id}
        ref={(el) => { cardRefs.current[place.id] = el; }}
        onClick={() => onPlaceClick(place)}
        onMouseEnter={() => onHoverPlace?.(place.id)}
        onMouseLeave={() => onHoverPlace?.(null)}
        className={`p-2 rounded-lg transition-all duration-200 cursor-pointer text-sm flex justify-between items-center group border ${
          isThisHovered
            ? "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 shadow-md ring-2 ring-amber-400/20 translate-x-0.5"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-500"
        }`}
      >
        <div className="truncate pr-2">
          <div className={`font-bold truncate transition-colors ${isThisHovered ? "text-amber-900 dark:text-amber-200" : "text-gray-800 dark:text-gray-200"}`}>
            {place.name}
          </div>
          {place.address && (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              📍 {place.address}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isReadonly && onEditPlace && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditPlace(place); }}
              title="編輯景點"
              className="text-[13px] text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition px-1.5 py-1 cursor-pointer"
            >✏️</button>
          )}

          {!isReadonly && onDeletePlace && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`確定要刪除「${place.name}」嗎？`)) onDeletePlace(place.id);
              }}
              title="刪除景點"
              className="text-[13px] text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition px-1.5 py-1 cursor-pointer"
            >🗑️</button>
          )}

          {isReadonly  && (
            <span className="text-[10px] font-extrabold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded shadow-2xs select-none">
              🔒 唯讀
            </span>
          )}
        </div>
      </div>
    );
  };

  if (places.length === 0) {
    return <p className="text-xs text-center text-gray-400 py-8">暫時未有已儲存地點 📍</p>;
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
          placeholder={libraryTab === "mine" ? "🔍 搜尋我的景點或地址..." : "🔍 搜尋好友共給我的地標..."}
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
          {libraryTab === "mine" ? "找不到符合條件的地點 🗺️" : "暫時未有其他人分享景點給你 🤝"}
        </p>
      )}

      {/* ===================================================================== */}
      <div className="relative z-0 flex flex-col gap-3">
        {Object.entries(groupedPlaces).map(([lvl1Key, lvl2Obj]) => {
          const isL1Expanded = expandedLvl1[lvl1Key] ?? true; // 國家層/人名層預設展開
          const isSharedMode = libraryTab === "shared";

          return (
            <div
              key={lvl1Key}
              className={`border rounded-xl p-3 transition-colors ${
                isSharedMode
                  ? "border-purple-100 dark:border-purple-950/40 bg-purple-50/20 dark:bg-purple-950/10"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
              }`}
            >
              {/* === [LAYER 1 HEADER] === */}
              <div
                onClick={() => toggleLvl1(lvl1Key)}
                className={`text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer select-none py-1 ${
                  isSharedMode ? "text-purple-700 dark:text-purple-300 font-extrabold" : "text-blue-600 dark:text-blue-400"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span>{isSharedMode ? "👤" : "🌍"}</span>
                  <span className="truncate">{lvl1Key}</span>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 transition-transform duration-200">
                  {isL1Expanded ? "▼" : "▶"}
                </span>
              </div>

              {isL1Expanded && (
                <div className="flex flex-col gap-3 pl-1 mt-2">
                  {Object.entries(lvl2Obj as Record<string, any>).map(([lvl2Key, lvl3Obj]) => {
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
                            <span>{isSharedMode ? "🌍" : "🏙️"}</span> {lvl2Key}
                          </div>
                          <span className="text-[9px] text-gray-400">
                            {isL2Expanded ? "▼" : "▶"}
                          </span>
                        </div>

                        {isL2Expanded && (
                          <div className="flex flex-col gap-1.5 pl-2.5 border-l border-gray-200 dark:border-gray-700 animate-fadeIn">
                            
                            {Object.entries(lvl3Obj).map(([lvl3Key, items]) => {
                              const fullL3Key = `${fullSubKey}-${lvl3Key}`;
                              const isL3Expanded = expandedLvl3[fullL3Key] ?? false; // 預設收起

                              // 🌟 核心魔法：如果遇到 "_DIRECT_" 訊號，代表這是我的私藏景點（實質只有2層），原地直接噴卡片！
                              if (lvl3Key === "_DIRECT_") {
                                return (items as Place[]).map((place) => renderPlaceCard(place, isSharedMode));
                              }

                              // 🌟 純血 Level 3：如果是共用池，老老實實渲染第三層的 [省份/區域] Header！
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
                                      {(items as Place[]).map((place) => renderPlaceCard(place, isSharedMode))}
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
        })}
      </div>
    </div>
  );
}