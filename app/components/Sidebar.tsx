// components/Sidebar.tsx
import { Place } from "./types";

interface SidebarProps {
  places: Place[];
  onClose: () => void;
  onPlaceClick: (place: Place) => void; // 🚀 新增：點擊清單項目嘅 Callback
}

export default function Sidebar({ places, onClose, onPlaceClick }: SidebarProps) {
  return (
    <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-r border-gray-200 h-[40vh] md:h-full overflow-y-auto flex flex-col shadow-lg z-20">
      <div className="p-4 border-b border-gray-100 bg-gray-50 sticky top-0 z-10 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-gray-800">📍 我的地點清單</h2>
          <p className="text-sm text-gray-500">喺地圖上點擊任何位置新增地點</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center transition"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex-1">
        {places.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <span className="text-3xl">🗺️</span>
            <p className="text-sm">尚未加入任何地點</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {places.map((place) => (
              <li
                key={place.id}
                onClick={() => onPlaceClick(place)} // 🚀 綁定點擊事件
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm transition cursor-pointer group"
              >
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-700">
                  {place.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}