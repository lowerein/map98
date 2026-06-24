// hooks/useDailyPaths.ts
import { useMemo, useState } from "react";
import { Place, CalendarEvent, Itinerary } from "../components/types";

export function useDailyPaths(
  activeItinerary: Itinerary | null,
  localEvents: CalendarEvent[],
  places: Place[]
) {
  const [hiddenDays, setHiddenDays] = useState<Set<string>>(new Set());

  const dailyPaths = useMemo(() => {
    if (!activeItinerary?.startDate) return [];

    const tripDates: string[] = [];
    let curr = new Date(activeItinerary.startDate);
    const end = activeItinerary.endDate ? new Date(activeItinerary.endDate) : new Date(activeItinerary.startDate);

    while (curr <= end) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      tripDates.push(`${yyyy}-${mm}-${dd}`);
      curr.setDate(curr.getDate() + 1);
    }

    const eventsByDate: Record<string, CalendarEvent[]> = {};
    localEvents.forEach((ev) => {
      if (!ev.start) return;
      const d = new Date(ev.start);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(ev);
    });

    const dayColors = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4"];

    return tripDates.map((dateStr, idx) => {
      const dayEvents = eventsByDate[dateStr] || [];
      const sorted = dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      const points = sorted
        .map((ev) => places.find((p) => p.id === ev.extendedProps?.placeId))
        .filter((p): p is Place => !!p && typeof p.lat === 'number' && typeof p.lng === 'number')
        .map((p) => ({ lat: p.lat, lng: p.lng }));

      return {
        day: dateStr, 
        dayLabel: `Day ${idx + 1}`, 
        dateShort: `${dateStr.substring(5)}`, 
        strokeColor: dayColors[idx % dayColors.length],
        points,
      };
    });
  }, [activeItinerary, localEvents, places]);

  const visiblePaths = useMemo(() => {
    return dailyPaths.filter((path) => !hiddenDays.has(path.day));
  }, [dailyPaths, hiddenDays]);

  const toggleDayVisibility = (day: string) => {
    setHiddenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  return {
    dailyPaths,
    visiblePaths,
    hiddenDays,
    toggleDayVisibility,
  };
}