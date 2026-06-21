// components/organize/ItineraryDialog.tsx
"use client";
import { useState, useEffect } from "react";

interface ItineraryDialogProps {
  isOpen: boolean;
  mode: "create" | "edit";
  onClose: () => void;
  // 🚀 提交時會帶有名稱、出發同結束日期
  onSubmit: (name: string, start: string, end: string) => void;
  // 🚀 編輯模式限定：刪除按鈕功能
  onDelete?: () => void;
  initialData?: {
    name: string;
    startDate: string;
    endDate: string;
  };
}

export default function ItineraryDialog({ isOpen, mode, onClose, onSubmit, onDelete, initialData }: ItineraryDialogProps) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // 當彈窗打開或 initialData 改變時，同步帶入舊資料
  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setStart(initialData?.startDate || "");
      setEnd(initialData?.endDate || "");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isEdit = mode === "edit";

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name || "未命名行程", start, end);
    onClose();
  };

  const handleInternalDelete = () => {
    if (!onDelete) return;
    if (window.confirm(`⚠️ 確定要永久刪除「${initialData?.name}」嗎？\n此動作將無法復原，入面排好嘅日曆事件都會一齊消滅！`)) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
      <form 
        onSubmit={handleFormSubmit} 
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 flex flex-col gap-4 animate-scaleUp"
      >
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 border-b dark:border-gray-800 pb-2">
          <span>{isEdit ? "✏️ 編輯行程資料" : "📁 建立全新行程"}</span>
        </h3>
        
        {/* 行程名稱 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">行程名稱</label>
          <input 
            required 
            type="text" 
            placeholder="例如：東京浪漫五天遊 🌸" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100" 
          />
        </div>

        {/* 日期區塊 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">出發日期</label>
            <input 
              type="date" 
              value={start} 
              onChange={(e) => setStart(e.target.value)} 
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium outline-none text-gray-800 dark:text-gray-100 cursor-pointer" 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">結束日期</label>
            <input 
              type="date" 
              value={end} 
              onChange={(e) => setEnd(e.target.value)} 
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium outline-none text-gray-800 dark:text-gray-100 cursor-pointer" 
            />
          </div>
        </div>

        {/* 按鈕功能欄 */}
        <div className="flex gap-2.5 justify-between items-center mt-2 border-t dark:border-gray-800 pt-3">
          
          {/* 左下角：只有編輯模式先會出現嘅刪除掣 */}
          {isEdit && onDelete ? (
            <button
              type="button"
              onClick={handleInternalDelete}
              className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition flex items-center gap-1 shrink-0"
            >
              🗑️ 刪除此行程
            </button>
          ) : (
            <div /> /* Placeholder */
          )}

          {/* 右下角：確認與取消 */}
          <div className="flex gap-2 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-bold text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              取消
            </button>
            <button 
              type="submit" 
              className={`px-5 py-2 text-sm font-black text-white rounded-xl shadow-md transition ${isEdit ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isEdit ? "💾 確認修改" : "🚀 建立行程"}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}