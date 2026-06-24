// components/OrganizeMode.tsx
"use client";
import { useEffect, useRef, useState } from "react"; // 🧹 抽脂：useMemo 已退場
import { Draggable } from "@fullcalendar/interaction";
import { Place, CalendarEvent, Itinerary } from "./types"; 
import MapCanvas from "./MapCanvas";
import OrganizeHeader from "./organize/OrganizeHeader";
import OrganizeSidebar from "./organize/OrganizeSidebar";
import OrganizeCalendar from "./organize/OrganizeCalendar";
import { useDailyPaths } from "../hooks/useDailyPaths"; // 🚀 1. 引入瘦身內核

interface OrganizeModeProps {
  places: Place[];
  itineraries: Itinerary[];
  activeItineraryId: string;
  onSwitchItinerary: (id: string) => void;
  onCreateItinerary: (name: string, start: string, end: string) => void;
  onRenameItinerary: (id: string, newName: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onDeleteItinerary: (id: string) => void;
  onUpdateLiveEvents: (events: CalendarEvent[]) => void;
  onSaveAndClose: (updatedEvents: CalendarEvent[]) => void;
  onClose: () => void;
  onEditPlace?: (place: Place) => void; 
}

export default function OrganizeMode({
  places,
  itineraries,
  activeItineraryId,
  onSwitchItinerary,
  onCreateItinerary,
  onRenameItinerary,
  onDateRangeChange,
  onDeleteItinerary,
  onUpdateLiveEvents,
  onSaveAndClose,
  onClose,
  onEditPlace, 
}: OrganizeModeProps) {
  const calendarRef = useRef<any>(null);
  const externalEventsRef = useRef<HTMLDivElement>(null);
  const [showRouteMenu, setShowRouteMenu] = useState(false);
  
  const activeItinerary = itineraries.find((i) => i.id === activeItineraryId) || itineraries[0];
  const isViewer = (activeItinerary as any)?.access === "viewer";

  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(
    activeItinerary.calendarEvents || [],
  );

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  {/* 💥 原本的神級導航彈 useEffect 經已拆遷，移交 OrganizeSidebar 內核接管 */}

  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [panLocation, setPanLocation] = useState<{ lat: number; lng: number; } | null>(null);

  const [showList, setShowList] = useState(true);
  const [showMap, setShowMap] = useState(true);

  const [listWidth, setListWidth] = useState(340);
  const isResizingList = useRef(false);
  const [mapWidth, setMapWidth] = useState(600);
  const isResizingMap = useRef(false);

  // =====================================================================
  // 🚀 2. 內核通電：一句 Custom Hook，收服原本 65 行的口水代碼！
  // =====================================================================
  const { dailyPaths, visiblePaths, hiddenDays, toggleDayVisibility } = useDailyPaths(
    activeItinerary,
    localEvents,
    places
  );

  const scheduledPlaceIds = new Set(
    localEvents.map((e) => e.extendedProps?.placeId),
  );

  useEffect(() => {
    setLocalEvents(activeItinerary.calendarEvents || []);
    setSelectedPlace(null);
  }, [activeItineraryId, activeItinerary.calendarEvents]);

  let validRangeEnd = activeItinerary?.endDate || "";
  if (validRangeEnd) {
    const d = new Date(validRangeEnd);
    d.setDate(d.getDate() + 1);
    validRangeEnd = d.toISOString().split("T")[0];
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMapWidth(window.innerWidth / 2);
      setTimeout(() => calendarRef.current?.getApi().updateSize(), 50);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingList.current) {
        const newWidth = e.clientX;
        if (newWidth > 260 && newWidth < 500) setListWidth(newWidth);
      } else if (isResizingMap.current) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < window.innerWidth * 0.8)
          setMapWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isResizingList.current || isResizingMap.current) {
        isResizingList.current = false;
        isResizingMap.current = false;
        document.body.style.cursor = "default";
        calendarRef.current?.getApi().updateSize();
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (externalEventsRef.current && !isViewer) {
      const draggable = new Draggable(externalEventsRef.current, {
        itemSelector: ".fc-event",
        minDistance: 3,
        eventData: function (eventEl) {
          return {
            title: eventEl.getAttribute("data-title") || eventEl.innerText,
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            extendedProps: { placeId: eventEl.getAttribute("data-place-id") },
          };
        },
      });
      return () => draggable.destroy();
    }
  }, [isViewer]);

  const updateLocalStateFromCalendar = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    const currentEvents = calendarApi.getEvents().map((ev: any) => ({
      id: ev.id,
      title: ev.title,
      start: ev.start?.toISOString() || ev.start,
      end:
        ev.end?.toISOString() ||
        ev.end ||
        new Date(ev.start.getTime() + 60 * 60 * 1000).toISOString(),
      extendedProps: { placeId: ev.extendedProps.placeId },
    }));
    setLocalEvents(currentEvents);
    onUpdateLiveEvents(currentEvents); 
  };

  const triggerCalendarResize = () => calendarRef.current?.getApi().updateSize();

  const handleFlyToPlace = (place: Place) => {
    setSelectedPlace(place);
    setPanLocation({ lat: place.lat, lng: place.lng });
    if (!showMap) setShowMap(true);
  };

  const handleInternalSwitchItinerary = (id: string) => {
    onUpdateLiveEvents(localEvents);
    onSwitchItinerary(id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col select-none animate-fadeIn transition-colors">
      <OrganizeHeader
        itineraries={itineraries}
        activeItineraryId={activeItineraryId}
        onSwitchItinerary={handleInternalSwitchItinerary}
        onCreateItinerary={onCreateItinerary}
        onRenameItinerary={onRenameItinerary}
        onDateRangeChange={onDateRangeChange}
        onDeleteItinerary={onDeleteItinerary} 
        showList={showList}
        setShowList={setShowList}
        showMap={showMap}
        setShowMap={setShowMap}
        onSave={() => onSaveAndClose(localEvents)}
        onClose={onClose}
        triggerCalendarResize={triggerCalendarResize}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ===================================================================== */}
        {/* 🚀 3. 完美閉環：地圖 Click -> 傳給老豆 -> 老豆再透過 Props 餵給 Sidebar 觸發破門 */}
        {/* ===================================================================== */}
        <OrganizeSidebar 
          availablePlaces={places} 
          scheduledPlaceIds={scheduledPlaceIds} 
          selectedPlace={selectedPlace} // 🎯 導彈引信接波點
          setSelectedPlace={setSelectedPlace} 
          hoveredPlaceId={hoveredPlaceId} 
          setHoveredPlaceId={setHoveredPlaceId} 
          dragZoneRef={externalEventsRef} 
          showList={showList} 
          listWidth={listWidth} 
          onFlyToPlace={handleFlyToPlace} 
          onEditPlace={onEditPlace} 
        />
        
        {showList && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              isResizingList.current = true;
              document.body.style.cursor = "col-resize";
            }}
            className="w-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors z-10 shrink-0"
          />
        )}

        <OrganizeCalendar
          calendarRef={calendarRef}
          startDate={activeItinerary?.startDate || ""}
          validRangeEnd={validRangeEnd}
          localEvents={localEvents}
          places={places}
          selectedPlace={selectedPlace}
          setSelectedPlace={setSelectedPlace}
          updateLocalStateFromCalendar={updateLocalStateFromCalendar}
          showList={showList}
          setHoveredPlaceId={setHoveredPlaceId}
          hoveredPlaceId={hoveredPlaceId}
          onFlyToPlace={handleFlyToPlace}
          onEditPlace={onEditPlace} 
          isViewer={isViewer}
        />

        {showMap && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              isResizingMap.current = true;
              document.body.style.cursor = "col-resize";
            }}
            className="w-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors z-10 shrink-0"
          />
        )}

        <div
          className={`transition-all duration-0 relative bg-gray-100 dark:bg-gray-950 overflow-hidden ${showMap ? "" : "!w-0 opacity-0"}`}
          style={{ width: showMap ? `${mapWidth}px` : "0px" }}
        >
          <div className="absolute inset-0 w-full h-full">
            <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_10px_0_15px_-10px_rgba(0,0,0,0.1)] dark:shadow-[inset_10px_0_15px_-10px_rgba(0,0,0,0.5)]"></div>

            {dailyPaths.length > 0 && (
              <div className="absolute top-4 left-4 z-20 flex flex-col items-start">
                <button
                  type="button"
                  onClick={() => setShowRouteMenu(!showRouteMenu)}
                  className="md:hidden w-9 h-9 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center text-base font-bold active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                  title="切換路線圖層"
                >
                  🗺️
                </button>

                <div
                  className={`${showRouteMenu ? "flex" : "hidden"} md:flex flex-col gap-2 mt-2 md:mt-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-2.5 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 max-h-[40vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar w-40 md:w-auto`}
                >
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                    🗺️ 顯示路線
                  </div>
                  <div className="flex flex-col gap-1">
                    {dailyPaths.map((pathData, idx) => {
                      const isVisible = !hiddenDays.has(pathData.day);
                      return (
                        <label
                          key={pathData.day}
                          className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1.5 rounded transition"
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleDayVisibility(pathData.day)}
                            className="w-3.5 h-3.5 rounded-sm cursor-pointer"
                            style={{ accentColor: pathData.strokeColor }}
                          />
                          <div
                            className="w-4 h-1 rounded-full shrink-0"
                            style={{ backgroundColor: pathData.strokeColor }}
                          ></div>
                          <span
                            className={`text-xs font-bold ${isVisible ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-600"}`}
                          >
                            Day {idx + 1}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <MapCanvas
              savedPlaces={places}
              selectedLocation={panLocation}
              onMapClick={() => setSelectedPlace(null)}
              onMarkerClick={(place) => setSelectedPlace(place)} // 🎯 發出點擊訊號
              hoveredPlaceId={hoveredPlaceId}
              onMarkerMouseEnter={(id) => setHoveredPlaceId(id)}
              onMarkerMouseLeave={() => setHoveredPlaceId(null)}
              dailyPaths={visiblePaths}
              activePlaceId={selectedPlace?.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}