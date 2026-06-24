// components/Map.tsx
"use client";
import { useState, useEffect, useRef } from "react"; // 🧹 抽脂細節：已將 useMemo 移除
import { APIProvider, MapControl, ControlPosition } from "@vis.gl/react-google-maps";
import { useRouter, useSearchParams } from "next/navigation";
import { useTripData } from "../hooks/useTripData"; 

import Sidebar from "./Sidebar";
import AddPlaceForm from "./AddPlaceForm"; // ⚠️ 必須保留，供下方 OrganizeMode Modal 使用
import MapCanvas from "./MapCanvas";
import OrganizeMode from "./OrganizeMode";
import MapSearchBar from "./MapSearchBar";
import ShareModal from "./share/ShareModal";
import PlaceFormPopup from "./PlaceFormPopup"; // 🚀 引入響應式雙軌表單

export default function Map() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOrganizeMode = searchParams.get("mode") === "organize";

  const trip = useTripData();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [sidebarWidth, setSidebarWidth] = useState(450); 
  const [sidebarHeight, setSidebarHeight] = useState(350); 

  const isResizing = useRef(false);
  const isMobileResizing = useRef(false); 

  const sidebarDOMRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [showRouteMenu, setShowRouteMenu] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<string>("places");
  
  const isThisPlaceReadonly = trip.sidebarSelectedPlace?.access === "viewer" || trip.sidebarSelectedPlace?.isShared;
  const [isLibShareOpen, setIsLibShareOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true); 

    const handleMove = (clientY: number, clientX: number) => {
      if (!sidebarDOMRef.current) return;

      if (isResizing.current) { 
        if (clientX >= 280 && clientX <= 600) {
          sidebarDOMRef.current.style.width = `${clientX}px`;
        }
      }
      if (isMobileResizing.current) {
        const windowH = window.innerHeight;
        const newH = windowH - clientY; 
        if (newH >= 80 && newH <= windowH * 0.85) {
          sidebarDOMRef.current.style.height = `${newH}px`;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY, e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientY, e.touches[0].clientX);
    };

    const handleUp = () => { 
      if (isResizing.current && sidebarDOMRef.current) {
        isResizing.current = false;
        setIsDragging(false);
        const finalW = parseInt(sidebarDOMRef.current.style.width, 10);
        if (!isNaN(finalW)) setSidebarWidth(finalW);
      }

      if (isMobileResizing.current && sidebarDOMRef.current) {
        isMobileResizing.current = false;
        setIsDragging(false);
        const finalH = parseInt(sidebarDOMRef.current.style.height, 10);
        if (!isNaN(finalH)) setSidebarHeight(finalH);
      }

      document.body.style.cursor = "default"; 
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("mousemove", handleMouseMove); 
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);

    return () => { 
      window.removeEventListener("mousemove", handleMouseMove); 
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent) => { 
    e.preventDefault(); 
    isResizing.current = true; 
    setIsDragging(true); 
    document.body.style.cursor = "col-resize"; 
  };
  
  const startMobileResize = () => {
    isMobileResizing.current = true;
    setIsDragging(true); 
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  {/* 🧹 毒瘤 safeMapPadding 經已徹底清除 */}

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
          onEditPlace={trip.handleEditPlace} 
        />
      ) : (
        <div className="relative w-full h-[calc(100vh-56px)] flex flex-col-reverse md:flex-row overflow-hidden bg-gray-100 dark:bg-gray-950 transition-colors">
          
          <div 
            ref={sidebarDOMRef}
            style={{ 
              width: isMounted && window.innerWidth >= 768 ? (isSidebarOpen ? `${sidebarWidth}px` : "0px") : "100%",
              height: isMounted && window.innerWidth < 768 ? (isSidebarOpen ? `${sidebarHeight}px` : "48px") : "100%",
              contain: "paint layout",
              willChange: isMounted && window.innerWidth < 768 ? "height" : "width",
            }} 
            className={`relative z-20 flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-t md:border-t-0 md:border-r border-gray-200 dark:border-gray-800 w-full md:w-auto ${
              isDragging ? "!transition-none" : "transition-all md:transition-none duration-300 ease-out"
            }`}
          >
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 w-6 h-16 bg-white dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-700 rounded-r-md shadow-md items-center justify-center text-gray-500 dark:text-gray-400 z-30 cursor-pointer">
              {isSidebarOpen ? "◀" : "▶"}
            </button>

            <div 
              onTouchStart={startMobileResize}
              onMouseDown={startMobileResize}
              onDoubleClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              style={{ touchAction: "none" }} 
              className="md:hidden w-full h-12 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 cursor-row-resize z-30 flex-shrink-0 select-none relative group"
            >
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {sidebarTab === "places" ? "📍 景點庫" : "📱 行程表"}
              </span>

              <div className="absolute left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full transition-colors group-hover:bg-gray-400" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); 
                  setIsSidebarOpen(!isSidebarOpen);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-200/70 dark:bg-gray-800/70 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition active:scale-90 shadow-2xs cursor-pointer"
              >
                {isSidebarOpen ? <span className="w-2.5 h-0.5 bg-current rounded-sm" /> : <span className="text-[10px] font-black">▲</span>}
              </button>
            </div>

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
                    activeTab={sidebarTab}
                    onTabChange={setSidebarTab}
                    onOpenShareModal={() => setIsLibShareOpen(true)}
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
              activePlaceId={trip.editingPlaceId || trip.sidebarSelectedPlace?.id}
            >
              <MapSearchBar onPlaceSelect={trip.handleMapClick} />

              {trip.dailyPaths.length > 0 && sidebarTab !== "places" && sidebarTab !== "placeLibrary" && (
                <MapControl position={ControlPosition.TOP_LEFT}>
                  <div className="ml-3 mt-4 flex flex-col items-start">
                    <button 
                      type="button" onClick={() => setShowRouteMenu(!showRouteMenu)}
                      className="md:hidden w-10 h-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-md border border-gray-200/80 dark:border-gray-800/80 flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer"
                    >🗺️</button>
                    <div className={`${showRouteMenu ? "flex animate-slideDown" : "hidden"} md:flex flex-col gap-1 mt-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[45vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar min-w-[130px]`}>
                      <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 border-b border-gray-100 dark:border-gray-800 pb-1 mb-1"><span>🗺️ 顯示路線</span></div>
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

              <PlaceFormPopup 
                trip={trip} 
                isReadonly={isThisPlaceReadonly} 
                onSaveSuccess={() => setIsSidebarOpen(true)} 
              />

            </MapCanvas>
          </div>
        </div>
      )}

      {isOrganizeMode && trip.editingPlaceId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2"><span className="text-xl">✏️</span><h3 className="font-black text-base text-gray-900 dark:text-white tracking-wide">編輯景點資料</h3></div>
              <button type="button" onClick={trip.handleCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-600 dark:text-gray-300 font-bold text-sm transition cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col [&_form]:w-full [&_form]:max-w-none [&_input[type=text]]:w-full [&_input[type=tel]]:w-full [&_input[type=number]]:w-full [&_select]:w-full [&_textarea]:w-full">
              <AddPlaceForm 
                placeName={trip.placeName} setPlaceName={trip.setPlaceName} 
                placeAddress={trip.placeAddress} setPlaceAddress={trip.setPlaceAddress}
                placePhone={trip.placePhone} setPlacePhone={trip.setPlacePhone}
                placeHours={trip.placeHours} activeFieldsConfig={trip.activeFieldsConfig}
                dynamicFieldValues={trip.dynamicFieldValues} setDynamicFieldValues={trip.setDynamicFieldValues}
                onSubmit={(e, finalDynamicValues) => { trip.handleSavePlace(e, finalDynamicValues); }} 
                onCancel={trip.handleCancel} isEditing={true} 
                googleMapsUrl={trip.selectedLocation?.googleMapsUrl || ""} 
                placeColor={trip.placeColor} setPlaceColor={trip.setPlaceColor}
              />
            </div>
          </div>
        </div>
      )}

      <ShareModal mode="library" isOpen={isLibShareOpen} onClose={() => setIsLibShareOpen(false)} />
    </APIProvider>
  );
}