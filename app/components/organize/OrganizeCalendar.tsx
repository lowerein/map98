// components/organize/OrganizeCalendar.tsx
"use client";
import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Place, CalendarEvent } from "../types";

interface OrganizeCalendarProps {
  calendarRef: React.RefObject<any>;
  startDate: string;
  validRangeEnd: string;
  localEvents: CalendarEvent[];
  places: Place[];
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;
  updateLocalStateFromCalendar: () => void;
  showList: boolean;
  hoveredPlaceId: string | null;
  onFlyToPlace: (place: Place) => void;
  onEditPlace?: (place: Place) => void; 
}

export default function OrganizeCalendar({ 
  calendarRef, startDate, validRangeEnd, localEvents, places, 
  selectedPlace, setSelectedPlace, updateLocalStateFromCalendar, showList,
  hoveredPlaceId, onFlyToPlace, onEditPlace 
}: OrganizeCalendarProps) {

  const [isExtendedView, setIsExtendedView] = useState(false);
  const hasDateRange = startDate && validRangeEnd;

  // 🚀 核心調色盤對接：將 localEvents 注入景點自訂顏色
  const coloredEvents = localEvents.map((ev) => {
    const place = places.find(p => p.id === ev.extendedProps?.placeId);
    const customColor = place?.color || "#2563eb"; // 預設 Google 皇家藍

    return {
      ...ev,
      backgroundColor: customColor,
      borderColor: customColor,
      textColor: "#ffffff" 
    };
  });

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-gray-900 transition-colors relative min-w-[300px]">
      
      {/* 時間軸範圍切換列 */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-gray-950/60 border-b border-gray-200 dark:border-gray-800 select-none shrink-0">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span>🕒</span> {isExtendedView ? "00:00 - 24:00 (全日視角)" : "06:00 - 24:00 (標準日間)"}
        </span>

        <button
          type="button"
          onClick={() => setIsExtendedView(!isExtendedView)}
          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 border shadow-sm ${
            isExtendedView 
              ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800" 
              : "bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 hover:bg-gray-50"
          }`}
        >
          <span>{isExtendedView ? "🌙" : "☀️"}</span>
          <span>{isExtendedView ? "日間檢視" : "展開全日檢視"}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView={hasDateRange ? "customItinerary" : "timeGridWeek"}
          initialDate={startDate || undefined}
          validRange={{ start: startDate || undefined, end: validRangeEnd || undefined }}
          views={{
            customItinerary: {
              type: 'timeGrid',
              visibleRange: hasDateRange ? { start: startDate, end: validRangeEnd } : undefined
            }
          }}
          slotMinTime={isExtendedView ? "00:00:00" : "06:00:00"}
          slotMaxTime="24:00:00"
          allDaySlot={false}
          editable={true} 
          droppable={true}
          
          events={coloredEvents} // 👈 餵入帶顏色的 Events 陣列
          
          eventReceive={updateLocalStateFromCalendar}
          eventDrop={updateLocalStateFromCalendar}
          eventResize={updateLocalStateFromCalendar}
          
          dayHeaderClassNames={(arg) => {
            const d = arg.date; 
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (dateStr === startDate) return "!bg-emerald-50/80 dark:!bg-emerald-900/30 !text-emerald-700 dark:!text-emerald-400 font-black border-t-4 border-t-emerald-500";
            return "";
          }}
          
          eventClick={(info) => {
            const place = places.find(p => p.id === info.event.extendedProps?.placeId);
            if (place) setSelectedPlace(place);
          }}
          
          eventDragStop={(info) => {
            if (!showList) return; 
            const zoneEl = document.getElementById("external-events-zone");
            if (!zoneEl) return;
            const rect = zoneEl.getBoundingClientRect();
            if (info.jsEvent.clientX >= rect.left && info.jsEvent.clientX <= rect.right && info.jsEvent.clientY >= rect.top && info.jsEvent.clientY <= rect.bottom) {
              info.event.remove(); 
              setTimeout(updateLocalStateFromCalendar, 50);
            }
          }}
          
          eventContent={(eventInfo) => {
            const placeId = eventInfo.event.extendedProps?.placeId;
            const isEventSelected = selectedPlace?.id === placeId;
            const isEventHovered = hoveredPlaceId === placeId;
            const place = places.find(p => p.id === placeId);

            return (
              <div 
                // 🚀 拿走寫死的 bg-blue-600，設定為 bg-transparent，完美呈現 FullCalendar 注入嘅背景色！
                // 當被選中或 Hover 時，才疊上黑色邊框或高亮黃色
                className={`w-full h-full p-1 text-[11px] leading-tight truncate text-white font-semibold cursor-pointer flex items-center justify-between rounded transition-all duration-150 relative group/ev ${
                  isEventSelected 
                    ? "ring-2 ring-black dark:ring-white border border-white font-black shadow-md" 
                    : isEventHovered
                      ? "!bg-amber-500 ring-4 ring-amber-400 font-black scale-[1.01] z-30 !text-gray-900 shadow-lg"
                      : "bg-transparent hover:brightness-110"
                }`}
              >
                <span className="truncate pr-11">📍 {eventInfo.event.title}</span>
                
                {place && (
                  <div 
                    onMouseDown={(e) => e.stopPropagation()} 
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/ev:opacity-100 z-40 bg-black/25 dark:bg-white/25 p-0.5 rounded backdrop-blur-xs transition-opacity"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        onEditPlace?.(place);
                      }}
                      className="w-4 h-4 flex items-center justify-center bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 rounded hover:bg-amber-500 hover:text-white transition shadow-sm text-[9px]"
                      title="編輯此景點"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlyToPlace(place);
                      }}
                      className="w-4 h-4 flex items-center justify-center bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-500 hover:text-white transition shadow-sm text-[9px]"
                      title="飛去地圖定位"
                    >
                      🎯
                    </button>
                  </div>
                )}
              </div>
            );
          }}
          height="auto"
        />
      </div>
    </div>
  );
}