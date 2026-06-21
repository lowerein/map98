// components/Navbar.tsx
import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import DarkModeSwitch from "./DarkModeSwitch";
import NavbarOrganizeButton from "./NavbarOrganizeButton";
import NavbarMobileMenu from "./NavbarMobileMenu"; // 🚀 引入剛剛做好嘅手機版選單

export default async function Navbar() {
  // 喺 Server Side 獲取目前登入狀態
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const adminLink = isAdmin ? (
    <Link
      href="/admin"
      className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
    >
      👑 管理後台
    </Link>
  ) : null;

  // 1. 提取電腦版嘅登入/登出區塊 (橫向 flex)
  const desktopAuthSection = session?.user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {session.user.name}
      </span>
      <form action={async () => { "use server"; await signOut(); }}>
        <button type="submit" className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition">
          登出
        </button>
      </form>
    </div>
  ) : (
    <form action={async () => { "use server"; await signIn("google"); }}>
      <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition">
        Google 登入
      </button>
    </form>
  );

  // 2. 提取手機版嘅登入/登出區塊 (直向排列，按鈕撐滿 w-full 方便撳)
  const mobileAuthSection = session?.user ? (
    <div className="flex flex-col gap-3 w-full">
      <div className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1">
        👤 登入身份：<span className="font-bold text-gray-800 dark:text-white">{session.user.name}</span>
      </div>
      <form action={async () => { "use server"; await signOut(); }} className="w-full">
        <button type="submit" className="w-full text-center px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-lg hover:bg-red-100 transition">
          登出系統
        </button>
      </form>
    </div>
  ) : (
    <form action={async () => { "use server"; await signIn("google"); }} className="w-full">
      <button type="submit" className="w-full text-center px-4 py-2.5 text-sm font-bold text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 transition shadow-md">
        🔑 經 Google 帳戶登入
      </button>
    </form>
  );

  return (
    // 🚀 加咗 relative 確保下拉選單相對此 Bar 定位
    <nav className="relative flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-colors duration-300 h-14 z-50">
      
      {/* 左側 Logo */}
      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight select-none">
        98Map 📍
      </div>

      {/* 🖥️ 情況 A：電腦版工具列 (md 或以上先顯示，手機隱藏) */}
      <div className="hidden md:flex items-center gap-4">
        <DarkModeSwitch />
        <NavbarOrganizeButton />
        {adminLink}
        {desktopAuthSection}
      </div>

      {/* 📱 情況 B：手機版漢堡選單 (手機顯示，md 或以上隱藏) */}
      {/* 把按鈕組件當作 Slots 傳入，完美保留 Server Actions 功能 */}
      <NavbarMobileMenu
        darkModeSwitch={<DarkModeSwitch />}
        organizeButton={<NavbarOrganizeButton />}
        authSection={mobileAuthSection}
      />

    </nav>
  );
}