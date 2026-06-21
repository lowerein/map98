// components/sidebar/ItineraryManager.tsx
"use client";
import { Itinerary } from "../types";

interface ItineraryManagerProps {
  itineraries: Itinerary[];
  activeItinerary: Itinerary;
  onSwitchItinerary: (id: string) => void;
  onRenameItinerary: (id: string, newName: string) => void;
  onCreateItinerary: () => void;
  onDateRangeChange: (start: string, end: string) => void;
}

export default function ItineraryManager({
  itineraries, activeItinerary, onSwitchItinerary, onRenameItinerary, onCreateItinerary, onDateRangeChange
}: ItineraryManagerProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-3 transition-colors">
      
      {/* 行程選擇與管理 */}
      <div className="flex items-center gap-2">
        <select
          value={activeItinerary.id}
          onChange={(e) => onSwitchItinerary(e.target.value)}
          className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 bg-transparent py-1 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 cursor-pointer truncate"
        >
          {itineraries.map(iti => (
            // 🚀 確保下拉選單裡面都係靚色
            <option key={iti.id} value={iti.id} className="bg-white dark:bg-gray-800 dark:text-gray-100">📁 {iti.name}</option>
          ))}
        </select>
        <button 
          onClick={() => {
            const newName = prompt("請輸入新行程名稱：", activeItinerary.name);
            if (newName && newName.trim()) onRenameItinerary(activeItinerary.id, newName.trim());
          }} 
          className="text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 px-2 py-1.5 rounded transition font-medium flex-shrink-0"
        >✏️ 改名</button>
        <button 
          onClick={onCreateItinerary} 
          className="text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 px-2 py-1.5 rounded transition font-medium border border-green-200 dark:border-green-800 flex-shrink-0"
        >➕ 新增</button>
      </div>

      {/* 🚀 修正：改為直向或響應式 Grid，手機版上下排，並且加入完美 Dark Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 transition-colors">
        <div>
          <label className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold mb-0.5">📅 出發日</label>
          <input 
            type="date" 
            value={activeItinerary.startDate} 
            onChange={(e) => onDateRangeChange(e.target.value, activeItinerary.endDate)} 
            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded p-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 dark:[color-scheme:dark] transition-colors" 
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold mb-0.5">🏁 結束日</label>
          <input 
            type="date" 
            value={activeItinerary.endDate} 
            onChange={(e) => onDateRangeChange(activeItinerary.startDate, e.target.value)} 
            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded p-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 dark:[color-scheme:dark] transition-colors" 
          />
        </div>
      </div>
    </div>
  );
}