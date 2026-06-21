// components/organize/OrganizeHeader.tsx
"use client";
import { useState } from "react";
import { Itinerary } from "../types";
import ItineraryDialog from "./ItineraryDialog"; 
import { useRouter } from "next/navigation"; 

// 🚀 引入 Web 界頂級 PDF 雙子星引擎
import html2canvas from "html2canvas-pro"; 
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
  const [isExporting, setIsExporting] = useState(false);

  // =====================================================================
  // 🚀 權限天線解構：提煉出當前行程的協作身分
  // =====================================================================
  const currentAccess = (activeItinerary as any)?.access || "owner";
  const isShared = (activeItinerary as any)?.isShared || false;
  const ownerName = (activeItinerary as any)?.ownerName || "協作者";
  const isViewer = currentAccess === "viewer";

  const totalDays = activeItinerary?.startDate && activeItinerary?.endDate
    ? Math.ceil((new Date(activeItinerary.endDate).getTime() - new Date(activeItinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const handleReturnToPlanner = () => {
    router.push('/planner');
  };

  const handleSaveAndClose = () => {
    if (!isViewer) {
      onSave(); // 雙重保險：只有非 Viewer 才准觸發儲存！
    }
    router.push('/planner'); 
  };

  // Jarvis PDF 導播拍攝引擎 (維持完美原判)
  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const prevShowList = showList;
    const prevShowMap = showMap;
    setShowList(false);
    setShowMap(false);

    setTimeout(async () => {
      triggerCalendarResize(); 
      const targetEl = document.getElementById("organize-calendar-pdf-zone");
      if (targetEl) {
        try {
          const originalHeight = targetEl.style.height;
          targetEl.style.height = "max-content"; 
          const isDark = document.documentElement.classList.contains("dark");

          const canvas = await html2canvas(targetEl, {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: isDark ? "#111827" : "#ffffff", 
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
                fcLayouts.forEach((el: any) => { el.style.setProperty("height", "auto", "important"); });
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
          const imgData = canvas.toDataURL("image/jpeg", 0.82);
          const canvasW = canvas.width; const canvasH = canvas.height;
          const targetPdfWidth = 297; 
          const customPdfHeight = (canvasH * targetPdfWidth) / canvasW;

          const pdf = new jsPDF({
            orientation: customPdfHeight > targetPdfWidth ? "portrait" : "landscape",
            unit: "mm",
            format: [targetPdfWidth, customPdfHeight],
          });

          pdf.addImage(imgData, "JPEG", 0, 0, targetPdfWidth, customPdfHeight);
          const safeTitle = (activeItinerary?.name || "行程排程").replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
          pdf.save(`行程日曆_${safeTitle}.pdf`);

        } catch (err) {
          console.error("PDF生成失敗:", err); alert("PDF 匯出失敗，請重試！");
        }
      } else { alert("找不到日曆區塊！"); }

      setShowList(prevShowList); setShowMap(prevShowMap);
      setTimeout(triggerCalendarResize, 50); setIsExporting(false);
    }, 350); 
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
          {itineraries.map((iti: any) => {
            // 🚀 絕殺 1：下拉選單 Remark 標註
            const remark = iti.isShared ? ` [來自 ${iti.ownerName || "夥伴"}]` : "";
            return (
              <option key={iti.id} value={iti.id}>
                📁 {iti.name}{remark}
              </option>
            );
          })}
        </select>

        {/* ➕ 新增行程：任何人隨時可建自己的新行程，保留！ */}
        <button
          onClick={() => { setDialogMode("create"); setIsDialogOpen(true); }}
          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>➕</span> 新增行程
        </button>

        {/* ===================================================================== */}
        {/* 🚀 絕殺 2：沒收改名掣！只要是 Viewer，禁止編輯別人的標題與日期！ */}
        {/* ===================================================================== */}
        {!isViewer && (
          <button
            onClick={() => { setDialogMode("edit"); setIsDialogOpen(true); }}
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>✏️</span> 編輯名稱/日期
          </button>
        )}
      </div>

      {/* 📅 中間：行程資訊 */}
      {activeItinerary?.startDate ? (
        <div className="hidden md:flex items-center gap-2 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-2 rounded-xl border border-blue-100/70 dark:border-blue-900/30 text-xs shadow-inner font-bold text-blue-800 dark:text-blue-300">
          <span>📅</span>
          <span>{activeItinerary.startDate}</span>
          <span className="text-gray-300 dark:text-gray-700">~</span>
          <span>{activeItinerary.endDate}</span>
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] ml-1 font-black shadow-sm shrink-0">共 {totalDays} 天</span>
          
          {/* 🚀 中間小警示 */}
          {isViewer && (
            <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-[10px] ml-1 font-black shadow-sm uppercase shrink-0">
              🔒 唯讀
            </span>
          )}
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

        {/* 📄 PDF 匯出掣（Viewer 絕對可以使用，把別人的行程表印下來！） */}
        <button 
          onClick={handleExportPDF} disabled={isExporting}
          className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-black transition-all shadow-sm text-xs md:text-sm flex items-center gap-1 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
          title="將目前滿版日曆匯出成高清 PDF"
        >
          {isExporting ? <><span className="animate-spin inline-block">⏳</span><span className="text-xs">拍攝中...</span></> : <><span>📄</span><span>匯出 PDF</span></>}
        </button>
        
        {/* ===================================================================== */}
        {/* 🚀 絕殺 3：儲存陷阱迴避術！
            如果是 Viewer，綠色儲存掣與返回掣合體成一粒安全的「🚪 返回 Planner (唯讀)」 */}
        {/* ===================================================================== */}
        {isViewer ? (
          <button 
            type="button"
            onClick={handleReturnToPlanner} 
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black transition shadow-sm text-xs md:text-sm cursor-pointer shrink-0"
          >
            🚪 返回 Planner (唯讀)
          </button>
        ) : (
          <>
            <button onClick={handleSaveAndClose} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-black transition shadow-sm text-xs md:text-sm cursor-pointer shrink-0">
              💾 儲存並返回
            </button>
            <button onClick={handleReturnToPlanner} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition text-xs md:text-sm cursor-pointer shrink-0">
              返回 Planner
            </button>
          </>
        )}
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