// components/AddPlaceForm.tsx
"use client";

import { useState } from "react";

// 🎨 旅行美學調色盤常數
const TRAVEL_PALETTE = [
  { name: "皇家藍 (預設)", hex: "#2563eb" },
  { name: "翡翠綠 (自然/餐廳)", hex: "#10b981" },
  { name: "日落橙 (小吃/咖啡)", hex: "#f59e0b" },
  { name: "熱情玫 (打卡熱點)", hex: "#f43f5e" },
  { name: "薰衣紫 (藝術/展覽)", hex: "#8b5cf6" },
  { name: "晚霞粉 (購物)", hex: "#ec4899" },
  { name: "加勒比 (海灘/水上)", hex: "#06b6d4" },
  { name: "極簡灰 (交通/備用)", hex: "#64748b" },
];

interface AddPlaceFormProps {
  placeName: string;
  setPlaceName: (name: string) => void;

  placeAddress: string;
  setPlaceAddress: (address: string) => void;
  placePhone: string;
  setPlacePhone: (phone: string) => void;
  placeHours: string[];

  placeColor?: string;
  setPlaceColor?: (color: string) => void;

  activeFieldsConfig?: any[];
  dynamicFieldValues?: Record<string, any>;
  setDynamicFieldValues?: React.Dispatch<
    React.SetStateAction<Record<string, any>>
  >;

  onSubmit: (
    e: React.FormEvent,
    finalDynamicValues?: Record<string, any>,
  ) => void;
  onCancel: () => void;
  isEditing: boolean;
  googleMapsUrl?: string;

  // 🚀 1. 新增權限插座：接收唯讀訪客身分證
  isViewer?: boolean; 
}

