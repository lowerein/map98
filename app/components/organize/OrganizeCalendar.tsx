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
  setHoveredPlaceId: (id: string | null) => void;
  onFlyToPlace: (place: Place) => void;
  onEditPlace?: (place: Place) => void;

  // 🚀 1. 權限接收器：接收老豆傳來的「唯讀身分證」
  isViewer?: boolean; 
}

export default function OrganizeCalendar({
  calendarRef,
  startDate,
  validRangeEnd,
  localEvents,
  places,
  selectedPlace,
  setSelectedPlace,
  updateLocalStateFromCalendar,
  showList,
  hoveredPlaceId,
  setHoveredPlaceId, 
  onFlyToPlace,
  onEditPlace,
  isViewer = false, // 🚀 保底預設為 false（可編輯）
}: OrganizeCalendarProps) {
  const [isExtendedView, setIsExtendedView] = useState(false);
  const hasDateRange = startDate && validRangeEnd;

  const coloredEvents = localEvents.map((ev) => {
    const place = places.find((p) => p.id === ev.extendedProps?.placeId);
    const customColor = place?.color || "#2563eb"; 

    return {
      ...ev,
      backgroundColor: customColor,
      borderColor: customColor,
      textColor: "#ffffff",
    };
  });

  return (
    <div
      id="organize-calendar-pdf-zone"
      className="flex flex-col flex-1 bg-white dark:bg-gray-900 transition-colors relative min-w-[300px]"
    >
      {/* 時間軸範圍切換列 */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-gray-950/60 border-b border-gray-200 dark:border-gray-800 select-none shrink-0">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span>🕒</span>{" "}
          {isExtendedView
            ? "00:00 - 24:00 (全日視角)"
            : "06:00 - 24:00 (標準日間)"}
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
          validRange={{
            start: startDate || undefined,
            end: validRangeEnd || undefined,
          }}
          views={{
            customItinerary: {
              type: "timeGrid",
              visibleRange: hasDateRange
                ? { start: startDate, end: validRangeEnd }
                : undefined,
            },
          }}
          slotMinTime={isExtendedView ? "00:00:00" : "06:00:00"}
          slotMaxTime="24:00:00"
          allDaySlot={false}

          // =====================================================================
          // 🚀 2. 物理封印結界：只要是 isViewer，把所有交互權利當場閹割！
          // =====================================================================
          editable={!isViewer}
          droppable={!isViewer}
          eventStartEditable={!isViewer}
          eventDurationEditable={!isViewer}
          // =====================================================================

          events={coloredEvents}
          eventReceive={updateLocalStateFromCalendar}
          eventDrop={updateLocalStateFromCalendar}
          eventResize={updateLocalStateFromCalendar}

          eventMouseEnter={(arg) => {
            const placeId = arg.event.extendedProps?.placeId;
            if (placeId) setHoveredPlaceId(placeId);
          }}
          eventMouseLeave={() => {
            setHoveredPlaceId(null);
          }}

          dayHeaderClassNames={(arg) => {
            const d = arg.date;
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (dateStr === startDate)
              return "!bg-emerald-50/80 dark:!bg-emerald-900/30 !text-emerald-700 dark:!text-emerald-400 font-black border-t-4 border-t-emerald-500";
            return "";
          }}

          eventClick={(info) => {
            const place = places.find(
              (p) => p.id === info.event.extendedProps?.placeId,
            );
            if (place) setSelectedPlace(place);
          }}

          eventDragStop={(info) => {
            if (isViewer || !showList) return; // 雙重保險
            const zoneEl = document.getElementById("external-events-zone");
            if (!zoneEl) return;
            const rect = zoneEl.getBoundingClientRect();
            if (
              info.jsEvent.clientX >= rect.left &&
              info.jsEvent.clientX <= rect.right &&
              info.jsEvent.clientY >= rect.top &&
              info.jsEvent.clientY <= rect.bottom
            ) {
              info.event.remove();
              setTimeout(updateLocalStateFromCalendar, 50);
            }
          }}

          eventContent={(eventInfo) => {
            const placeId = eventInfo.event.extendedProps?.placeId;
            const isEventSelected = selectedPlace?.id === placeId;
            const isEventHovered = hoveredPlaceId === placeId;
            const place = places.find((p) => p.id === placeId);
            const customBgColor = eventInfo.event.backgroundColor || "#2563eb";

            return (
              <div
                // 🔥 物理烙印背景色，對抗 PDF 透明隱藏 Bug
                style={{ backgroundColor: customBgColor }}
                className={`w-full h-full p-1 text-[11px] leading-tight text-white font-semibold cursor-pointer flex items-center justify-between rounded transition-all duration-200 relative group/ev ${
                  isEventSelected
                    ? "z-60 ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-amber-600 dark:ring-amber-400 font-black shadow-xl brightness-110 !border-transparent scale-[1.035]"
                    : isEventHovered
                      ? "ring-4 ring-amber-400 font-black scale-[1.015] z-30 !text-gray-900 shadow-md !bg-amber-500"
                      : "hover:brightness-110"
                }`}
              >
                <span className="truncate pr-11 block">
                  {isEventSelected ? "🎯 " : "📍 "}{eventInfo.event.title}
                </span>

                {place && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/ev:opacity-100 z-40 bg-black/25 dark:bg-white/25 p-0.5 rounded backdrop-blur-xs transition-opacity"
                  >
                    {/* ===================================================================== */}
                    {/* 🚀 3. 唯讀淨化：如果是 Viewer，沒收鉛筆編輯按鈕，只准飛針！ */}
                    {/* ===================================================================== */}
                    {!isViewer && onEditPlace && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPlace(place);
                        }}
                        className="w-4 h-4 flex items-center justify-center bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 rounded hover:bg-amber-500 hover:text-white transition shadow-sm text-[9px] cursor-pointer"
                        title="編輯此景點"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlyToPlace(place);
                      }}
                      className="w-4 h-4 flex items-center justify-center bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-500 hover:text-white transition shadow-sm text-[9px] cursor-pointer"
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