// app/admin/places/page.tsx
"use client";
import { useState, useMemo, useEffect, useTransition } from "react";
import {
  listAllPlaces,
  updatePlaceStatus,
  type AdminPlaceDTO,
} from "@/app/lib/actions/admin";

export default function PlacesManagement() {
  const [places, setPlaces] = useState<AdminPlaceDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const load = () => {
    listAllPlaces()
      .then(setPlaces)
      .catch((err) => console.error("載入景點失敗:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchSearch =
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.submitter.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || place.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [places, searchQuery, statusFilter]);

  const updateStatus = (id: string, newStatus: string) => {
    setPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus as AdminPlaceDTO["status"] } : p))
    );
    startTransition(async () => {
      try {
        await updatePlaceStatus(id, newStatus);
      } catch (err) {
        console.error(err);
        load();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black rounded-md">✅ 已核准</span>;
      case "pending":
        return <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-md">⏳ 待審批</span>;
      case "rejected":
        return <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-black rounded-md">❌ 已拒絕</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-wide flex items-center gap-2">
            <span>🗺️</span> 景點數據審查
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            審核用戶提交嘅自訂景點，確保公共數據庫質素。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
          >
            <option value="all">全部分類</option>
            <option value="pending">⏳ 待審批</option>
            <option value="approved">✅ 已核准</option>
            <option value="rejected">❌ 已拒絕</option>
          </select>

          <input
            type="text"
            placeholder="🔍 搜尋景點或提交者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap">景點名稱與位置</th>
                <th className="p-4 whitespace-nowrap">提交者</th>
                <th className="p-4 whitespace-nowrap">狀態</th>
                <th className="p-4 whitespace-nowrap text-right">審批操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm text-gray-400">載入中... ⏳</td>
                </tr>
              ) : filteredPlaces.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm text-gray-400">清空！無符合條件的景點 🌿</td>
                </tr>
              ) : (
                filteredPlaces.map((place) => (
                  <tr key={place.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                        {place.name}
                        {!place.address && (
                          <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[9px] px-1.5 py-0.5 rounded font-black border border-red-200 dark:border-red-800/50">
                            缺地址
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <span>📍</span>
                        {place.country || place.province || place.address ? (
                          `${place.country ?? ""} ${place.province ?? ""} ${place.address ?? ""}`
                        ) : (
                          <span className="italic text-amber-600 dark:text-amber-500">缺少位置數據</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200 text-xs">{place.submitter}</div>
                      <div className="text-[10px] text-gray-400">{place.date}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(place.status)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {place.status !== "approved" && (
                          <button
                            onClick={() => updateStatus(place.id, "approved")}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/50 text-green-600 dark:text-green-400 transition-colors"
                          >
                            通過
                          </button>
                        )}
                        {place.status !== "rejected" && (
                          <button
                            onClick={() => updateStatus(place.id, "rejected")}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 transition-colors"
                          >
                            拒絕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
