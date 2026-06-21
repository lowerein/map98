// app/admin/page.tsx
import { getStats } from "@/app/lib/actions/admin";

export default async function AdminDashboard() {
  const { users, itineraries, places, pendingPlaces } = await getStats();

  const stats = [
    { title: "總用戶量", value: `${users.toLocaleString()} 人`, icon: "👥" },
    { title: "活躍行程", value: `${itineraries.toLocaleString()} 個`, icon: "🗓️" },
    { title: "已儲存景點", value: `${places.toLocaleString()} 處`, icon: "📍" },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-wide">
          📊 數據概覽
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          以下係系統實時數據（直接由 Prisma 統計）。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex items-center justify-between transition-colors"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                {stat.title}
              </span>
              <span className="text-2xl font-black text-gray-800 dark:text-white block">
                {stat.value}
              </span>
            </div>
            <div className="text-3xl bg-gray-50 dark:bg-gray-800 p-3 rounded-xl shadow-inner">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
        <h4 className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
          <span>⏳</span> 待審查景點：{pendingPlaces.toLocaleString()} 個
        </h4>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
          前往「景點審查」頁面處理待審批的用戶提交景點。
        </p>
      </div>
    </div>
  );
}
