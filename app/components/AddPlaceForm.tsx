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

  // 🚀 新增：接收顏色狀態與設定器
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
}

export default function AddPlaceForm({
  placeName,
  setPlaceName,
  placeAddress,
  setPlaceAddress,
  placePhone,
  setPlacePhone,
  placeHours,
  placeColor = "#2563eb", // 預設藍色保底
  setPlaceColor,
  activeFieldsConfig = [],
  dynamicFieldValues = {},
  setDynamicFieldValues,
  onSubmit,
  onCancel,
  isEditing,
  googleMapsUrl,
}: AddPlaceFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

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

      {/* 🚀 將 w-[280px] 解封為 w-full，適應地圖氣泡與全域彈窗雙棲 */}
      <form
        onSubmit={handleSubmit}
        className="p-1 w-full max-h-[70vh] overflow-y-auto flex flex-col gap-3 custom-scrollbar text-gray-800 dark:text-gray-100 pr-2"
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

        {/* ========================================== */}
        {/* 🎨 核心：旅行標籤調色盤區塊 */}
        {/* ========================================== */}
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
                  className={`w-6 h-6 rounded-full shadow-xs transition-all flex items-center justify-center text-white text-xs font-black select-none ${
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

        {/* 動態擴充欄位 */}
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
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-1.5 rounded text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="flex-1 bg-blue-600 dark:bg-blue-500 text-white py-1.5 rounded text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1"
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
