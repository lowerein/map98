// components/PlaceFormPopup.tsx
"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // 🚀 空間傳送門
import { InfoWindow } from "@vis.gl/react-google-maps";
import AddPlaceForm from "./AddPlaceForm";

interface PlaceFormPopupProps {
  trip: any; 
  isReadonly?: boolean;
  onSaveSuccess?: () => void;
}

export default function PlaceFormPopup({ trip, isReadonly = false, onSaveSuccess }: PlaceFormPopupProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!trip.selectedLocation) return null;

  const isEditing = !!trip.editingPlaceId;
  const googleMapsUrl = trip.selectedLocation.googleMapsUrl || "";

  const handleFormSubmit = (e: React.FormEvent, finalDynamicValues: any) => {
    const isSuccess = trip.handleSavePlace(e, finalDynamicValues);
    if (isSuccess) {
      onSaveSuccess?.();
    }
  };

  // 👑 共享表單實體
  const renderFormInstance = () => (
    <AddPlaceForm 
      placeName={trip.placeName} setPlaceName={trip.setPlaceName} 
      placeAddress={trip.placeAddress} setPlaceAddress={trip.setPlaceAddress}
      placePhone={trip.placePhone} setPlacePhone={trip.setPlacePhone}
      placeHours={trip.placeHours} activeFieldsConfig={trip.activeFieldsConfig}
      dynamicFieldValues={trip.dynamicFieldValues} setDynamicFieldValues={trip.setDynamicFieldValues}
      onSubmit={handleFormSubmit} onCancel={trip.handleCancel} 
      isEditing={isEditing} googleMapsUrl={googleMapsUrl} 
      placeColor={trip.placeColor} setPlaceColor={trip.setPlaceColor} 
      isViewer={isReadonly}
    />
  );

  // 📱 手機專用：正式變身成「全域正中央對齊大彈窗」
  const mobileSheetContent = (
    <div 
      onClick={trip.handleCancel} // 🚀 點擊彈窗外面暗黑遮罩區，自動取消退出（貼心 UX）
      className="md:hidden fixed inset-0 z-[9999999] flex items-center justify-center bg-black/65 dark:bg-black/85 backdrop-blur-xs p-4 animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()} // 🛡️ 阻止事件冒泡，防止點擊表單內部也觸發關閉
        className="bg-white dark:bg-gray-900 w-full max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 animate-scaleUp"
      >
        {/* 彈窗頂部固定 Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span className="text-xs font-black text-gray-800 dark:text-gray-200 tracking-wider">
              {isEditing ? "編輯地標資訊" : "新增景點至行程 / 地點庫"}
            </span>
          </div>
          <button 
            type="button" 
            onClick={trip.handleCancel} 
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200/80 dark:bg-gray-700 hover:bg-gray-300 text-gray-600 dark:text-gray-300 font-bold text-xs transition active:scale-90 cursor-pointer"
          >✕</button>
        </div>

        {/* 表單內容（具備獨立滾動條） */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 [&_input[type=text]]:!text-base [&_input[type=tel]]:!text-base">
          {renderFormInstance()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 💻 Desktop 專武：繼續留在地圖格子裡跟隨 LatLng 漂浮 */}
      <div className="hidden md:block">
        <InfoWindow position={trip.selectedLocation} onCloseClick={trip.handleCancel} pixelOffset={[0, -40]}>
          {renderFormInstance()}
        </InfoWindow>
      </div>

      {/* 📱 Mobile 越獄傳送門：直接空降掛載到 <body> 根節點 */}
      {mounted && createPortal(mobileSheetContent, document.body)}
    </>
  );
}