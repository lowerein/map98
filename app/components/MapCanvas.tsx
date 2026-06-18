// components/MapCanvas.tsx
"use client";

import { Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Place } from "./types";
import { ReactNode, useEffect, useState } from "react";

interface MapCanvasProps {
  savedPlaces: Place[];
  selectedLocation: { lat: number; lng: number; googleMapsUrl?: string } | null;
  // 🚀 更新 onMapClick 接收查出黎嘅全套資料
  onMapClick: (data: { lat: number; lng: number; name: string; url: string }) => void;
  onMarkerClick: (place: Place) => void;
  children?: ReactNode;
}

export default function MapCanvas({ savedPlaces, selectedLocation, onMapClick, onMarkerClick, children }: MapCanvasProps) {
  const map = useMap(); // 攞地圖實體
  const placesLib = useMapsLibrary("places"); // 攞 Places API 函式庫
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  // 初始化 Places Service
  useEffect(() => {
    if (!placesLib || !map) return;
    setPlacesService(new placesLib.PlacesService(map));
  }, [placesLib, map]);

  const handleInternalClick = (e: any) => {
    if (!e.detail.placeId) {
      alert("請點擊地圖上已有名字嘅地標 (例如餐廳、景點) 📍\n唔好篤山卡啦位呀！");
      return;
    }

    if (e.stop) e.stop(); // 擋住 Google 原廠煩人資訊卡

    // 🚀 向 Google 查詢呢個 placeId 嘅名同 Link
    if (placesService) {
      placesService.getDetails(
        { placeId: e.detail.placeId, fields: ["name", "url"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            onMapClick({
              lat: e.detail.latLng.lat,
              lng: e.detail.latLng.lng,
              name: place.name || "", // 成功攞到名！
              url: place.url || "",   // 成功攞到 URL！
            });
          }
        }
      );
    }
  };

  return (
    <GoogleMap
      defaultCenter={{ lat: 22.3193, lng: 114.1694 }}
      defaultZoom={11}
      mapId="DEMO_MAP_ID"
      disableDefaultUI={true}
      zoomControl={true}
      onClick={handleInternalClick}
    >
      {selectedLocation && (
        <AdvancedMarker position={selectedLocation}>
          <Pin background={"#ef4444"} borderColor={"#b91c1c"} glyphColor={"#ffffff"} />
        </AdvancedMarker>
      )}

      {savedPlaces.map((place) => (
        <AdvancedMarker 
          key={place.id} 
          position={{ lat: place.lat, lng: place.lng }}
          onClick={(e) => {
            if (e.domEvent) e.domEvent.stopPropagation();
            onMarkerClick(place);
          }}
        >
          <Pin background={"#2563eb"} borderColor={"#1e40af"} glyphColor={"#ffffff"} />
        </AdvancedMarker>
      ))}

      {children}
    </GoogleMap>
  );
}