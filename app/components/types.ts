// components/types.ts
export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  googleMapsUrl?: string; // 🚀 新增呢行裝住條 Link
};