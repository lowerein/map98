// components/Sidebar.tsx
"use client";
import { useState, useEffect } from "react";
import { Place, Itinerary } from "./types";
import PlaceLibrary from "./sidebar/PlaceLibrary";
import TravelMode from "./sidebar/TravelMode";
import PlaceDetailsPanel from "./sidebar/PlaceDetailsPanel"; 

interface SidebarProps {
  places: Place[];
  itineraries: Itinerary[];
  activeItineraryId: string;
  selectedPlace: Place | null;
  onPlaceClick: (place: Place) => void;
  onAssignPlace: (placeId: string, dayId: string) => void;
  onDeletePlace?: (placeId: string) => void; 
  onEditPlace?: (place: Place) => void; 
  onCreateItinerary: (name: string, start: string, end: string) => void;
  onRenameItinerary: (id: string, newName: string) => void;
  onSwitchItinerary: (id: string) => void;
  hoveredPlaceId?: string | null;
  setHoveredPlaceId?: (id: string | null) => void; 
  [key: string]: any; 

  activeTab?: string; // 👈 接收老豆 Map.tsx 的視角狀態
  onTabChange?: (tab: string) => void; // 👈 向上通報的對講機
}

export default function Sidebar(props: SidebarProps) {
  const { hoveredPlaceId, setHoveredPlaceId, activeTab: propActiveTab, onTabChange, ...restProps } = props;

  // 🚀 核心絕殺：徹底刪除本地 useState！
  // 統一讀取老豆 Map.tsx 賦予的 propActiveTab（保底預設為 "places"）
  const currentTab = (propActiveTab as "places" | "travel") || "places";

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  
  const activeItinerary = props.itineraries?.find(i => i.id === props.activeItineraryId) || props.itineraries?.[0] || null;

  // 按鈕點擊時，直接透過對講機命令老豆改 State
  const handleTabClick = (targetTab: "places" | "travel") => {
    onTabChange?.(targetTab);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
      
      {/* 頂部 Tab Bar */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 transition-colors pt-2">
        <div className="px-4 pb-0">
          <div className="flex gap-4 text-sm font-medium overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => handleTabClick("places")} // 👈 呼叫老豆！
              className={`pb-2 border-b-2 transition whitespace-nowrap font-bold ${currentTab === "places" ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              📍 地點 ({props.places?.length || 0})
            </button>
            <button 
              onClick={() => handleTabClick("travel")} // 👈 呼叫老豆！
              className={`pb-2 border-b-2 transition whitespace-nowrap font-bold ${currentTab === "travel" ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              📱 旅途 ({props.itineraries?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* 上半部：清單區域 */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-gray-900 transition-colors relative">
        {currentTab === "places" && (
          <PlaceLibrary 
            places={props.places} 
            onPlaceClick={props.onPlaceClick} 
            onDeletePlace={props.onDeletePlace} 
            onEditPlace={props.onEditPlace} 
            hoveredPlaceId={hoveredPlaceId}
            onHoverPlace={setHoveredPlaceId} 
          />
        )}
        
        {currentTab === "travel" && isMounted && (
          activeItinerary ? (
            <TravelMode 
              itinerary={activeItinerary} 
              itineraries={props.itineraries}
              activeItineraryId={props.activeItineraryId}
              onSwitchItinerary={props.onSwitchItinerary}
              places={props.places} 
              hoveredPlaceId={hoveredPlaceId}
              onHoverPlace={setHoveredPlaceId}
              onPlaceClick={props.onPlaceClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-gray-400 dark:text-gray-500 animate-fadeIn">
              <span className="text-4xl mb-3">🧳</span>
              <p className="text-sm font-bold leading-relaxed text-gray-600 dark:text-gray-300">尚未建立任何旅途</p>
              <p className="text-xs mt-1">請在右側地圖上建立新的排程</p>
            </div>
          )
        )}
      </div>

      {/* 下半部：PlaceDetailsPanel */}
      {currentTab === "places" && (
        <PlaceDetailsPanel selectedPlace={props.selectedPlace} />
      )}

    </div>
  );
}