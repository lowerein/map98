// components/organize/OrganizeSidebar.tsx
"use client";
import { useMemo, useState } from "react";
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
  availablePlaces = [], scheduledPlaceIds = new Set(), selectedPlace, setSelectedPlace, 
  hoveredPlaceId, setHoveredPlaceId, dragZoneRef, showList, listWidth, 
  onFlyToPlace, onEditPlace 
}: OrganizeSidebarProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({});

  const groupedPlaces = useMemo(() => {
    const groups: Record<string, Record<string, Place[]>> = {};

    const filtered = availablePlaces.filter(place => 
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (place.address && place.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    filtered.forEach((place) => {
      const country = place.country || "其他國家";
      const province = place.province || "其他區域";

      if (!groups[country]) groups[country] = {};
      if (!groups[country][province]) groups[country][province] = [];
      
      groups[country][province].push(place);
    });

    return groups;
  }, [availablePlaces, searchQuery]);

  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => ({ ...prev, [country]: !(prev[country] ?? true) }));
  };

  const toggleProvince = (key: string) => {
    setExpandedProvinces(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const expandAll = () => { setExpandedCountries({}); setExpandedProvinces({}); };

  const collapseAll = () => {
    const newCountries: Record<string, boolean> = {};
    const newProvinces: Record<string, boolean> = {};
    Object.entries(groupedPlaces).forEach(([country, provinces]) => {
      newCountries[country] = false;
      Object.keys(provinces).forEach(province => { newProvinces[`${country}-${province}`] = false; });
    });
    setExpandedCountries(newCountries); setExpandedProvinces(newProvinces);
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-900 flex flex-col shrink-0 overflow-hidden h-full ${showList ? "border-r border-gray-200 dark:border-gray-800" : "!w-0 p-0 opacity-0"}`}
      style={{ width: showList ? `${listWidth}px` : '0px' }} 
    >
      <div className="w-full flex flex-col h-full">
        
        <div className="flex flex-col flex-1 overflow-hidden p-4 pb-2">
          
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-bold text-gray-700 dark:text-gray-200 text-sm md:text-base">
              📍 地點庫 ({availablePlaces.length})
            </h2>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
              已排 {scheduledPlaceIds.size} / {availablePlaces.length}
            </span>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">💡 拖拽排程 / 雙擊飛去地圖定位</p>
          
          <div className="mb-2">
            <input
              type="text" placeholder="🔍 搜尋地點庫景點或地址..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
            />
          </div>

          <div className="flex justify-end gap-3 mb-2 px-1">
            <button onClick={expandAll} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition flex items-center gap-0.5"><span>🔽</span> 展開全部</button>
            <button onClick={collapseAll} className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex items-center gap-0.5"><span>🔼</span> 收起全部</button>
          </div>

          <div id="external-events-zone" ref={dragZoneRef} className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4">
            {availablePlaces.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-8">地點庫空空如也 📭</p>
            ) : Object.keys(groupedPlaces).length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-6 italic">找不到符合條件的地點 🗺️</p>
            ) : (
              Object.entries(groupedPlaces).map(([country, provinces]) => {
                const isCountryExpanded = expandedCountries[country] ?? true;

                return (
                  <div key={country} className="border border-gray-100 dark:border-gray-800 rounded-lg p-2.5 bg-gray-50/50 dark:bg-gray-900/30">
                    <div onClick={() => toggleCountry(country)} className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between cursor-pointer select-none hover:opacity-80 py-0.5">
                      <span className="flex items-center gap-1">🌍 {country}</span>
                      <span className="text-[10px] text-gray-400">{isCountryExpanded ? "▼" : "▶"}</span>
                    </div>

                    {isCountryExpanded && (
                      <div className="flex flex-col gap-2.5 pl-1 mt-2">
                        {Object.entries(provinces).map(([province, items]) => {
                          const provinceKey = `${country}-${province}`;
                          const isProvinceExpanded = expandedProvinces[provinceKey] ?? true;

                          return (
                            <div key={province} className="flex flex-col gap-1">
                              <div onClick={() => toggleProvince(provinceKey)} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-between cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-400 py-0.5">
                                <span>🏙️ {province} ({items.length})</span>
                                <span className="text-[8px] text-gray-400">{isProvinceExpanded ? "▼" : "▶"}</span>
                              </div>

                              {isProvinceExpanded && (
                                <div className="flex flex-col gap-1.5 pl-2 border-l border-gray-200 dark:border-gray-700 mt-1">
                                  {items.map((place) => {
                                    const isSelected = selectedPlace?.id === place.id;
                                    const isHover = hoveredPlaceId === place.id;
                                    const isScheduled = scheduledPlaceIds.has(place.id);
                                    
                                    // 🚀 1. 提取景點色，如果未設就用標準藍色保底
                                    const customColor = place.color || "#3b82f6";
                                    
                                    return (
                                      <div 
                                        key={place.id} data-place-id={place.id} data-title={place.name} 
                                        onClick={() => setSelectedPlace(place)} onDoubleClick={() => onFlyToPlace(place)} 
                                        onMouseEnter={() => setHoveredPlaceId(place.id)} onMouseLeave={() => setHoveredPlaceId(null)}     
                                        
                                        // 🚀 2. 注入 inline style 賦予左側 6px 專屬調色能量邊！
                                        style={{ borderLeftWidth: '6px', borderLeftColor: customColor }}
                                        
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
                                          
                                          {/* 🚀 3. 名字左邊加一粒精緻調色點 */}
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

                                        {place.address && <div className="text-[10px] opacity-70 truncate pointer-events-none pl-3.5">📍 {place.address}</div>}
                                        
                                        {/* 毛玻璃操作組 */}
                                        <div 
                                          onMouseDown={(e) => e.stopPropagation()} 
                                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/95 dark:bg-gray-800/95 p-1 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 backdrop-blur-xs"
                                        >
                                          <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onEditPlace?.(place); }} 
                                            className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 rounded transition text-xs shadow-2xs" title="編輯此景點"
                                          >✏️</button>
                                          <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onFlyToPlace(place); }} 
                                            className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 rounded transition text-xs shadow-2xs" title="在地圖定位"
                                          >🎯</button>
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
              })
            )}
          </div>
        </div>

        <PlaceDetailsPanel selectedPlace={selectedPlace} />

      </div>
    </div>
  );
}