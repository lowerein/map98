// components/Map.tsx
"use client";
import { useState, useEffect, useRef } from "react";
// 🚀 1. 補回 MapControl 同 ControlPosition 引入
import { APIProvider, InfoWindow, MapControl, ControlPosition } from "@vis.gl/react-google-maps";
import { useRouter, useSearchParams } from "next/navigation";
import { useTripData } from "../hooks/useTripData"; 

import Sidebar from "./Sidebar";
import AddPlaceForm from "./AddPlaceForm";
import MapCanvas from "./MapCanvas";
import OrganizeMode from "./OrganizeMode";
import MapSearchBar from "./MapSearchBar";

export default function Map() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOrganizeMode = searchParams.get("mode") === "organize";

  // 📍 提取所有核心業務邏輯與狀態
  const trip = useTripData();

  // 📐 UI 佈局狀態
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const isResizing = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  // 🚀 控制手機版路線選單的展開狀態
  const [showRouteMenu, setShowRouteMenu] = useState(false);

  useEffect(() => {
    setIsMounted(true); 
    const handleMouseMove = (e: MouseEvent) => { if (!isResizing.current) return; if (e.clientX >= 280 && e.clientX <= 600) setSidebarWidth(e.clientX); };
    const handleMouseUp = () => { isResizing.current = false; document.body.style.cursor = "default"; };
    window.addEventListener("mousemove", handleMouseMove); window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  const startResize = (e: React.MouseEvent) => { e.preventDefault(); isResizing.current = true; document.body.style.cursor = "col-resize"; };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={["places"]} language="zh-HK">
      {isOrganizeMode ? (
        <OrganizeMode 
          places={trip.savedPlaces} 
          itineraries={trip.itineraries}
          activeItineraryId={trip.activeItineraryId}
          onSwitchItinerary={trip.handleSwitchItinerary}
          onCreateItinerary={trip.handleCreateItinerary}
          onRenameItinerary={trip.handleRenameItinerary}
          onDateRangeChange={trip.handleDateRangeChange}
          onDeleteItinerary={trip.handleDeleteItinerary}
          onSaveAndClose={trip.handleSaveCalendarChanges}
          onUpdateLiveEvents={trip.handleUpdateLiveEvents}
          onClose={() => router.push("/")} 
        />
      ) : (
        <div className="relative w-full h-[calc(100vh-56px)] flex flex-col-reverse md:flex-row overflow-hidden bg-gray-100 dark:bg-gray-950 transition-colors">
          
          <div style={{ width: isMounted && window.innerWidth >= 768 ? (isSidebarOpen ? `${sidebarWidth}px` : "0px") : undefined }} className={`relative z-20 flex flex-col transition-all md:transition-none duration-300 ease-in-out bg-white dark:bg-gray-900 shadow-xl border-r border-gray-200 dark:border-gray-800 ${isSidebarOpen ? "h-[50vh] md:h-full" : "h-12 md:h-full"} w-full md:w-auto`}>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 w-6 h-16 bg-white dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-700 rounded-r-md shadow-md items-center justify-center text-gray-500 dark:text-gray-400 z-30">
              {isSidebarOpen ? "◀" : "▶"}
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden w-full h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold z-30 flex-shrink-0">
              {isSidebarOpen ? "▼ 收起清單選項" : "▲ 展開清單選項"}
            </button>
            {isSidebarOpen && <div onMouseDown={startResize} className="hidden md:block absolute top-0 right-0 bottom-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400/50 bg-transparent transition z-40" />}

            <div className="flex-1 w-full h-full overflow-hidden relative">
              <div className="w-full h-full absolute top-0 left-0 flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <Sidebar 
                    places={trip.savedPlaces} 
                    itineraries={trip.itineraries} 
                    activeItineraryId={trip.activeItineraryId} 
                    selectedPlace={trip.sidebarSelectedPlace} 
                    onPlaceClick={trip.handleSidebarPlaceClick}
                    onAssignPlace={trip.handleAssignPlace}
                    onDeletePlace={trip.handleDeletePlace}
                    onEditPlace={trip.handleEditPlace}
                    onDragEnd={trip.handleDragEnd}
                    onCreateItinerary={() => trip.handleCreateItinerary("我的新行程", "", "")}
                    onRenameItinerary={trip.handleRenameItinerary} 
                    onSwitchItinerary={trip.handleSwitchItinerary} 
                    hoveredPlaceId={trip.hoveredPlaceId}
                    setHoveredPlaceId={trip.setHoveredPlaceId}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 relative h-full">
            <MapCanvas 
              savedPlaces={trip.savedPlaces} 
              selectedLocation={trip.selectedLocation || trip.panLocation} 
              onMapClick={trip.handleMapClick} 
              onMarkerClick={trip.handleMarkerClick}
              hoveredPlaceId={trip.hoveredPlaceId}
              onMarkerMouseEnter={(id) => trip.setHoveredPlaceId(id)}
              onMarkerMouseLeave={() => trip.setHoveredPlaceId(null)}
              dailyPaths={trip.visiblePaths} 
            >
              {/* 🌟 1. 搜尋欄：由 MapSearchBar 內部自理 TOP_CENTER */}
              <MapSearchBar onPlaceSelect={trip.handleMapClick} />

              {/* 🚀 2. 當日路線 Toggle：歸位至搜尋欄左手邊 (原生 TOP_LEFT) */}
              {trip.dailyPaths.length > 0 && (
                <MapControl position={ControlPosition.TOP_LEFT}>
                  <div className="ml-3 mt-4 flex flex-col items-start">
                    
                    {/* 🚀 極簡正方形掣：無文字、無計數器，高度與 SearchBar 的 h-10 完美呼應 */}
                    <button 
                      type="button"
                      onClick={() => setShowRouteMenu(!showRouteMenu)}
                      className="md:hidden w-10 h-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-md border border-gray-200/80 dark:border-gray-800/80 flex items-center justify-center text-lg active:scale-95 transition-all"
                      title="切換路線圖層"
                    >
                      🗺️
                    </button>

                    {/* 彈出選單 */}
                    <div className={`${
                      showRouteMenu ? "flex animate-slideDown" : "hidden"
                    } md:flex flex-col gap-1 mt-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[45vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar min-w-[130px]`}>
                      <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 border-b border-gray-100 dark:border-gray-800 pb-1 mb-1">
                        <span>🗺️ 顯示路線</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {trip.dailyPaths.map((pathData, idx) => {
                          const isVisible = !trip.hiddenDays.has(pathData.day);
                          return (
                            <label key={pathData.day} className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-lg transition select-none ${isVisible ? "text-gray-900 dark:text-white font-bold" : "text-gray-400"}`}>
                              <input type="checkbox" checked={isVisible} onChange={() => trip.toggleDayVisibility(pathData.day)} className="w-3.5 h-3.5 rounded cursor-pointer accent-blue-600 shrink-0" style={{ accentColor: pathData.strokeColor }} />
                              <div className="w-3 h-1 rounded-full shrink-0" style={{ backgroundColor: pathData.strokeColor }} />
                              <span className="text-xs">Day {idx + 1}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </MapControl>
              )}

              {/* 彈出表單 InfoWindow */}
              {trip.selectedLocation && (
                <InfoWindow position={trip.selectedLocation} onCloseClick={trip.handleCancel} pixelOffset={[0, -40]}>
                  <AddPlaceForm 
                    placeName={trip.placeName} setPlaceName={trip.setPlaceName} 
                    placeAddress={trip.placeAddress} setPlaceAddress={trip.setPlaceAddress}
                    placePhone={trip.placePhone} setPlacePhone={trip.setPlacePhone}
                    placeHours={trip.placeHours}
                    activeFieldsConfig={trip.activeFieldsConfig}
                    dynamicFieldValues={trip.dynamicFieldValues}
                    setDynamicFieldValues={trip.setDynamicFieldValues}
                    onSubmit={(e, finalDynamicValues) => {
                      const isSuccess = trip.handleSavePlace(e, finalDynamicValues);
                      if (isSuccess) setIsSidebarOpen(true);
                    }} 
                    onCancel={trip.handleCancel} 
                    isEditing={!!trip.editingPlaceId} 
                    googleMapsUrl={trip.selectedLocation.googleMapsUrl} 
                  />
                </InfoWindow>
              )}
            </MapCanvas>
          </div>
        </div>
      )}
    </APIProvider>
  );
}