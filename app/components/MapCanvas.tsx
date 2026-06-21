// components/MapCanvas.tsx
"use client";

import { Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Place as MyPlaceType } from "./types";
import { ReactNode, useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

// 自定義 Polyline 元件
function MapPolyline({ path, strokeColor }: { path: google.maps.LatLngLiteral[]; strokeColor: string }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || path.length < 2) {
      if (polylineRef.current) polylineRef.current.setMap(null);
      return;
    }

    polylineRef.current = new google.maps.Polyline({
      path,
      strokeColor,
      strokeOpacity: 0.8,
      strokeWeight: 4.5,
      icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: "100%", repeat: "100px" }],
      map,
    });

    return () => {
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, [map, path, strokeColor]);

  return null;
}

interface MapCanvasProps {
  savedPlaces: MyPlaceType[];
  selectedLocation: { lat: number; lng: number; googleMapsUrl?: string } | null;
  // 🚀 1. 修正 Props：確保 onMapClick 準備好接收 country 同 province
  onMapClick: (data: { 
    lat: number; lng: number; name: string; url: string; 
    address: string; phoneNumber: string; openingHours: string[];
    country?: string; province?: string; 
  }) => void;
  onMarkerClick: (place: MyPlaceType) => void;
  hoveredPlaceId?: string | null;
  onMarkerMouseEnter?: (placeId: string) => void;
  onMarkerMouseLeave?: (placeId: string) => void;
  dailyPaths?: Array<{ day: string; strokeColor: string; points: google.maps.LatLngLiteral[] }>;
  children?: ReactNode;
}

export default function MapCanvas({ 
  savedPlaces, selectedLocation, onMapClick, onMarkerClick, 
  hoveredPlaceId, onMarkerMouseEnter, onMarkerMouseLeave, dailyPaths = [], children 
}: MapCanvasProps) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);
  const isDarkMode = mounted && resolvedTheme === "dark";

  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    }
  }, [map, selectedLocation]);

  const handleInternalClick = async (e: any) => {
    if (e.stop) e.stop();
    if (!e.detail.placeId) {
      onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng, name: "", url: "", address: "", phoneNumber: "", openingHours: [] });
      return;
    }
    if (placesLib) {
      try {
        const place = new placesLib.Place({ id: e.detail.placeId });
        // 🚀 2. 加入 "addressComponents" 到請求欄位中
        await place.fetchFields({ 
          fields: [
            "displayName", "googleMapsURI", "formattedAddress", 
            "nationalPhoneNumber", "regularOpeningHours", "addressComponents"
          ] 
        });

        // 🚀 3. 解析國家與省份
        let country = "未知國家";
        let province = "未知區域";

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            if (component.types.includes("country")) {
              country = component.longText ?? country;
            }
            if (component.types.includes("administrative_area_level_1")) {
              province = component.longText ?? province;
            }
          }
        }

        // 🚀 4. 將資料連埋 country 同 province 傳返出去
        onMapClick({
          lat: e.detail.latLng.lat, 
          lng: e.detail.latLng.lng,
          name: place.displayName || "", 
          url: place.googleMapsURI || "",
          address: place.formattedAddress || "", 
          phoneNumber: place.nationalPhoneNumber || "",
          openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
          country,
          province
        });
      } catch (error) {
        onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng, name: "", url: "", address: "", phoneNumber: "", openingHours: [] });
      }
    }
  };

  return (
    <GoogleMap defaultCenter={{ lat: 22.3193, lng: 114.1694 }} defaultZoom={12} mapId="ad0903a75ef78646b936f518" disableDefaultUI={true} zoomControl={true} colorScheme={isDarkMode ? "DARK" : "LIGHT"} onClick={handleInternalClick}>
      {selectedLocation && (
        <AdvancedMarker position={selectedLocation} zIndex={100}>
          <Pin background={"#ef4444"} borderColor={"#b91c1c"} glyphColor={"#ffffff"} />
        </AdvancedMarker>
      )}

      {dailyPaths.map((pathData) => (
        <MapPolyline 
          key={pathData.day} 
          path={pathData.points} 
          strokeColor={pathData.strokeColor} 
        />
      ))}

      {savedPlaces.map((place) => {
        const isHovered = hoveredPlaceId === place.id; 
        return (
          <AdvancedMarker
            key={place.id}
            position={{ lat: place.lat, lng: place.lng }}
            onClick={(e) => { if (e.domEvent) e.domEvent.stopPropagation(); onMarkerClick(place); }}
            onMouseEnter={() => onMarkerMouseEnter?.(place.id)}
            onMouseLeave={() => onMarkerMouseLeave?.(place.id)}
            zIndex={isHovered ? 110 : 1} 
          >
            <Pin
              background={isHovered ? "#f59e0b" : (isDarkMode ? "#3b82f6" : "#2563eb")}
              borderColor={isHovered ? "#b45309" : (isDarkMode ? "#1d4ed8" : "#1e40af")}
              glyphColor={"#ffffff"}
              scale={isHovered ? 1.25 : 1} 
            />
          </AdvancedMarker>
        );
      })}
      {children}
    </GoogleMap>
  );
}