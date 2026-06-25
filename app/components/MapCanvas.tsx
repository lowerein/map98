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
  activePlaceId?: string | null;
  // 🧹 毒瘤已清除：safePadding 相關宣告完全移除
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
  // 🧹 毒瘤已清除
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

  // 🎨 頂級視覺調校：按「光暗模式」與「選中狀態」，動態演算針頭邊框色
  const getPinBorderColor = (isHighlighted: boolean) => {
    if (isDarkMode) {
      return isHighlighted ? "#ffffff" : "#090d16";
    } else {
      return isHighlighted ? "#0f172a" : "#ffffff";
    }
  };

  // =====================================================================
  // 👑 官方標準直驅：Pan 就位後，補多一腳物理像素推移，完美避開 UI 遮擋
  // =====================================================================
  useEffect(() => {
    if (map && selectedLocation) {
      // 1. 先正常導航去目標坐標
      map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });

      // 2. 等 Google 內置的 panTo 起步後 (120ms)，補一腳螢幕絕對像素偏移：
      setTimeout(() => {
        if (window.innerWidth >= 768) {
          // 💻 Desktop：地圖鏡頭向左拉 160px ＝ 地標本體「向右送 160px」，送到右邊白區！
          map.panBy(-160, 0);
        } 
      }, 120);
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
      {selectedLocation && !activePlaceId && (
        <AdvancedMarker position={selectedLocation} zIndex={100}>
          <Pin
            background={"#ef4444"}
            borderColor={isDarkMode ? "#ffffff" : "#991b1b"} 
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
        const isActive = activePlaceId === place.id; 
        const isHighlighted = isActive || isHovered; 

        const pinColor = place.color || "#2563eb";
        const computedBorderColor = getPinBorderColor(isHighlighted);

        let currentScale = 1;
        let currentZIndex = 1;
        let glyphIcon: string | undefined = undefined;

        if (isActive && isHovered) {
          currentScale = 1.45; 
          currentZIndex = 9999;
          glyphIcon = "★";
        } else if (isActive) {
          currentScale = 1.3; 
          currentZIndex = 999;
          glyphIcon = "★";
        } else if (isHovered) {
          currentScale = 1.25; 
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
              background={pinColor} 
              borderColor={computedBorderColor} 
              glyphColor={"#ffffff"}
              scale={currentScale}
              glyph={glyphIcon} 
            />
          </AdvancedMarker>
        );
      })}
      {children}
    </GoogleMap>
  );
}