// components/MapCanvas.tsx
"use client";

import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Place as MyPlaceType } from "./types";
import { ReactNode, useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

function MapPolyline({
  path,
  strokeColor,
}: {
  path: google.maps.LatLngLiteral[];
  strokeColor: string;
}) {
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
      icons: [
        {
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
          offset: "100%",
          repeat: "100px",
        },
      ],
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

  // 🚀 1. 新增天線：接收當前處於 Active（被選中/編輯中）的景點 ID
  activePlaceId?: string | null;

  onMapClick: (data: {
    lat: number;
    lng: number;
    name: string;
    url: string;
    address: string;
    phoneNumber: string;
    openingHours: string[];
    country?: string;
    province?: string;
  }) => void;
  onMarkerClick: (place: MyPlaceType) => void;
  hoveredPlaceId?: string | null;
  onMarkerMouseEnter?: (placeId: string) => void;
  onMarkerMouseLeave?: (placeId: string) => void;
  dailyPaths?: Array<{
    day: string;
    strokeColor: string;
    points: google.maps.LatLngLiteral[];
  }>;
  children?: ReactNode;
}

export default function MapCanvas({
  savedPlaces,
  selectedLocation,
  activePlaceId,
  onMapClick,
  onMarkerClick,
  hoveredPlaceId,
  onMarkerMouseEnter,
  onMarkerMouseLeave,
  dailyPaths = [],
  children,
}: MapCanvasProps) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);
  const isDarkMode = mounted && resolvedTheme === "dark";

  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    }
  }, [map, selectedLocation]);

  const handleInternalClick = async (e: any) => {
    if (e.stop) e.stop();
    if (!e.detail.placeId) {
      onMapClick({
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
        name: "",
        url: "",
        address: "",
        phoneNumber: "",
        openingHours: [],
      });
      return;
    }
    if (placesLib) {
      try {
        const place = new placesLib.Place({ id: e.detail.placeId });
        await place.fetchFields({
          fields: [
            "displayName",
            "googleMapsURI",
            "formattedAddress",
            "nationalPhoneNumber",
            "regularOpeningHours",
            "addressComponents",
          ],
        });

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

        onMapClick({
          lat: e.detail.latLng.lat,
          lng: e.detail.latLng.lng,
          name: place.displayName || "",
          url: place.googleMapsURI || "",
          address: place.formattedAddress || "",
          phoneNumber: place.nationalPhoneNumber || "",
          openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
          country,
          province,
        });
      } catch (error) {
        onMapClick({
          lat: e.detail.latLng.lat,
          lng: e.detail.latLng.lng,
          name: "",
          url: "",
          address: "",
          phoneNumber: "",
          openingHours: [],
        });
      }
    }
  };

  return (
    <GoogleMap
      defaultCenter={{ lat: 22.3193, lng: 114.1694 }}
      defaultZoom={12}
      mapId="ad0903a75ef78646b936f518"
      disableDefaultUI={true}
      zoomControl={true}
      colorScheme={isDarkMode ? "DARK" : "LIGHT"}
      onClick={handleInternalClick}
      gestureHandling="greedy"
    >
      {/* ===================================================================== */}
      {/* 🚀 2. 替身退場機制：只有當 activePlaceId 是 null（代表用家點擊的是隨機空白地圖點）時，
          才准許這支紅色的臨時大頭針出場！如果是點擊現成景點，它必須原地消失！ */}
      {/* ===================================================================== */}
      {selectedLocation && !activePlaceId && (
        <AdvancedMarker position={selectedLocation} zIndex={100}>
          <Pin
            background={"#ef4444"}
            borderColor={"#b91c1c"}
            glyphColor={"#ffffff"}
            glyph="+"
          />
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
        const isActive = activePlaceId === place.id; // 🚀 判定該點是否本尊 Active 中

        // 永遠忠於景點專屬色，無就用預設藍
        const pinColor = place.color || "#2563eb";

        // 🚀 3. 四階視覺動態矩陣（處理縮放、層級與標記）
        let currentScale = 1;
        let currentZIndex = 1;
        let glyphIcon: string | undefined = undefined;

        if (isActive && isHovered) {
          currentScale = 1.45; // 頂峰狀態：本身選中咗，滑鼠再行過佢，極限彈出！
          currentZIndex = 9999;
          glyphIcon = "★";
        } else if (isActive) {
          currentScale = 1.3; // 靜止 Active 狀態
          currentZIndex = 999;
          glyphIcon = "★";
        } else if (isHovered) {
          currentScale = 1.25; // 純 Hover 狀態
          currentZIndex = 110;
        }

        return (
          <AdvancedMarker
            key={place.id}
            position={{ lat: place.lat, lng: place.lng }}
            onClick={(e) => {
              if (e.domEvent) e.domEvent.stopPropagation();
              onMarkerClick(place);
            }}
            onMouseEnter={() => onMarkerMouseEnter?.(place.id)}
            onMouseLeave={() => onMarkerMouseLeave?.(place.id)}
            zIndex={currentZIndex}
          >
            <Pin
              background={pinColor} // 🎨 100% 呈現心水顏色
              // 🚀 邊框回饋：Active 或 Hover 時外框變成發光純白，唔再用死板的深色覆蓋
              borderColor={isActive || isHovered ? "#ffffff" : pinColor}
              glyphColor={"#ffffff"}
              scale={currentScale}
              glyph={glyphIcon} // Active 時中心會出現一粒靚仔 ★
            />
          </AdvancedMarker>
        );
      })}
      {children}
    </GoogleMap>
  );
}