export default function AddPlaceForm({
  placeName,
  setPlaceName,
  placeAddress,
  setPlaceAddress,
  placePhone,
  setPlacePhone,
  placeHours,
  placeColor = "#2563eb", 
  setPlaceColor,
  activeFieldsConfig = [],
  dynamicFieldValues = {},
  setDynamicFieldValues,
  onSubmit,
  onCancel,
  isEditing,
  googleMapsUrl,
  isViewer = false, // 🚀 保底預設為可編輯
}: AddPlaceFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  // =====================================================================
  // 🛡️ 2. 絕對唯讀石化結界：如果是 Viewer，直接沒收 Input 表單！
  // 吐出一張極致優雅、泛著尊貴紫光、帶有 Google Maps 導航掣的「地標卡片」！
  // =====================================================================
  if (isViewer) {
    return (
      <div className="p-2 flex flex-col gap-3 min-w-[240px] max-w-xs select-none animate-fadeIn text-gray-800 dark:text-gray-100">
        <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/50 pb-2.5">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <span className="text-base shrink-0">📍</span>
            <span className="font-black text-sm truncate">{placeName}</span>
          </div>
          <span className="text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded shadow-2xs uppercase tracking-wider shrink-0 select-none">
            🔒 唯讀地標
          </span>
        </div>

        <div className="flex flex-col gap-2 text-xs text-gray-600 dark:text-gray-300 pl-1 py-1">
          {placeAddress ? (
            <div className="flex items-start gap-1.5">
              <span className="text-gray-400 shrink-0">🏠</span>
              <span className="break-words leading-tight">{placeAddress}</span>
            </div>
          ) : (
            <div className="text-gray-400 italic">🏠 未提供地址</div>
          )}

          {placePhone ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-gray-400 shrink-0">📞</span>
              <span className="truncate">{placePhone}</span>
            </div>
          ) : (
            <div className="text-gray-400 italic">📞 未提供電話號碼</div>
          )}
        </div>

        {placeHours.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
            <span className="font-bold text-[10px] text-gray-400 block mb-1">營業時間：</span>
            {placeHours.map((h, i) => <div key={i}>{h}</div>)}
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between mt-1">
          {googleMapsUrl ? (
            <a
              href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 active:scale-95 transition-transform"
            >
              <span>🗺️</span> 在 Google Maps 開啟
            </a>
          ) : <span />}

          <button
            type="button" onClick={onCancel}
            className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer shrink-0"
          >
            關閉
          </button>
        </div>
      </div>
    );
  }
  // =====================================================================

  const handleDynamicChange = (key: string, val: any) => {
    if (setDynamicFieldValues)
      setDynamicFieldValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    const updatedValues = { ...dynamicFieldValues };

    try {
      for (const [key, file] of Object.entries(pendingFiles)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`上傳 ${file.name} 失敗`);
        const blob = await res.json();
        updatedValues[key] = blob.url;
      }
      if (setDynamicFieldValues) setDynamicFieldValues(updatedValues);
      await onSubmit(e, updatedValues);
    } catch (err) {
      alert("檔案上傳失敗，請稍後再試！");
      console.error(err);
    } finally {
      setIsUploading(false);
      setPendingFiles({});
    }
  };

  return (
    <>
      <style>{`
        html.dark .gm-style-iw-c { background-color: #111827 !important; }
        html.dark .gm-style-iw-t::after { background: #111827 !important; }
        html.dark .gm-ui-hover-effect { filter: invert(1) !important; }
        html.dark .gm-style-iw-d::-webkit-scrollbar-track,
        html.dark .gm-style-iw-d::-webkit-scrollbar-track-piece { background: #111827 !important; }
      `}</style>

      <form
        onSubmit={handleSubmit}
        className="p-1 w-full max-h-[70vh] overflow-y-auto flex flex-col gap-3 custom-scrollbar text-gray-800 dark:text-gray-100 pr-2 animate-fadeIn"
      >
        <h3 className="font-bold text-base border-b border-gray-200 dark:border-gray-800 pb-2">
          {isEditing ? "✏️ 編輯地點" : "📍 新增地點"}
        </h3>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
            地點名稱 *
          </label>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="輸入地點名稱"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
            地址
          </label>
          <textarea
            rows={2}
            value={placeAddress}
            onChange={(e) => setPlaceAddress(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
            placeholder="地址 (可留空)"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
            電話
          </label>
          <input
            type="text"
            value={placePhone}
            onChange={(e) => setPlacePhone(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="電話號碼 (可留空)"
          />
        </div>

        {placeHours.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              營業時間
            </label>
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-600 dark:text-gray-300 max-h-24 overflow-y-auto custom-scrollbar">
              {placeHours.map((hour, idx) => (
                <div key={idx} className="mb-0.5">
                  {hour}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            景點標籤顏色
          </label>
          <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            {TRAVEL_PALETTE.map((item) => {
              const isSelected = placeColor === item.hex;
              return (
                <button
                  key={item.hex}
                  type="button"
                  onClick={() => setPlaceColor?.(item.hex)}
                  style={{ backgroundColor: item.hex }}
                  className={`w-6 h-6 rounded-full shadow-xs transition-all flex items-center justify-center text-white text-xs font-black select-none cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-offset-1 ring-gray-800 dark:ring-white scale-110"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  title={item.name}
                >
                  {isSelected ? "✓" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {activeFieldsConfig.filter((f) => f.isActive).length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
              景點擴充資料
            </label>
            <div className="flex flex-col gap-3">
              {activeFieldsConfig
                .filter((f) => f.isActive)
                .map((field) => {
                  const currentValue =
                    dynamicFieldValues[field.key] ??
                    (field.type === "checkbox" ? false : "");

                  return (
                    <div key={field.id}>
                      {field.type === "checkbox" ? (
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={!!currentValue}
                            onChange={(e) =>
                              handleDynamicChange(field.key, e.target.checked)
                            }
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                          />
                          <span
                            className={
                              currentValue
                                ? "text-green-600 dark:text-green-400 font-bold"
                                : "text-gray-600 dark:text-gray-300"
                            }
                          >
                            {field.label} {field.isRequired ? "*" : ""}
                          </span>
                        </label>
                      ) : (
                        <div>
                          <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                            {field.label} {field.isRequired ? "*" : ""}
                          </label>
                          {field.type === "text" && (
                            <input
                              required={field.isRequired}
                              type="text"
                              placeholder={`輸入${field.label}...`}
                              value={currentValue}
                              onChange={(e) =>
                                handleDynamicChange(field.key, e.target.value)
                              }
                              className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                            />
                          )}
                          {field.type === "textarea" && (
                            <textarea
                              required={field.isRequired}
                              placeholder={`輸入${field.label}...`}
                              value={currentValue}
                              onChange={(e) =>
                                handleDynamicChange(field.key, e.target.value)
                              }
                              rows={3}
                              className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-y custom-scrollbar"
                            />
                          )}
                          {field.type === "number" && (
                            <input
                              required={field.isRequired}
                              type="number"
                              placeholder="0"
                              value={currentValue}
                              onChange={(e) =>
                                handleDynamicChange(field.key, e.target.value)
                              }
                              className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                            />
                          )}
                          {(field.type === "file" ||
                            field.type === "image") && (
                            <div className="flex flex-col gap-1">
                              <input
                                required={field.isRequired && !currentValue}
                                type="file"
                                disabled={isUploading}
                                accept={
                                  field.type === "image"
                                    ? "image/*"
                                    : "application/pdf,image/*"
                                }
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file)
                                    setPendingFiles((p) => ({
                                      ...p,
                                      [field.key]: file,
                                    }));
                                }}
                                className="w-full text-xs text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-gray-800 dark:file:text-gray-200 hover:file:bg-blue-100 dark:hover:file:bg-gray-700 cursor-pointer disabled:opacity-50"
                              />
                              {pendingFiles[field.key] && (
                                <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                                  ⏳ 準備上傳: {pendingFiles[field.key].name}
                                </div>
                              )}
                              {currentValue && !pendingFiles[field.key] && (
                                <a
                                  href={currentValue}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate mt-1 flex items-center gap-1"
                                >
                                  <span>
                                    {field.type === "image" ? "🖼️" : "📎"}
                                  </span>
                                  檢視已上傳檔案
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
          >
            🔗 在 Google Maps 中開啟
          </a>
        )}

        <div className="flex gap-2 mt-2 pt-3 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-1.5 rounded text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="flex-1 bg-blue-600 dark:bg-blue-500 text-white py-1.5 rounded text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1 cursor-pointer"
          >
            {isUploading ? (
              <>
                <span className="animate-spin">⌛</span> 上傳中...
              </>
            ) : isEditing ? (
              "儲存修改"
            ) : (
              "新增"
            )}
          </button>
        </div>
      </form>
    </>
  );
}