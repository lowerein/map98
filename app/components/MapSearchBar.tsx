// components/MapSearchBar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary, MapControl, ControlPosition } from "@vis.gl/react-google-maps";
import { useTheme } from "next-themes"; 

interface MapSearchBarProps {
  // 🚀 修正：補齊返你下面傳出去嘅所有資料欄位，否則 TS 會報錯
  onPlaceSelect: (data: { 
    lat: number; 
    lng: number; 
    name: string; 
    url: string;
    address: string;
    phoneNumber: string;
    openingHours: string[];
    country?: string; province?: string;
  }) => void;
}

export default function MapSearchBar({ onPlaceSelect }: MapSearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const placesLib = useMapsLibrary("places");
  const [placeAutocomplete, setPlaceAutocomplete] = useState<any>(null);

  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && resolvedTheme === "dark";

  useEffect(() => {
    if (!placesLib || !containerRef.current) return;
    containerRef.current.innerHTML = "";

    const autocomplete = new placesLib.PlaceAutocompleteElement({});
    autocomplete.placeholder = "🔍 搜尋餐廳、景點、地址...";
    autocomplete.style.colorScheme = isDarkMode ? "dark" : "light";
    autocomplete.style.width = "100%";
    
    containerRef.current.appendChild(autocomplete);
    setPlaceAutocomplete(autocomplete);

    return () => {
      if (containerRef.current && containerRef.current.contains(autocomplete)) {
        containerRef.current.removeChild(autocomplete);
      }
    };
  }, [placesLib, isDarkMode]);

  useEffect(() => {
    if (!placeAutocomplete) return;

// 修改 MapSearchBar.tsx 裡面的 handlePlaceSelect 部份
const handlePlaceSelect = async (event: any) => {
  const placePrediction = event.placePrediction;
  if (!placePrediction) return;

  try {
    const place = placePrediction.toPlace();
    await place.fetchFields({ 
      fields: [
        "displayName", 
        "googleMapsURI", 
        "location",
        "formattedAddress",    
        "nationalPhoneNumber",  
        "regularOpeningHours",
        "addressComponents" // 🚀 1. 叫 Google 畀埋詳細嘅地址組成元件
      ] 
    });

    if (!place.location) return;

    // 🚀 2. 解析國家同省份
    let country = "未知國家";
    let province = "未知區域";

    if (place.addressComponents) {
      for (const component of place.addressComponents) {
        if (component.types.includes("country")) {
          country = component.longText; // 例如：日本、 cananda 等
        }
        if (component.types.includes("administrative_area_level_1")) {
          province = component.longText; // 例如：東京都、大阪府、加州等
        }
      }
    }

    onPlaceSelect({
      lat: place.location.lat(),
      lng: place.location.lng(),
      name: place.displayName || "搜尋地點",
      url: place.googleMapsURI || "",
      address: place.formattedAddress || "",
      phoneNumber: place.nationalPhoneNumber || "",
      openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
      // 🚀 3. 將呢兩個新欄位傳出去
      country,
      province,
    });

    placeAutocomplete.value = "";
  } catch (error) {
    console.error("獲取地點資料失敗:", error);
  }
};

    placeAutocomplete.addEventListener("gmp-select", handlePlaceSelect);

    return () => {
      placeAutocomplete.removeEventListener("gmp-select", handlePlaceSelect);
    };
  }, [placeAutocomplete, onPlaceSelect]);

  return (
    <MapControl position={ControlPosition.TOP_CENTER}>
      <div className="mt-4 px-4 w-[80vw] md:w-[400px] relative z-[1000]">
        <div 
          ref={containerRef} 
          className="w-full shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300"
        />
      </div>
    </MapControl>
  );
}