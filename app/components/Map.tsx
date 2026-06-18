"use client";

import { useState } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

export default function Map() {
  // 用黎記住 User 篤地圖嗰個位嘅經緯度
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [placeName, setPlaceName] = useState("");

  // 當 User 篤地圖嗰陣觸發
  const handleMapClick = (e: any) => {
    if (e.detail.latLng) {
      setSelectedLocation({
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
      });
    }
  };

  // 處理 Save 地點嘅 Function (暫時做住 client side console.log 先)
  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName || !selectedLocation) return;

    console.log("準備儲存地點去 Database:", {
      name: placeName,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    });

    // 儲存成功後清空狀態
    setPlaceName("");
    setSelectedLocation(null);
    alert("地點已暫存（下一班車會連去 API 實體儲存）！");
  };

  return (
    <div className="relative w-full h-[calc(100vh-73px)] flex flex-col md:flex-row">
      
      {/* 左邊/頂部：側邊欄表單 (Mobile responsive) */}
      {selectedLocation && (
        <div className="absolute top-4 left-4 z-10 w-80 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-bold text-lg mb-2 text-gray-800">📍 新增自定義地點</h3>
          <p className="text-xs text-gray-500 mb-3">
            經度: {selectedLocation.lat.toFixed(4)}, 緯度: {selectedLocation.lng.toFixed(4)}
          </p>
          <form onSubmit={handleSavePlace} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地點名稱</label>
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="例如：東京鐵塔、正酒店"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-md font-medium hover:bg-blue-700 transition"
              >
                儲存地點
              </button>
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 右邊/主畫面：Google Map */}
      <div className="flex-1 h-full">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <GoogleMap
            defaultCenter={{ lat: 22.3193, lng: 114.1694 }}
            defaultZoom={11}
            mapId="DEMO_MAP_ID"
            disableDefaultUI={true}
            zoomControl={true}
            onClick={handleMapClick} // 綁定點擊事件
          >
            {/* 如果 User 篤咗地圖，就喺嗰個位 show 一個紅色的新 Pin */}
            {selectedLocation && (
              <AdvancedMarker position={selectedLocation}>
                <Pin background={"#ef4444"} borderColor={"#b91c1c"} glyphColor={"#ffffff"} />
              </AdvancedMarker>
            )}
          </GoogleMap>
        </APIProvider>
      </div>

    </div>
  );
}