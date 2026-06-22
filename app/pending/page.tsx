// app/pending/page.tsx
"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PendingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // 檢查：如果 Admin 經已批咗，自動踢佢返去 Planner！
  useEffect(() => {
    if (session?.user?.status === "ACTIVE") {
      router.push("/planner");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 select-none">
      <div className="bg-gray-800 border border-gray-700 max-w-md w-full p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-scaleUp">
        
        <div className="relative w-24 h-24 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
          <span className="text-4xl animate-pulse">⏳</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">帳號正在等候審批</h1>
          <p className="text-xs text-gray-400">
            你好 <span className="text-amber-400 font-bold">{session?.user?.name || "旅行者"}</span>！你的註冊要求已發送給管理員 Tony。批核完成後，即可解鎖智能行程表。
          </p>
        </div>

        <div className="p-4 bg-gray-900/60 rounded-2xl border border-gray-800 text-left text-xs space-y-1 text-gray-300">
          <div className="flex justify-between"><span className="text-gray-500">申請電郵：</span><span className="font-mono">{session?.user?.email}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">當前狀態：</span><span className="text-amber-400 font-bold">審核中 (Pending)</span></div>
        </div>

        {/* 🚀 神級 UX：一鍵無痛重整 Session 狀態掣！ */}
        <button
          onClick={() => update()} // 觸發 Auth.js 去 DB 重新查一次 Status
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition shadow-lg active:scale-95 cursor-pointer"
        >
          🔄 我已聯絡 Admin，重新檢查狀態
        </button>
      </div>
    </div>
  );
}