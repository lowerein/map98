// components/organize/OrganizeHeader.tsx
"use client";
import { useState } from "react";
import { Itinerary } from "../types";
import ItineraryDialog from "./ItineraryDialog"; 
import { useRouter } from "next/navigation"; 

// 🚀 引入 Web 界頂級 PDF 雙子星引擎
import html2canvas from "html2canvas-pro"; // 🌟 推薦使用 pro 版，完美兼容 oklab 顏色
import jsPDF from "jspdf";

interface OrganizeHeaderProps {
  itineraries: Itinerary[];
  activeItineraryId: string;
  onSwitchItinerary: (id: string) => void;
  onCreateItinerary: (name: string, start: string, end: string) => void;
  onRenameItinerary: (id: string, newName: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onDeleteItinerary: (id: string) => void; 
  
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
  const router = useRouter(); 
  const activeItinerary = itineraries.find(i => i.id === activeItineraryId) || itineraries[0];

  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 🚀 新增狀態：追蹤 PDF 引擎是否正在清場拍攝中
  const [isExporting, setIsExporting] = useState(false);

  const totalDays = activeItinerary?.startDate && activeItinerary?.endDate
    ? Math.ceil((new Date(activeItinerary.endDate).getTime() - new Date(activeItinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const handleReturnToPlanner = () => {
    router.push('/planner');
  };

  const handleSaveAndClose = () => {
    onSave(); 
    router.push('/planner'); 
  };

  // =====================================================================
  // 🚀 Jarvis 級全自動導播清場截圖 PDF 引擎（完美修復裁剪 Bug 版）
  // =====================================================================
  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    // 1. 備份用家當前的 UI 佈局喜好
    const prevShowList = showList;
    const prevShowMap = showMap;

    // 2. 霸道清場：暫時沒收清單同地圖，逼令 Calendar 橫向撐到 100% 滿版！
    setShowList(false);
    setShowMap(false);

    // 給予瀏覽器 350ms 執行 CSS Slide 縮合動畫及重算網格寬度
    setTimeout(async () => {
      triggerCalendarResize(); 

      const targetEl = document.getElementById("organize-calendar-pdf-zone");

      if (targetEl) {
try {
          // 1. 暫時解除真實高度封印
          const originalHeight = targetEl.style.height;
          targetEl.style.height = "max-content"; 

          const isDark = document.documentElement.classList.contains("dark");

          // 📸 拍照 (維持 Retina 2倍清晰度)
          const canvas = await html2canvas(targetEl, {
            scale: 2, 
            useCORS: true, 
            logging: false,
            backgroundColor: isDark ? "#111827" : "#ffffff", // 必須實色底，否則 JPEG 會把透明底變成死黑
            onclone: (clonedDoc) => {
              const clonedTarget = clonedDoc.getElementById("organize-calendar-pdf-zone");
              if (clonedTarget) {
                const scrollers = clonedTarget.querySelectorAll(".fc-scroller, .overflow-y-auto, .overflow-x-auto");
                scrollers.forEach((el: any) => {
                  el.style.setProperty("overflow", "visible", "important");
                  el.style.setProperty("height", "auto", "important");
                  el.style.setProperty("max-height", "none", "important");
                });
                const fcLayouts = clonedTarget.querySelectorAll(".fc-view, .fc-timegrid, .fc-timegrid-body, .fc-timegrid-slots, .fc-timegrid-cols, .fc-timegrid-slots table");
                fcLayouts.forEach((el: any) => {
                  el.style.setProperty("height", "auto", "important");
                });
                const stickyHeaders = clonedTarget.querySelectorAll(".fc-col-header");
                stickyHeaders.forEach((el: any) => {
                  el.style.setProperty("position", "relative", "important");
                  el.style.setProperty("top", "0", "important");
                });
                const calendarEvents = clonedTarget.querySelectorAll(".fc-timegrid-event");
                calendarEvents.forEach((eventEl: any) => {
                  const innerDiv = eventEl.querySelector(".w-full.h-full");
                  if (innerDiv && eventEl.style.backgroundColor) {
                    innerDiv.style.setProperty("background-color", eventEl.style.backgroundColor, "important");
                    innerDiv.style.setProperty("border-color", eventEl.style.borderColor || eventEl.style.backgroundColor, "important");
                  }
                });
              }
            }
          });

          targetEl.style.height = originalHeight; 

          // =====================================================================
          // 🔥 絕殺一：瘦身手術！由 PNG 改為 82% 高清壓縮 JPEG
          // =====================================================================
          const imgData = canvas.toDataURL("image/jpeg", 0.82);

          const canvasW = canvas.width;
          const canvasH = canvas.height;

          // =====================================================================
          // 🔥 絕殺二：動態裁縫演算法！給予畫布自由呼吸的專屬身段
          // =====================================================================
          const targetPdfWidth = 297; // 鎖定標準橫向 A4 闊度作為肉眼閱讀基準 (mm)
          
          // 精準按比例算出：這幅截圖在 297mm 闊的情況下，應該要配幾多 mm 的高度？
          const customPdfHeight = (canvasH * targetPdfWidth) / canvasW;

          // 破天荒召喚「非標準自訂尺寸」的 PDF 物件！
          const pdf = new jsPDF({
            orientation: customPdfHeight > targetPdfWidth ? "portrait" : "landscape",
            unit: "mm",
            format: [targetPdfWidth, customPdfHeight], // 👈 傳入陣列：[闊, 高]
          });

          // 由坐標 (0, 0) 開始貼上，闊度拉到 targetPdfWidth，高度拉到 customPdfHeight
          // 完美 1 : 1 填滿畫布，零邊距，零留白！
          pdf.addImage(imgData, "JPEG", 0, 0, targetPdfWidth, customPdfHeight);

          const safeTitle = (activeItinerary?.name || "行程排程").replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
          pdf.save(`行程日曆_${safeTitle}.pdf`);

        } catch (err) {
          console.error("PDF生成失敗:", err);
          alert("PDF 匯出失敗，請重試！");
        }
      } else {
        alert("找不到日曆區塊！");
      }

      // 3. 拍攝完畢，還原現場
      setShowList(prevShowList);
      setShowMap(prevShowMap);
      setTimeout(triggerCalendarResize, 50);
      setIsExporting(false);

    }, 350); 
  };
  // =====================================================================

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

        {/* 📄 完美收展版 PDF 匯出掣 */}
        <button 
          onClick={handleExportPDF} 
          disabled={isExporting}
          className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-black transition-all shadow-sm text-xs md:text-sm flex items-center gap-1 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
          title="將目前滿版日曆匯出成 A4 高清 PDF"
        >
          {isExporting ? (
            <>
              <span className="animate-spin inline-block">⏳</span>
              <span className="text-xs">解網格拍攝中...</span>
            </>
          ) : (
            <>
              <span>📄</span>
              <span>匯出 PDF</span>
            </>
          )}
        </button>
        
        <button onClick={handleSaveAndClose} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-black transition shadow-sm text-xs md:text-sm">
          💾 儲存並返回
        </button>
        
        <button onClick={handleReturnToPlanner} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition text-xs md:text-sm">
          返回 Planner
        </button>
      </div>

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