// app/hooks/useTripData.ts
"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DropResult } from "@hello-pangea/dnd";
import { Place, Itinerary, ScheduleDay, CalendarEvent } from "../components/types";
import { useRealtime } from "./useRealtime";
import {
  getPlaces,
  savePlace as savePlaceAction,
  deletePlace as deletePlaceAction,
} from "../lib/actions/places";
import {
  getItineraries,
  createItinerary as createItineraryAction,
  updateItinerary as updateItineraryAction,
  deleteItinerary as deleteItineraryAction,
} from "../lib/actions/itineraries";
import { getActiveFields } from "../lib/actions/fields";

const WEEK_DAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function buildDays(start: string, end: string, existing: ScheduleDay[] = []): ScheduleDay[] {
  if (!start || !end) return [];
  const s = new Date(start);
  const e = new Date(end);
  if (s > e) return [];
  const days: ScheduleDay[] = [];
  let current = new Date(s);
  let dayNum = 1;
  while (current <= e) {
    const dateStr = current.toISOString().split("T")[0];
    const prev = existing.find((d) => d.dateStr === dateStr);
    days.push({
      id: prev?.id || `day-${dateStr}`,
      title: `Day ${dayNum}`,
      dateStr,
      dayOfWeek: WEEK_DAYS[current.getDay()],
      items: prev?.items || [],
    });
    current.setDate(current.getDate() + 1);
    dayNum++;
  }
  return days;
}

