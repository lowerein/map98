// components/NavbarOrganizeButton.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function NavbarOrganizeButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOrganize = searchParams.get("mode") === "organize";

  const toggleMode = () => {
    if (isOrganize) {
      router.push("/");
    } else {
      router.push("?mode=organize");
    }
  };

  return (
    <button
      onClick={toggleMode}
      // 🚀 完全對齊 Google 登入掣嘅 Size 同字體: px-4 py-2 text-sm font-medium
      className={`px-4 py-2 text-sm font-medium text-white rounded-md transition flex items-center gap-1.5 ${
        isOrganize
          ? "bg-amber-600 hover:bg-amber-700 animate-pulse"
          : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      }`}
    >
      {isOrganize ? "🗺️ 返回地圖" : "🗓️ 專業排程"}
    </button>
  );
}