// components/sidebar/PlaceLibrary.tsx
"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { Place } from "../types";

interface PlaceLibraryProps {
  places: Place[];
  onPlaceClick: (place: Place) => void;
  onEditPlace?: (place: Place) => void; 
  onDeletePlace?: (placeId: string) => void;
  // 🚀 接收由 Sidebar 傳入嘅 Hover 神經線
  hoveredPlaceId?: string | null;
  onHoverPlace?: (id: string | null) => void;
}

export default function PlaceLibrary({ 
  places, onPlaceClick, onEditPlace, onDeletePlace,
  hoveredPlaceId, onHoverPlace 
}: PlaceLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({});

  // 🚀 黑科技準備：用黎裝住每一張卡片嘅 DOM 節點
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 🚀 聯動黑科技：當用家喺地圖 Hover 某個 Marker 時，如果清單未見到該卡片，自動 Scroll 過去！
  useEffect(() => {
    if (hoveredPlaceId && cardRefs.current[hoveredPlaceId]) {
      cardRefs.current[hoveredPlaceId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // 確保只做最小幅度嘅滾動，唔會搞到成版亂跳
      });
    }
  }, [hoveredPlaceId]);

  const groupedPlaces = useMemo(() => {
    const groups: Record<string, Record<string, Place[]>> = {};

    const filtered = places.filter(place => 
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
  }, [places, searchQuery]);

  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => ({ 
      ...prev, 
      [country]: !(prev[country] ?? true) 
    }));
  };

  const toggleProvince = (key: string) => {
    setExpandedProvinces(prev => ({ 
      ...prev, 
      [key]: !(prev[key] ?? true) 
    }));
  };

  const expandAll = () => {
    setExpandedCountries({});
    setExpandedProvinces({});
  };

  const collapseAll = () => {
    const newCountries: Record<string, boolean> = {};
    const newProvinces: Record<string, boolean> = {};
    
    Object.entries(groupedPlaces).forEach(([country, provinces]) => {
      newCountries[country] = false;
      Object.keys(provinces).forEach(province => {
        newProvinces[`${country}-${province}`] = false;
      });
    });

    setExpandedCountries(newCountries);
    setExpandedProvinces(newProvinces);
  };

  if (places.length === 0) {
    return <p className="text-xs text-center text-gray-400 py-8">暫時未有已儲存地點 📍</p>;
  }

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      
      {/* 頂部搜尋與控制區 */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 pb-2 border-b border-gray-100 dark:border-gray-800">
        <input
          type="text"
          placeholder="🔍 搜尋已儲存景點或地址..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner mb-2"
        />
        
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📂 分類檢視</span>
          <div className="flex gap-3">
            <button onClick={expandAll} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-0.5">
              <span>🔽</span> 展開全部
            </button>
            <button onClick={collapseAll} className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex items-center gap-0.5">
              <span>🔼</span> 收起全部
            </button>
          </div>
        </div>
      </div>

      {Object.keys(groupedPlaces).length === 0 && (
        <p className="text-xs text-center text-gray-400 py-6 italic">找不到符合條件的地點 🗺️</p>
      )}

      <div className="flex flex-col gap-3">
        {Object.entries(groupedPlaces).map(([country, provinces]) => {
          const isCountryExpanded = expandedCountries[country] ?? true;

          return (
            <div key={country} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-900/30">
              
              <div 
                onClick={() => toggleCountry(country)}
                className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between cursor-pointer select-none hover:opacity-80 py-1"
              >
                <div className="flex items-center gap-1"><span>🌍</span> {country}</div>
                <span className="text-[10px] text-gray-400 transition-transform duration-200">{isCountryExpanded ? "▼" : "▶"}</span>
              </div>

              {isCountryExpanded && (
                <div className="flex flex-col gap-3 pl-1 mt-2">
                  {Object.entries(provinces).map(([province, items]) => {
                    const provinceKey = `${country}-${province}`;
                    const isProvinceExpanded = expandedProvinces[provinceKey] ?? true;

                    return (
                      <div key={province} className="flex flex-col gap-1.5">
                        
                        <div 
                          onClick={() => toggleProvince(provinceKey)}
                          className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-between cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-400 py-0.5"
                        >
                          <div className="flex items-center gap-1"><span>🏙️</span> {province} ({items.length})</div>
                          <span className="text-[9px] text-gray-400">{isProvinceExpanded ? "▼" : "▶"}</span>
                        </div>

                        {isProvinceExpanded && (
                          <div className="flex flex-col gap-1.5 pl-2.5 border-l border-gray-200 dark:border-gray-700 animate-fadeIn">
                            {items.map((place) => {
                              // 🚀 判斷呢張卡片係咪正處於 Hover 狀態
                              const isThisHovered = hoveredPlaceId === place.id;

                              return (
                                <div
                                  key={place.id}
                                  ref={(el) => { cardRefs.current[place.id] = el; }} // 綁定 ref 供 scrollIntoView 尋找
                                  onClick={() => onPlaceClick(place)}
                                  
                                  // 🚀 雙向觸發：滑鼠入/出時，呼叫 onHoverPlace
                                  onMouseEnter={() => onHoverPlace?.(place.id)}
                                  onMouseLeave={() => onHoverPlace?.(null)}
                                  
                                  // 🚀 樣式聯動：如果被 Hover，亮起 Amber 邊框同輕微右移 (translate-x-0.5)
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
                                    {place.address && <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">📍 {place.address}</div>}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {onEditPlace && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation(); 
                                          onEditPlace(place);
                                        }}
                                        title="編輯景點"
                                        className="text-[13px] text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition px-1.5 py-1"
                                      >
                                        ✏️
                                      </button>
                                    )}

                                    {onDeletePlace && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`確定要刪除「${place.name}」嗎？`)) onDeletePlace(place.id);
                                        }}
                                        title="刪除景點"
                                        className="text-[13px] text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition px-1.5 py-1"
                                      >
                                        🗑️
                                      </button>
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