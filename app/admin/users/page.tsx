// app/admin/users/page.tsx
"use client";
import { useState, useMemo, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  listUsers,
  updateUserStatus,
  updateUserRole,
  type AdminUserDTO,
} from "@/app/lib/actions/admin";

export default function UsersManagement() {
  const { data: session } = useSession();
  const currentUserEmail = session?.user?.email;

  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const load = () => {
    listUsers()
      .then(setUsers)
      .catch((err) => console.error("載入用戶失敗:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        (user.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const toggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: newStatus as AdminUserDTO["status"] } : u)));
    startTransition(async () => {
      try {
        await updateUserStatus(id, newStatus);
      } catch (err) {
        console.error(err);
        load();
      }
    });
  };

  const setBanned = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "banned" } : u)));
    startTransition(async () => {
      try {
        await updateUserStatus(id, "banned");
      } catch (err) {
        console.error(err);
        load();
      }
    });
  };

  const toggleRole = (id: string, currentRole: string, userName: string) => {
    const isCurrentlyAdmin = currentRole === "admin";
    const actionText = isCurrentlyAdmin ? "降級為「普通用戶」" : "升級為「管理員」";
    
    if (!confirm(`⚠️ 權限變更確認\n\n確定要將用戶「${userName}」${actionText}嗎？`)) {
      return; 
    }

    const newRole = isCurrentlyAdmin ? "user" : "admin";
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole as AdminUserDTO["role"] } : u)));
    
    startTransition(async () => {
      try {
        await updateUserRole(id, newRole);
      } catch (err) {
        console.error("更新權限失敗:", err);
        alert("更新權限失敗，請稍後再試！");
        load();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black rounded-md">🟢 活躍</span>;
      case "inactive":
        return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-black rounded-md">⚪ 停用</span>;
      case "banned":
        return <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-black rounded-md">⛔ 封鎖</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-wide flex items-center gap-2">
            <span>👥</span> 用戶管理
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            管理系統內所有註冊用戶嘅權限與狀態。
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="🔍 搜尋用戶名稱或電郵..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap">用戶資料</th>
                <th className="p-4 whitespace-nowrap">角色權限</th>
                <th className="p-4 whitespace-nowrap">帳號狀態</th>
                <th className="p-4 whitespace-nowrap hidden md:table-cell">註冊日期</th>
                <th className="p-4 whitespace-nowrap text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-400">載入中... ⏳</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-400">找不到符合條件的用戶 🤷‍♂️</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {(user.name ?? user.email ?? "?").charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{user.name ?? "(未命名)"}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-[10px] font-bold rounded border inline-block ${
                          user.role === "admin"
                            ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                            : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {user.role === "admin" ? "👑 管理員" : "👤 普通用戶"}
                      </span>
                    </td>
                    
                    <td className="p-4">{getStatusBadge(user.status)}</td>
                    
                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">
                      {user.createdAt}
                    </td>
                    
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {user.email !== currentUserEmail ? (
                          <>
                            <button
                              onClick={() => toggleRole(user.id, user.role, user.name ?? user.email ?? "該用戶")}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                user.role === "admin"
                                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
                                  : "bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 dark:text-purple-400"
                              }`}
                            >
                              {user.role === "admin" ? "降為用戶" : "升級 Admin"}
                            </button>

                            <button
                              onClick={() => toggleStatus(user.id, user.status)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                              {user.status === "active" ? "停用" : "恢復"}
                            </button>

                            {user.status !== "banned" && (
                              <button
                                onClick={() => setBanned(user.id)}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 transition-colors"
                              >
                                封鎖
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-not-allowed select-none">
                            👤 你的帳號
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-950/50">
          <span>共 {filteredUsers.length} 位用戶</span>
        </div>
      </div>
    </div>
  );
}