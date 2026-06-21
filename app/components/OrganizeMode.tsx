// components/OrganizeMode.tsx
"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { Place, CalendarEvent, Itinerary } from "./types"; // 🚀 新增引入 Itinerary
import MapCanvas from "./MapCanvas";
import OrganizeHeader from "./organize/OrganizeHeader";
import OrganizeSidebar from "./organize/OrganizeSidebar";
import OrganizeCalendar from "./organize/OrganizeCalendar";

interface OrganizeModeProps {
  places: Place[];
  itineraries: Itinerary[];
  activeItineraryId: string;
  onSwitchItinerary: (id: string) => void;
  // 🚀 升級：支援從 Modal 接收名稱同日期
  onCreateItinerary: (name: string, start: string, end: string) => void;
  onRenameItinerary: (id: string, newName: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  // 🚀 新增：接收刪除行程嘅 Function
  onDeleteItinerary: (id: string) => void;
  onUpdateLiveEvents: (events: CalendarEvent[]) => void;
  onSaveAndClose: (updatedEvents: CalendarEvent[]) => void;
  onClose: () => void;
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
}: OrganizeModeProps) {
  const calendarRef = useRef<any>(null);
  const externalEventsRef = useRef<HTMLDivElement>(null);
  const [showRouteMenu, setShowRouteMenu] = useState(false);
  // 🎯 找出目前選中嘅行程
  const activeItinerary =
    itineraries.find((i) => i.id === activeItineraryId) || itineraries[0];

  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(
    activeItinerary.calendarEvents || [],
  );

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [panLocation, setPanLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [showList, setShowList] = useState(true);
  const [showMap, setShowMap] = useState(true);

  const [listWidth, setListWidth] = useState(340);
  const isResizingList = useRef(false);
  const [mapWidth, setMapWidth] = useState(600);
  const isResizingMap = useRef(false);

  // 記錄邊啲日子嘅路線被隱藏咗
  const [hiddenDays, setHiddenDays] = useState<Set<string>>(new Set());

  const scheduledPlaceIds = new Set(
    localEvents.map((e) => e.extendedProps?.placeId),
  );
  //const availablePlaces = places.filter((p) => !scheduledPlaceIds.has(p.id));

  // 🚀 核心：當用家切換行程嗰陣，日曆要即刻載入新行程嘅資料
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

  // 實時計算每日按時間排序嘅地圖點對點路線數據
  const dailyPaths = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};

    localEvents.forEach((ev) => {
      if (!ev.start) return;
      const dateStr =
        typeof ev.start === "string"
          ? ev.start.split("T")[0]
          : new Date(ev.start).toISOString().split("T")[0];
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(ev);
    });

    const sortedDays = Object.keys(groups).sort();
    const dayColors = [
      "#2563eb",
      "#10b981",
      "#f97316",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
    ];

    return sortedDays.map((day, idx) => {
      const sortedEventsInDay = groups[day].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );

      const points = sortedEventsInDay
        .map((ev) => places.find((p) => p.id === ev.extendedProps?.placeId))
        .filter((p): p is Place => !!p)
        .map((p) => ({ lat: p.lat, lng: p.lng }));

      return {
        day,
        strokeColor: dayColors[idx % dayColors.length],
        points,
      };
    });
  }, [localEvents, places]);

  // 根據 hiddenDays 狀態，過濾出要顯示嘅路線
  const visiblePaths = useMemo(() => {
    return dailyPaths.filter((path) => !hiddenDays.has(path.day));
  }, [dailyPaths, hiddenDays]);

  // 切換顯示/隱藏某一日路線嘅 Function
  const toggleDayVisibility = (day: string) => {
    setHiddenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

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
    if (externalEventsRef.current) {
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
  }, []);

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
    onUpdateLiveEvents(currentEvents); // 🚀 即時寫回主程式狀態
  };

  const triggerCalendarResize = () =>
    calendarRef.current?.getApi().updateSize();

  const handleFlyToPlace = (place: Place) => {
    setSelectedPlace(place);
    setPanLocation({ lat: place.lat, lng: place.lng });
    if (!showMap) setShowMap(true);
  };

  // 🚀 切換行程前，先確保當前日曆進度已保存
  const handleInternalSwitchItinerary = (id: string) => {
    onUpdateLiveEvents(localEvents);
    onSwitchItinerary(id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col select-none animate-fadeIn transition-colors">
      {/* 🚀 將行程控制 Props (包含 onDeleteItinerary) 傳入 Header */}
      <OrganizeHeader
        itineraries={itineraries}
        activeItineraryId={activeItineraryId}
        onSwitchItinerary={handleInternalSwitchItinerary}
        onCreateItinerary={onCreateItinerary}
        onRenameItinerary={onRenameItinerary}
        onDateRangeChange={onDateRangeChange}
        onDeleteItinerary={onDeleteItinerary} // 🚀 完美接駁刪除功能
        showList={showList}
        setShowList={setShowList}
        showMap={showMap}
        setShowMap={setShowMap}
        onSave={() => onSaveAndClose(localEvents)}
        onClose={onClose}
        triggerCalendarResize={triggerCalendarResize}
      />

      <div className="flex flex-1 overflow-hidden">
<OrganizeSidebar 
  availablePlaces={places} // 👈 1. 直接一巴掌將原始的全量 places 餵畀佢！
  scheduledPlaceIds={scheduledPlaceIds} // 👈 2. 餵埋已存在嘅 Set 名單畀佢做對比！
  selectedPlace={selectedPlace} 
  setSelectedPlace={setSelectedPlace} 
  hoveredPlaceId={hoveredPlaceId} 
  setHoveredPlaceId={setHoveredPlaceId} 
  dragZoneRef={externalEventsRef} 
  showList={showList} 
  listWidth={listWidth} 
  onFlyToPlace={handleFlyToPlace} 
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
          hoveredPlaceId={hoveredPlaceId}
          onFlyToPlace={handleFlyToPlace}
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

            {/* 懸浮路線控制面板 */}
            {dailyPaths.length > 0 && (
              // 🚀 修改：外層改為 flex-col
              <div className="absolute top-4 left-4 z-20 flex flex-col items-start">
                {/* 🚀 新增：手機版專用圓形圖層按鈕 */}
                <button
                  type="button"
                  onClick={() => setShowRouteMenu(!showRouteMenu)}
                  className="md:hidden w-9 h-9 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center text-base font-bold active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                  title="切換路線圖層"
                >
                  🗺️
                </button>

                {/* 🚀 修改：控制選單主體 (響應式顯隱切換) */}
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
              onMapClick={() => {}}
              onMarkerClick={(place) => setSelectedPlace(place)}
              hoveredPlaceId={hoveredPlaceId}
              onMarkerMouseEnter={(id) => setHoveredPlaceId(id)}
              onMarkerMouseLeave={() => setHoveredPlaceId(null)}
              dailyPaths={visiblePaths}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
