// components/sidebar/TravelMode.tsx
"use client";
import { useState } from "react";
import { Place, Itinerary } from "../types";
import ShareModal from "../share/ShareModal"; 

interface TravelModeProps {
  itinerary: Itinerary;
  places: Place[];
  hoveredPlaceId?: string | null;
  onHoverPlace?: (id: string | null) => void;
  onPlaceClick?: (place: Place) => void;
  itineraries: Itinerary[];
  activeItineraryId: string;
  onSwitchItinerary: (id: string) => void;
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

export default function TravelMode({ 
  itinerary, places, hoveredPlaceId, onHoverPlace, onPlaceClick,
  itineraries, activeItineraryId, onSwitchItinerary
}: TravelModeProps) {

  const [isShareModalOpen, setIsShareModalOpen] = useState(false); 
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const dayColors = ["bg-blue-600", "bg-emerald-500", "bg-orange-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500"];
  const ringColors = ["ring-blue-500", "ring-emerald-500", "ring-orange-500", "ring-purple-500", "ring-pink-500", "ring-cyan-500"];

  // 🚀 幽靈導航觸發：唔去直接 scroll 那個 Day，而係去 scroll 埋喺佢頭頂上方的幽靈點
  const scrollToDay = (dayId: string) => {
    const phantomAnchor = document.getElementById(`travel-phantom-${dayId}`);
    if (phantomAnchor) {
      phantomAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleCardExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setExpandedCards(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="flex flex-col pb-10">
      
      <div className="flex flex-col gap-1.5 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">📁 目前檢視行程</label>
        <div className="flex gap-2 w-full">
          <select
            value={activeItineraryId} onChange={(e) => onSwitchItinerary(e.target.value)}
            className="flex-1 text-xs md:text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm transition"
          >
            {itineraries.map((iti) => (
              <option key={iti.id} value={iti.id}>📁 {iti.name} {iti.startDate ? `(${iti.startDate})` : ""}</option>
            ))}
          </select>
          <button
            type="button" onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm transition-all flex items-center justify-center min-w-[40px]" title="分享與協作"
          >🤝</button>
        </div>
      </div>

      <div id="itinerary-pdf-capture-area" className="bg-white dark:bg-gray-900 transition-colors p-1 rounded-xl">
        
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 hidden group-print:block">
          <h2 className="font-black text-xl text-gray-900 dark:text-white">✈️ {itinerary.name}</h2>
          {itinerary.startDate && <p className="text-xs text-gray-400 mt-1">🗓️ 旅程日期：{itinerary.startDate} 至 {itinerary.endDate || "--"}</p>}
        </div>

        {/* 🚀 Sticky 頂部導覽列 */}
        {itinerary.scheduleDays && itinerary.scheduleDays.length > 0 && (
          <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-30 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-2" data-html2canvas-ignore="true">
            {itinerary.scheduleDays.map((day, idx) => (
              <button
                key={`nav-${day.id}`} onClick={() => scrollToDay(day.id)}
                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm flex items-center gap-1 shrink-0"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${dayColors[idx % dayColors.length]}`}></div>
                Day {idx + 1}
              </button>
            ))}
          </div>
        )}

        {!itinerary.scheduleDays || itinerary.scheduleDays.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500 animate-fadeIn">此行程尚未有任何排程，請先點擊右上方「專業排程」加入景點！📅</div>
        ) : (
          <div className="flex flex-col gap-8">
            {itinerary.scheduleDays.map((day, dayIdx) => {
              const colorClass = dayColors[dayIdx % dayColors.length];
              const ringClass = ringColors[dayIdx % ringColors.length];

              return (
                // 🚀 必須加 position: relative 畀幽靈點定位
                <div key={day.id} id={`travel-day-${day.id}`} className="relative flex flex-col gap-3">
                  
                  {/* 👻 幽靈錨點 (Phantom Anchor) 黑科技：
                      偷偷安放喺 Day 標題頭頂上方 100px 處 (手機版) / 20px 處 (電腦版)。
                      當瀏覽器將呢粒幽靈推到 Viewport 0px 頂部時，真正嘅 Day 標題就會啱啱好停喺 Y = 100px 位置，
                      完美避開佔高約 50px 嘅 Sticky 導覽列！完全無視任何瀏覽器差異！ */}
                  <div 
                    id={`travel-phantom-${day.id}`} 
                    className="absolute -top-[100px] md:-top-[20px] left-0 w-px h-px pointer-events-none invisible" 
                  />

                  {/* 真正嘅 Day 標題列：手動 Scroll 過去時，透過 sticky top-[46px] 吸附喺導覽列底下 */}
                  <div className="flex items-center gap-2 sticky top-[46px] md:top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-20 py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className={`w-3 h-8 ${colorClass} rounded-full`} />
                    <div>
                      <h3 className="font-black text-base text-gray-800 dark:text-gray-100 tracking-wide">{day.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{day.dateStr} ({day.dayOfWeek})</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pl-2 border-l-[3px] border-gray-100 dark:border-gray-800 ml-3.5 mt-2">
                    {day.items.length === 0 ? (
                      <div className="text-xs text-gray-400 italic pl-5 py-2">是日自由活動，暫無行程 ☕</div>
                    ) : (
                      day.items.map((item) => {
                        const place = places.find(p => p.id === item.placeId) as any;
                        if (!place) return null;
                        
                        const isHovered = hoveredPlaceId === place.id;
                        const isExpanded = !!expandedCards[item.id];

                        return (
                          <div 
                            key={item.id}
                            onMouseEnter={() => onHoverPlace?.(place.id)}
                            onMouseLeave={() => onHoverPlace?.(null)}
                            className={`relative pl-5 transition-all duration-200 ${isHovered ? "scale-[1.02] z-10" : ""}`}
                          >
                            <div className="absolute -left-[23px] top-4 bg-white dark:bg-gray-900 p-1 rounded-full">
                              <div className={`w-3 h-3 rounded-full ${colorClass} transition-shadow ${isHovered ? `ring-4 ${ringClass}/40` : ""}`} />
                            </div>

                            <div className={`p-3.5 rounded-xl border shadow-sm transition-all ${
                              isHovered ? "bg-blue-50/40 dark:bg-gray-800 border-blue-300 dark:border-gray-600" : "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                            }`}>
                              
                              <div className="flex flex-col gap-2.5">
                                
                                <div className="flex justify-between items-start gap-2">
                                  <div 
                                    onClick={() => onPlaceClick?.(place)}
                                    className="font-bold text-sm md:text-base text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1.5 truncate" title="點擊在地圖定位"
                                  >
                                    <span>📍</span>
                                    <span className="truncate leading-tight">{place.name}</span>
                                  </div>

                                  {item.startTime && (
                                    <span className="shrink-0 text-[10px] md:text-[11px] font-black bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded shadow-inner">
                                      {item.startTime} {item.endTime ? `- ${item.endTime}` : ""}
                                    </span>
                                  )}
                                </div>

                                <div className="flex justify-end pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleCardExpand(item.id, e)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm border ${
                                      isExpanded 
                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800" 
                                        : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-700 hover:bg-blue-50/50 hover:text-blue-600"
                                    }`}
                                  >
                                    <span>{isExpanded ? "▲" : "▼"}</span>
                                    <span>{isExpanded ? "收起詳情" : "展開詳情"}</span>
                                  </button>
                                </div>

                              </div>

                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80 flex flex-col gap-2.5 text-xs animate-fadeIn">
                                  
                                  {place.address && (
                                    <div className="text-gray-700 dark:text-gray-300 leading-tight">
                                      <span className="text-gray-400 font-bold block text-[10px] mb-0.5">地址</span>
                                      📍 {place.address}
                                    </div>
                                  )}

                                  {place.phoneNumber && (
                                    <div className="text-gray-700 dark:text-gray-300">
                                      <span className="text-gray-400 font-bold block text-[10px] mb-0.5">電話</span>
                                      📞 {place.phoneNumber}
                                    </div>
                                  )}

                                  {place.customFields && Object.keys(place.customFields).length > 0 && (
                                    <>
                                      <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-0.5"></div>
                                      <div className="flex flex-col gap-2.5">
                                        {Object.entries(place.customFields).map(([k, v]) => {
                                          if (v === null || v === undefined || v === "") return null;

                                          let content;
                                          if (typeof v === 'boolean') {
                                            content = <span className="font-bold">{v ? "✅ 是" : "❌ 否"}</span>;
                                          } else if (typeof v === 'string' && isImageUrl(v)) {
                                            content = (
                                              <a href={v} target="_blank" rel="noopener noreferrer" className="block mt-1 overflow-hidden rounded border border-gray-200 dark:border-gray-700 hover:opacity-90 transition">
                                                <img src={v} alt={k} className="w-full h-auto object-cover max-h-40 bg-gray-100 dark:bg-gray-800" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '📎 點擊檢視已上傳檔案 (無法預覽圖片)'; }} />
                                              </a>
                                            );
                                          } else if (typeof v === 'string' && isUrl(v)) {
                                            content = <a href={v} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">📎 開啟連結 / 檢視檔案</a>;
                                          } else {
                                            const displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
                                            content = <div className="break-words whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">{displayVal}</div>;
                                          }

                                          return (
                                            <div key={k}>
                                              <span className="text-[10px] text-gray-400 font-bold block mb-0.5">{k}</span>
                                              {content}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}

                                  {place.openingHours && place.openingHours.length > 0 && (
                                    <div className="mt-1">
                                      <span className="text-[10px] text-gray-400 font-bold block mb-1">營業時間</span>
                                      <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-400 space-y-0.5 max-h-28 overflow-y-auto custom-scrollbar">
                                        {place.openingHours.map((h: any, i: number) => <div key={i}>{h}</div>)}
                                      </div>
                                    </div>
                                  )}

                                  {place.googleMapsUrl && (
                                    <div className="pt-1 pb-1">
                                      <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1">
                                        <span>🔗</span> 在 Google Maps 中開啟地標
                                      </a>
                                    </div>
                                  )}

                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} itinerary={itinerary} />
    </div>
  );
}