// app/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react"; // 🚀 換上你原本套 Google Auth Hook

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 如果一入嚟發現已經有 Google Auth Session，直接秒彈入地圖頁面
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/planner");
    }
  }, [status, router]);

  const handleGoogleLogin = () => {
    // 🚀 觸發你原本嘅 Google 登入，登入完跳去 /planner
    signIn("google", { callbackUrl: "/planner" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin text-4xl">✈️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 relative overflow-hidden px-4">
      {/* 靚靚背景光暈 */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="z-10 max-w-3xl w-full text-center space-y-8 animate-fadeIn">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mb-4 border border-blue-100 dark:border-blue-800">
          <span className="text-4xl">✈️</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight">
          探索世界，<span className="text-blue-600 dark:text-blue-400">一鍵排程</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
          結合地圖定位、多人實時協作與自訂動態欄位，讓你的旅程從未如此清晰。
        </p>

        <div className="pt-8 flex justify-center">
          <button
            onClick={handleGoogleLogin}
            className="px-8 py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-black rounded-2xl transition-all flex items-center gap-3 shadow-xl hover:-translate-y-1"
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>使用 Google 帳戶登入</span>
          </button>
        </div>
      </div>
    </div>
  );
}