// components/sidebar/PlaceDetailsPanel.tsx
"use client";
import React, { useState, useEffect } from "react"; // 🚀 補回 useState 同 useEffect 引入
import { Place } from "../types";

interface PlaceDetailsPanelProps {
  selectedPlace: Place | null;
}

const isImageUrl = (val: string) => {
  if (typeof val !== 'string') return false;
  if (val.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) != null) return true;
  if (val.includes('.blob.vercel-storage.com')) {
      if (val.toLowerCase().endsWith('.pdf')) return false;
      return true;
  }
  return false;
};

const isUrl = (val: string) => {
  if (typeof val !== 'string') return false;
  return val.startsWith('http://') || val.startsWith('https://');
};

export default function PlaceDetailsPanel({ selectedPlace }: PlaceDetailsPanelProps) {
  const currentPlace = selectedPlace as any;

  // 🚀 手機版黑科技：用家手動點擊「✕ 收起」時記錄為 true
  const [forceHideMobile, setForceHideMobile] = useState(false);

  // 🚀 智能回魂：當用家喺清單點擊咗「新嘅景點」，自動解除隱藏，強行彈出面板
  useEffect(() => {
    if (selectedPlace) {
      setForceHideMobile(false);
    }
  }, [selectedPlace]);

  // 判斷當下喺手機模式應該「顯」定「隱」
  const shouldHideOnMobile = !currentPlace || forceHideMobile;

  return (
    // 🚀 核心修正 1：加入響應式顯隱 class
    // 手機版：如果未揀景點 or 撳咗收起 -> hidden；否則 -> flex animate-slideUp
    // 電腦版 (md:)：永遠雷打不動保持 flex
    <div className={`border-t border-gray-200 dark:border-gray-700 pt-3 flex-col gap-2.5 min-h-[230px] shrink-0 bg-gray-50 dark:bg-gray-800/40 px-4 pb-4 overflow-hidden z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] transition-all duration-300 ${
      shouldHideOnMobile ? "hidden md:flex" : "flex animate-slideUp"
    }`}>
      {currentPlace ? (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar animate-fadeIn pr-2">
          
          {/* 🚀 核心修正 2：頂部標題列加入「✕ 收起」按鈕 */}
          <div className="flex justify-between items-center shrink-0 pt-1 border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5 mb-0.5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">✨ 景點詳細資訊</span>
            
            <button
              type="button"
              onClick={() => setForceHideMobile(true)}
              className="md:hidden text-[11px] font-black bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2.5 py-0.5 rounded-full hover:bg-gray-300 active:scale-95 transition"
            >
              ✕ 收起
            </button>
          </div>

          <div className="font-black text-lg md:text-xl text-gray-900 dark:text-white shrink-0 leading-tight">
            {currentPlace.name}
          </div>

          {currentPlace.address && (
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-tight shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500 block font-bold mb-0.5">地址</span>📍 {currentPlace.address}
            </div>
          )}

          {currentPlace.phoneNumber && (
            <div className="text-sm text-gray-700 dark:text-gray-300 shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500 block font-bold mb-0.5">電話</span>📞 {currentPlace.phoneNumber}
            </div>
          )}

          {currentPlace.customFields && Object.keys(currentPlace.customFields).length > 0 && (
            <>
              <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1 shrink-0"></div>
              <div className="flex flex-col gap-3 shrink-0">
                {Object.entries(currentPlace.customFields).map(([key, value]) => {
                  if (value === null || value === undefined || value === "") return null;

                  let content;
                  if (typeof value === 'boolean') {
                    content = <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-xs md:text-sm shadow-sm">{value ? "✅ 是" : "❌ 否"}</div>;
                  } else if (typeof value === 'string' && isImageUrl(value)) {
                    content = (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="block mt-1 overflow-hidden rounded border border-gray-200 dark:border-gray-700 hover:opacity-90 transition">
                        <img src={value} alt={key} className="w-full h-auto object-cover max-h-40 bg-gray-100 dark:bg-gray-800" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement?.classList.add('p-3', 'text-center', 'text-xs', 'text-gray-500'); (e.target as HTMLImageElement).parentElement!.innerHTML = '📎 點擊檢視已上傳檔案 (無法預覽圖片)'; }} />
                      </a>
                    );
                  } else if (typeof value === 'string' && isUrl(value)) {
                    content = (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-xs md:text-sm shadow-sm truncate">
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"><span>📎</span> 檢視檔案 / 開啟連結</a>
                      </div>
                    );
                  } else {
                    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    content = <div className="break-words whitespace-pre-wrap bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-xs md:text-sm shadow-sm">{displayValue}</div>;
                  }

                  return (
                    <div key={key} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-xs text-gray-400 dark:text-gray-500 block font-bold mb-0.5">{key}</span>
                      {content}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {currentPlace.openingHours && currentPlace.openingHours.length > 0 && (
            <div className="text-sm flex flex-col shrink-0 mt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500 block font-bold mb-1">營業時間</span>
              <div className="bg-white dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-700 text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-1 shadow-inner">
                {currentPlace.openingHours.map((h: string, i: number) => (
                  <div key={i} className="border-b border-gray-50 dark:border-gray-700/30 pb-0.5 last:border-0">{h}</div>
                ))}
              </div>
            </div>
          )}

          {currentPlace.googleMapsUrl && (
            <a href={currentPlace.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block shrink-0 pb-2">
              🔗 在 Google Maps 中開啟地標
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-4 text-gray-400 dark:text-gray-500 animate-fadeIn">
          <span className="text-3xl mb-2">ℹ️</span>
          <p className="text-sm font-bold leading-relaxed">請點擊上方清單中的景點<br/>以查看詳細資訊</p>
        </div>
      )}
    </div>
  );
}