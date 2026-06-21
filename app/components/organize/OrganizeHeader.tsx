// components/organize/OrganizeHeader.tsx
"use client";
import { useState } from "react";
import { Itinerary } from "../types";
import ItineraryDialog from "./ItineraryDialog"; // 🚀 引入新組件
import { useRouter } from "next/navigation"; // 🚀 引入 useRouter

interface OrganizeHeaderProps {
  itineraries: Itinerary[];
  activeItineraryId: string;
  onSwitchItinerary: (id: string) => void;
  onCreateItinerary: (name: string, start: string, end: string) => void;
  onRenameItinerary: (id: string, newName: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onDeleteItinerary: (id: string) => void; // 🚀 新增：刪除 Prop
  
  showList: boolean;
  setShowList: (show: boolean) => void;
  showMap: boolean;
  setShowMap: (show: boolean) => void;
  onSave: () => void;
  onClose: () => void;
  triggerCalendarResize: () => void;
}

export default function OrganizeHeader({
  itineraries, activeItineraryId, onSwitchItinerary, onCreateItinerary, onRenameItinerary, onDateRangeChange, onDeleteItinerary,
  showList, setShowList, showMap, setShowMap, onSave, onClose, triggerCalendarResize
}: OrganizeHeaderProps) {
  const router = useRouter(); // 🚀 初始化 router
  const activeItinerary = itineraries.find(i => i.id === activeItineraryId) || itineraries[0];

  // 控制新元件嘅打開狀態
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalDays = activeItinerary?.startDate && activeItinerary?.endDate
    ? Math.ceil((new Date(activeItinerary.endDate).getTime() - new Date(activeItinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  // 🚀 處理返回邏輯
  const handleReturnToPlanner = () => {
    router.push('/planner');
  };

  // 🚀 處理儲存並關閉邏輯
  const handleSaveAndClose = () => {
    onSave(); // 觸發儲存
    router.push('/planner'); // 儲存完跳走
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex justify-between items-center shadow-sm shrink-0 transition-colors z-20 h-16 w-full">
      
      {/* 📁 左側：行程下拉與觸發掣 */}
      <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="text-base font-black text-blue-600 dark:text-blue-400 hidden lg:block shrink-0">
          🗓️ 排程工作台
        </h1>
        
        <select
          value={activeItineraryId}
          onChange={(e) => onSwitchItinerary(e.target.value)}
          className="text-xs md:text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-black px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-inner max-w-[180px] truncate"
        >
          {itineraries.map((iti) => (
            <option key={iti.id} value={iti.id}>📁 {iti.name}</option>
          ))}
        </select>

        <button
          onClick={() => { setDialogMode("create"); setIsDialogOpen(true); }}
          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center gap-1"
        >
          <span>➕</span> 新增行程
        </button>

        <button
          onClick={() => { setDialogMode("edit"); setIsDialogOpen(true); }}
          className="px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold transition flex items-center gap-1"
        >
          <span>✏️</span> 編輯名稱/日期
        </button>
      </div>

      {/* 📅 中間：行程資訊 */}
      {activeItinerary?.startDate ? (
        <div className="hidden md:flex items-center gap-2 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-2 rounded-xl border border-blue-100/70 dark:border-blue-900/30 text-xs shadow-inner font-bold text-blue-800 dark:text-blue-300">
          <span>📅</span>
          <span>{activeItinerary.startDate}</span>
          <span className="text-gray-300 dark:text-gray-700">~</span>
          <span>{activeItinerary.endDate}</span>
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] ml-1 font-black shadow-sm">共 {totalDays} 天</span>
        </div>
      ) : (
        <div className="hidden md:block text-xs text-gray-400 italic">⚠️ 未設定行程日期，請點擊編輯設定</div>
      )}
      
      {/* 🛠️ 右側：控制與儲存 */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
          <button onClick={() => { setShowList(!showList); setTimeout(triggerCalendarResize, 300); }} className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition ${showList ? "bg-white dark:bg-gray-600 text-blue-700 dark:text-white shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}>📍 清單</button>
          <button onClick={() => { setShowMap(!showMap); setTimeout(triggerCalendarResize, 300); }} className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition ${showMap ? "bg-white dark:bg-gray-600 text-blue-700 dark:text-white shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}>🗺️ 地圖</button>
        </div>
        
        {/* 🚀 改用 handleSaveAndClose */}
        <button onClick={handleSaveAndClose} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-black transition shadow-sm text-xs md:text-sm">
          💾 儲存並返回
        </button>
        
        {/* 🚀 改用 handleReturnToPlanner */}
        <button onClick={handleReturnToPlanner} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition text-xs md:text-sm">
          返回 Planner
        </button>
      </div>

{/* 🚀 絕殺黑科技：利用 key={activeItineraryId + (activeItinerary?.name || "")} 
          強迫 Dialog 在切換行程或改名後「當場轉世重生」，徹底幹掉表單殘留舊名字的 Bug！ */}
      <ItineraryDialog 
        key={activeItineraryId + (activeItinerary?.name || "")} 
        isOpen={isDialogOpen}
        mode={dialogMode}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={(name, start, end) => {
          if (dialogMode === "create") onCreateItinerary(name, start, end);
          else { 
            onRenameItinerary(activeItineraryId, name); 
            onDateRangeChange(start, end); 
          }
        }}
        onDelete={() => onDeleteItinerary(activeItineraryId)} 
        initialData={{
          name: activeItinerary?.name || "",
          startDate: activeItinerary?.startDate || "",
          endDate: activeItinerary?.endDate || ""
        }}
      />

    </div>
  );
}