export function useTripData() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  // ==========================================
  // 1. State
  // ==========================================
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; googleMapsUrl?: string } | null>(null);
  const [panLocation, setPanLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarSelectedPlace, setSidebarSelectedPlace] = useState<Place | null>(null);

  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [placePhone, setPlacePhone] = useState("");
  const [placeHours, setPlaceHours] = useState<string[]>([]);
  const [placeCountry, setPlaceCountry] = useState("");
  const [placeProvince, setPlaceProvince] = useState("");

  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, any>>({});
  const [activeFieldsConfig, setActiveFieldsConfig] = useState<any[]>([]);

  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const [itineraries, setItineraries] = useState<Itinerary[]>([
    { id: "temp-initial", name: "我的新行程", startDate: "", endDate: "", scheduleDays: [], calendarEvents: [] },
  ]);
  const [activeItineraryId, setActiveItineraryId] = useState<string>("");
  const activeItinerary = itineraries.find((i) => i.id === activeItineraryId) || itineraries[0];

  const [hiddenDays, setHiddenDays] = useState<Set<string>>(new Set());

  const didBootstrap = useRef(false);

  // ==========================================
  // 2. Cloud loaders (Prisma-backed Server Actions)
  // ==========================================
  const loadPlaces = useCallback(async () => {
    try {
      const places = await getPlaces();
      setSavedPlaces(places as unknown as Place[]);
    } catch (err) {
      console.error("載入景點失敗:", err);
    }
  }, []);

  const loadItineraries = useCallback(async () => {
    try {
      const data = await getItineraries();
      let list = data as unknown as Itinerary[];
      if (list.length === 0 && !didBootstrap.current) {
        didBootstrap.current = true;
        const created = await createItineraryAction({ name: "我的新行程" });
        list = [created as unknown as Itinerary];
      }
      setItineraries(list);
      setActiveItineraryId((prev) =>
        prev && list.some((i) => i.id === prev) ? prev : list[0]?.id ?? ""
      );
    } catch (err) {
      console.error("載入行程失敗:", err);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadPlaces();
    loadItineraries();
    getActiveFields()
      .then(setActiveFieldsConfig)
      .catch((err) => console.error("載入欄位失敗:", err));
  }, [userId, loadPlaces, loadItineraries]);

  useRealtime(userId, (scope) => {
    if (scope === "places" || scope === "all") loadPlaces();
    if (scope === "itineraries" || scope === "all") loadItineraries();
  });

  // ==========================================
  // 3. Itinerary write helper
  // ==========================================
  const updateActiveItinerary = useCallback(
    (updates: Partial<Itinerary>) => {
      const current = itineraries.find((i) => i.id === activeItineraryId) || itineraries[0];
      if (!current) return;
      const next = { ...current, ...updates };
      setItineraries((prev) => prev.map((i) => (i.id === current.id ? next : i)));
      updateItineraryAction(current.id, {
        name: next.name,
        startDate: next.startDate,
        endDate: next.endDate,
        scheduleDays: next.scheduleDays,
        calendarEvents: next.calendarEvents,
      }).catch((err) => console.error("行程同步失敗:", err));
    },
    [itineraries, activeItineraryId]
  );

  // ==========================================
  // 4. Computed paths
  // ==========================================
  const dailyPaths = useMemo(() => {
    if (!activeItinerary || !activeItinerary.scheduleDays) return [];
    const dayColors = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4"];
    return activeItinerary.scheduleDays.map((day, idx) => {
      const points = day.items
        .map((item) => savedPlaces.find((p) => p.id === item.placeId))
        .filter((p): p is Place => !!p)
        .map((p) => ({ lat: p.lat, lng: p.lng }));
      return { day: day.title || day.dateStr, strokeColor: dayColors[idx % dayColors.length], points };
    });
  }, [activeItinerary, savedPlaces]);

  const visiblePaths = useMemo(
    () => dailyPaths.filter((path) => !hiddenDays.has(path.day)),
    [dailyPaths, hiddenDays]
  );

  const toggleDayVisibility = (day: string) => {
    setHiddenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  // ==========================================
  // 5. Place actions
  // ==========================================
  const handleMapClick = (data: any) => {
    setEditingPlaceId(null); setPlaceName(data.name); setPlaceAddress(data.address || "");
    setPlacePhone(data.phoneNumber || ""); setPlaceHours(data.openingHours || []);
    setPlaceCountry(data.country || ""); setPlaceProvince(data.province || "");
    setDynamicFieldValues({});
    setSelectedLocation({ lat: data.lat, lng: data.lng, googleMapsUrl: data.url });
    setPanLocation(null); setSidebarSelectedPlace(null);
  };

  const handleMarkerClick = (place: Place) => {
    setEditingPlaceId(place.id); setPlaceName(place.name); setPlaceAddress(place.address || "");
    setPlacePhone(place.phoneNumber || ""); setPlaceHours(place.openingHours || []);
    setPlaceCountry(place.country || ""); setPlaceProvince(place.province || "");
    setDynamicFieldValues((place.customFields as any) || {});
    setSelectedLocation({ lat: place.lat, lng: place.lng, googleMapsUrl: place.googleMapsUrl });
    setPanLocation(null); setSidebarSelectedPlace(place);
  };

  const handleSidebarPlaceClick = (place: Place) => {
    setSidebarSelectedPlace(place);
    setPanLocation({ lat: place.lat, lng: place.lng });
    setSelectedLocation(null); setEditingPlaceId(null);
  };

  // 🚀 新增：處理撳 ✏️ 編輯按鈕嘅邏輯
  const handleEditPlace = (place: Place) => {
    setEditingPlaceId(place.id);
    setPlaceName(place.name);
    setPlaceAddress(place.address || "");
    setPlacePhone(place.phoneNumber || "");
    setPlaceHours(place.openingHours || []);
    setPlaceCountry(place.country || "");
    setPlaceProvince(place.province || "");
    setDynamicFieldValues((place.customFields as any) || {});
    setSelectedLocation({ lat: place.lat, lng: place.lng, googleMapsUrl: place.googleMapsUrl });
    setPanLocation(null);
    setSidebarSelectedPlace(place);
  };

  const resetPlaceForm = () => {
    setPlaceName(""); setPlaceAddress(""); setPlacePhone(""); setPlaceHours([]);
    setPlaceCountry(""); setPlaceProvince(""); setDynamicFieldValues({});
    setSelectedLocation(null); setPanLocation(null); setSidebarSelectedPlace(null);
    setEditingPlaceId(null);
  };

  const handleSavePlace = (e: React.FormEvent, finalDynamicValues?: Record<string, any>) => {
    e.preventDefault();
    if (!placeName || !selectedLocation) return false;

    const valuesToSave = finalDynamicValues || dynamicFieldValues;

    const fields = {
      name: placeName,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      googleMapsUrl: selectedLocation.googleMapsUrl,
      address: placeAddress,
      phoneNumber: placePhone,
      openingHours: placeHours,
      country: placeCountry,
      province: placeProvince,
      customFields: valuesToSave, 
    };

    if (editingPlaceId) {
      setSavedPlaces((prev) =>
        prev.map((p) => (p.id === editingPlaceId ? ({ ...p, ...fields } as Place) : p))
      );
      savePlaceAction({ id: editingPlaceId, ...fields })
        .then((saved) =>
          setSavedPlaces((prev) =>
            prev.map((p) => (p.id === editingPlaceId ? (saved as unknown as Place) : p))
          )
        )
        .catch((err) => console.error("儲存景點失敗:", err));
    } else {
      const tempId = `temp-${Date.now()}`;
      setSavedPlaces((prev) => [...prev, { id: tempId, ...fields } as Place]);
      savePlaceAction(fields)
        .then((saved) =>
          setSavedPlaces((prev) =>
            prev.map((p) => (p.id === tempId ? (saved as unknown as Place) : p))
          )
        )
        .catch((err) => {
          console.error("新增景點失敗:", err);
          setSavedPlaces((prev) => prev.filter((p) => p.id !== tempId));
        });
    }

    resetPlaceForm();
    return true;
  };

  const handleDeletePlace = (id: string) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== id));
    deletePlaceAction(id).catch((err) => {
      console.error("刪除景點失敗:", err);
      loadPlaces();
    });
  };

  const handleCancel = () => resetPlaceForm();

  // ==========================================
  // 6. Itinerary actions
  // ==========================================
  const handleCreateItinerary = (name: string, start: string, end: string) => {
    const days = buildDays(start, end);
    const tempId = `temp-iti-${Date.now()}`;
    const optimistic: Itinerary = {
      id: tempId, name: name || "未命名行程", startDate: start, endDate: end,
      scheduleDays: days, calendarEvents: [],
    };
    setItineraries((prev) => [...prev, optimistic]);
    setActiveItineraryId(tempId);

    createItineraryAction({ name: optimistic.name, startDate: start, endDate: end, scheduleDays: days, calendarEvents: [] })
      .then((created) => {
        setItineraries((prev) => prev.map((i) => (i.id === tempId ? (created as unknown as Itinerary) : i)));
        setActiveItineraryId((prev) => (prev === tempId ? created.id : prev));
      })
      .catch((err) => {
        console.error("建立行程失敗:", err);
        setItineraries((prev) => prev.filter((i) => i.id !== tempId));
      });
  };

  const handleDeleteItinerary = (id: string) => {
    setItineraries((prev) => {
      let remaining = prev.filter((i) => i.id !== id);
      if (remaining.length === 0) {
        remaining = [
          { id: "temp-initial", name: "我的新行程", startDate: "", endDate: "", scheduleDays: [], calendarEvents: [] },
        ];
      }
      setActiveItineraryId((curr) => (curr === id ? remaining[0]?.id ?? "" : curr));
      return remaining;
    });
    deleteItineraryAction(id).catch((err) => {
      console.error("刪除行程失敗:", err);
      loadItineraries();
    });
  };

  const handleRenameItinerary = (id: string, newName: string) => {
    setItineraries((prev) => prev.map((i) => (i.id === id ? { ...i, name: newName } : i)));
    updateItineraryAction(id, { name: newName }).catch((err) =>
      console.error("重新命名失敗:", err)
    );
  };

  const handleSwitchItinerary = (id: string) => setActiveItineraryId(id);

  const handleDateRangeChange = (start: string, end: string) => {
    if (!start || !end) return;
    const days = buildDays(start, end, activeItinerary?.scheduleDays || []);
    if (days.length === 0) return;
    updateActiveItinerary({ startDate: start, endDate: end, scheduleDays: days });
  };

  const handleAssignPlace = (placeId: string, dayId: string) => {
    const newDays = activeItinerary.scheduleDays.map((day) =>
      day.id === dayId
        ? { ...day, items: [...day.items, { id: `item-${Date.now()}`, placeId, startTime: "", endTime: "" }] }
        : day
    );
    updateActiveItinerary({ scheduleDays: newDays });
  };

  const handleUpdateTime = (dayId: string, itemId: string, field: "startTime" | "endTime", value: string) => {
    const newDays = activeItinerary.scheduleDays.map((day) =>
      day.id === dayId
        ? { ...day, items: day.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)) }
        : day
    );
    updateActiveItinerary({ scheduleDays: newDays });
  };

  const handleRemoveItem = (dayId: string, itemId: string) => {
    const newDays = activeItinerary.scheduleDays.map((day) =>
      day.id === dayId ? { ...day, items: day.items.filter((item) => item.id !== itemId) } : day
    );
    updateActiveItinerary({ scheduleDays: newDays });
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const newDays = [...activeItinerary.scheduleDays];
    const sourceDayIndex = newDays.findIndex((d) => d.id === source.droppableId);
    const destDayIndex = newDays.findIndex((d) => d.id === destination.droppableId);
    const sourceDay = newDays[sourceDayIndex];
    const destDay = newDays[destDayIndex];
    const sourceItems = Array.from(sourceDay.items);
    const destItems = source.droppableId === destination.droppableId ? sourceItems : Array.from(destDay.items);
    const [removedItem] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, removedItem);
    newDays[sourceDayIndex] = { ...sourceDay, items: sourceItems };
    if (source.droppableId !== destination.droppableId) {
      newDays[destDayIndex] = { ...destDay, items: destItems };
    }
    updateActiveItinerary({ scheduleDays: newDays });
  };

  const handleUpdateLiveEvents = (events: CalendarEvent[]) => {
    const updatedDays = activeItinerary.scheduleDays.map((day) => {
      const dayEvents = events.filter((ev) => {
        const d = new Date(ev.start);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === day.dateStr;
      });
      dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      const items = dayEvents.map((ev) => {
        const s = new Date(ev.start);
        const e = new Date(ev.end);
        return {
          id: ev.id,
          placeId: ev.extendedProps.placeId,
          startTime: `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`,
          endTime: `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`,
        };
      });
      return { ...day, items };
    });
    setItineraries((prev) =>
      prev.map((iti) => (iti.id === activeItineraryId ? { ...iti, calendarEvents: events, scheduleDays: updatedDays } : iti))
    );
    return updatedDays;
  };

  const handleSaveCalendarChanges = async (events: CalendarEvent[]) => {
    const freshScheduleDays = handleUpdateLiveEvents(events);
    try {
      await updateItineraryAction(activeItineraryId, {
        name: activeItinerary.name,
        startDate: activeItinerary.startDate,
        endDate: activeItinerary.endDate,
        scheduleDays: freshScheduleDays,
        calendarEvents: events,
      });
    } catch (err) {
      console.error("儲存日曆失敗:", err);
    }
    router.push("/planner");
  };

  return {
    savedPlaces, selectedLocation, panLocation, sidebarSelectedPlace, hoveredPlaceId, setHoveredPlaceId, editingPlaceId,
    placeName, setPlaceName, placeAddress, setPlaceAddress, placePhone, setPlacePhone, placeHours, setPlaceHours,
    placeCountry, placeProvince, dynamicFieldValues, setDynamicFieldValues, activeFieldsConfig,
    itineraries, activeItineraryId, activeItinerary, hiddenDays, dailyPaths, visiblePaths, toggleDayVisibility,

    handleMapClick, handleMarkerClick, handleSidebarPlaceClick, handleSavePlace, handleDeletePlace, handleCancel,
    // 🚀 確保有 return 呢個 handleEditPlace 出去！
    handleEditPlace, 
    handleCreateItinerary, handleDeleteItinerary, handleRenameItinerary, handleSwitchItinerary,
    handleDateRangeChange, handleAssignPlace, handleUpdateTime, handleRemoveItem, handleDragEnd,
    handleUpdateLiveEvents, handleSaveCalendarChanges,
  };
}