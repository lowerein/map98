// app/admin/settings/page.tsx
"use client";
import { useState, useEffect } from "react";
import { getSettings, saveSettings } from "@/app/lib/actions/admin";

export default function SettingsManagement() {
  const [appName, setAppName] = useState("98Map");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [mapLat, setMapLat] = useState("22.3193");
  const [mapLng, setMapLng] = useState("114.1694");
  const [mapZoom, setMapZoom] = useState("12");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    getSettings()
      .then((s) => {
        setAppName(s.appName);
        setIsMaintenanceMode(s.maintenanceMode);
        setMapLat(s.mapLat);
        setMapLng(s.mapLng);
        setMapZoom(s.mapZoom);
      })
      .catch((err) => console.error("載入設定失敗:", err));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");
    try {
      await saveSettings({
        appName,
        maintenanceMode: isMaintenanceMode,
        mapLat,
        mapLng,
        mapZoom,
      });
      setSaveMessage("✅ 系統設定已成功更新並套用！");
    } catch (err) {
      console.error(err);
      setSaveMessage("❌ 儲存失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col max-w-4xl mx-auto">
      <div className="shrink-0">
        <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-wide flex items-center gap-2">
          <span>⚙️</span> 系統權限與設定
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          管理全域環境變數、地圖預設行為以及系統維護狀態。
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-10">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 md:p-6">
          <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            🏷️ 基本營運設定
          </h3>

          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400">系統顯示名稱</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full md:w-1/2 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-gray-400">呢個名稱會顯示喺用戶端嘅導航列同埋網頁標題 (Title)。</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <div className="font-bold text-sm text-gray-800 dark:text-gray-200">系統維護模式 (Maintenance Mode)</div>
                <div className="text-[11px] text-gray-500 mt-0.5">開啟後，所有非管理員用戶將無法登入並會見到「維護中」畫面。</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isMaintenanceMode} onChange={() => setIsMaintenanceMode(!isMaintenanceMode)} />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 md:p-6">
          <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            🗺️ 地圖預設參數 (Default Map View)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400">預設中心緯度 (Latitude)</label>
              <input type="number" step="any" value={mapLat} onChange={(e) => setMapLat(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400">預設中心經度 (Longitude)</label>
              <input type="number" step="any" value={mapLng} onChange={(e) => setMapLng(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400">預設縮放級別 (Zoom)</label>
              <input type="number" min="1" max="20" value={mapZoom} onChange={(e) => setMapZoom(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">💡 預設值為香港 (Lat: 22.3193, Lng: 114.1694, Zoom: 12)。</p>
        </div>

        <div className="sticky bottom-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 -mx-2 -mb-2 mt-auto flex items-center justify-between rounded-b-2xl z-10">
          <div className="text-sm font-bold text-green-600 dark:text-green-400 min-h-[20px] animate-fadeIn">{saveMessage}</div>
          <button
            type="submit"
            disabled={isSaving}
            className={`px-6 py-2.5 rounded-xl font-black text-white shadow-md transition-all flex items-center gap-2 ${isSaving ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {isSaving ? (
              <><span className="animate-spin">⏳</span> 儲存中...</>
            ) : (
              <><span className="text-lg leading-none">💾</span> 儲存設定</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
