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
}

export default function OrganizeCalendar({ 
  calendarRef, startDate, validRangeEnd, localEvents, places, 
  selectedPlace, setSelectedPlace, updateLocalStateFromCalendar, showList,
  hoveredPlaceId, onFlyToPlace 
}: OrganizeCalendarProps) {

  // 🚀 新增：控制 24 小時全日檢視嘅 Toggle 狀態 (預設 false = 06:00 - 24:00)
  const [isExtendedView, setIsExtendedView] = useState(false);

  const hasDateRange = startDate && validRangeEnd;

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-gray-900 transition-colors relative min-w-[300px]">
      
      {/* 🚀 時間軸範圍切換列 */}
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
          // 🚀 關鍵：套用動態時間範圍
          slotMinTime={isExtendedView ? "00:00:00" : "06:00:00"}
          slotMaxTime="24:00:00"
          allDaySlot={false}
          editable={true} 
          droppable={true}
          events={localEvents}
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
                className={`w-full h-full p-1 text-[11px] leading-tight truncate text-white font-semibold cursor-pointer flex items-center justify-between rounded transition-all duration-150 relative group/ev ${
                  isEventSelected 
                    ? "ring-2 ring-black dark:ring-white border border-white bg-blue-700 dark:bg-blue-800" 
                    : isEventHovered
                      ? "bg-amber-500 dark:bg-amber-600 ring-4 ring-amber-400 dark:ring-amber-500 font-black scale-[1.01] z-30 text-gray-900 dark:text-white"
                      : "bg-blue-600 dark:bg-blue-600/80 hover:bg-blue-500"
                }`}
              >
                <span className="truncate pr-6">📍 {eventInfo.event.title}</span>
                {place && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onFlyToPlace(place); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-white/90 dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-500 hover:text-white transition shadow-sm opacity-0 group-hover/ev:opacity-100 z-40 text-[10px]"
                    title="飛去地圖定位"
                  >
                    🎯
                  </button>
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