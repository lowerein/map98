// components/DarkModeSwitch.tsx
"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function DarkModeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // 🚀 必須等 Client 掛載後先 render 粒掣，防止 SSR 報錯 (Hydration Mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9"></div>; // 佔位符，防止排版跳動
  }

  // 判斷目前究竟係深色定淺色 (resolvedTheme 可以處理 system 預設)
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-lg p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm flex items-center justify-center w-9 h-9"
      title={isDark ? "切換至淺色模式" : "切換至深色模式"}
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}