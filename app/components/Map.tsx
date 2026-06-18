// components/Map.tsx
"use client";

import { useState } from "react";
import { APIProvider, InfoWindow } from "@vis.gl/react-google-maps";
import { Place } from "./types";
import Sidebar from "./Sidebar";
import AddPlaceForm from "./AddPlaceForm";
import MapCanvas from "./MapCanvas";

export default function Map() {
  // 🚀 selectedLocation 加埋 googleMapsUrl
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; googleMapsUrl?: string } | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);

  // 🚀 接收由 MapCanvas 查好嘅資料
  const handleMapClick = (data: { lat: number; lng: number; name: string; url: string }) => {
    setEditingPlaceId(null);
    setPlaceName(data.name); // ✨ 自動填名！
    setSelectedLocation({
      lat: data.lat,
      lng: data.lng,
      googleMapsUrl: data.url, // ✨ 記錄埋 URL
    });
  };

  const handleMarkerClick = (place: Place) => {
    setEditingPlaceId(place.id);
    setPlaceName(place.name);
    setSelectedLocation({
      lat: place.lat,
      lng: place.lng,
      googleMapsUrl: place.googleMapsUrl, // 點舊 Pin 都識得顯示 URL
    });
  };

  const handleSavePlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName || !selectedLocation) return;

    if (editingPlaceId) {
      setSavedPlaces(
        savedPlaces.map((p) =>
          p.id === editingPlaceId ? { ...p, name: placeName } : p
        )
      );
    } else {
      const newPlace: Place = {
        id: Date.now().toString(),
        name: placeName,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        googleMapsUrl: selectedLocation.googleMapsUrl, // 🚀 Save 埋落假 DB
      };
      setSavedPlaces([...savedPlaces, newPlace]);
      setIsSidebarOpen(true);
    }

    setPlaceName("");
    setSelectedLocation(null);
    setEditingPlaceId(null);
  };

  const handleCancel = () => {
    setSelectedLocation(null);
    setEditingPlaceId(null);
    setPlaceName("");
  };

 return (
    <div className="relative w-full h-full flex flex-col-reverse md:flex-row overflow-hidden">
      
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute bottom-6 left-6 z-20 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-2xl border-2 border-white hover:bg-blue-700 hover:scale-105 transition-transform duration-200"
        >
          <span className="text-2xl">📋</span>
        </button>
      )}

      {/* 🚀 傳入 onPlaceClick，直接重用 handleMarkerClick */}
      {isSidebarOpen && (
        <Sidebar 
          places={savedPlaces} 
          onClose={() => setIsSidebarOpen(false)} 
          onPlaceClick={handleMarkerClick} 
        />
      )}

      <div className="flex-1 relative h-full">
        {/* 🚀 重點：必須加 libraries={["places"]} 先可以查名！ */}
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={["places"]}>
          <MapCanvas
            savedPlaces={savedPlaces}
            selectedLocation={selectedLocation}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
          >
            {selectedLocation && (
              <InfoWindow
                position={selectedLocation}
                onCloseClick={handleCancel}
                pixelOffset={[0, -40] as unknown as google.maps.Size}
              >
                <AddPlaceForm
                  placeName={placeName}
                  setPlaceName={setPlaceName}
                  onSubmit={handleSavePlace}
                  onCancel={handleCancel}
                  isEditing={!!editingPlaceId}
                  googleMapsUrl={selectedLocation.googleMapsUrl} // 🚀 傳入 URL
                />
              </InfoWindow>
            )}
          </MapCanvas>
        </APIProvider>
      </div>
    </div>
  );
}