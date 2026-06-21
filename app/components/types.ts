// components/types.ts

export type CustomField = {
  id: string;
  name: string;
  type: "text" | "number" | "checkbox" | "file" | "image" | "date" |"textarea";
  value: string | boolean;
};

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  googleMapsUrl?: string;
  // 🚀 新增：Google API 自動獲取嘅實用資料
  address?: string;
  phoneNumber?: string;
  openingHours?: string[];
  country?: string; 
  province?: string;
  customFields?: CustomField[];
  color?: string;
access?: "owner" | "editor" | "viewer";
  isShared?: boolean;
  ownerName?: string;
};

export type ScheduleItem = {
  id: string;
  placeId: string;
  startTime?: string;
  endTime?: string;
};

export type ScheduleDay = {
  id: string;
  title: string;
  dateStr: string;
  dayOfWeek: string;
  items: ScheduleItem[];
};

// 🚀 從 OrganizeMode 搬過嚟嘅日曆事件格式
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  extendedProps: {
    placeId: string;
  };
}

// 🚀 全新結構：獨立嘅「行程專案」
export type Itinerary = {
  id: string;
  name: string;             // 行程名稱 (如: 沖繩 5 天遊)
  startDate: string;
  endDate: string;
  scheduleDays: ScheduleDay[];    // 屬於呢個行程嘅 Weekly View
  calendarEvents: CalendarEvent[]; // 屬於呢個行程嘅 Organize Mode 日曆

  access?: "owner" | "editor" | "viewer";
  isShared?: boolean;
  ownerName?: string;
};