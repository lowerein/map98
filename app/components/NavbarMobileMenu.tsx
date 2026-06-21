// components/NavbarMobileMenu.tsx
"use client";

import { useState } from "react";

interface NavbarMobileMenuProps {
  darkModeSwitch: React.ReactNode;
  organizeButton: React.ReactNode;
  authSection: React.ReactNode;
}

export default function NavbarMobileMenu({
  darkModeSwitch,
  organizeButton,
  authSection,
}: NavbarMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center">
      {/* 🍔 漢堡包掣 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none p-2 text-2xl transition"
        aria-label="Toggle menu"
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {/* 📱 手機版下拉全寬清單 (當 isOpen === true 時彈出) */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4 shadow-xl animate-fadeIn z-50">
          
          {/* 功能按鈕欄 */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">工具與模式</span>
            <div className="flex items-center gap-3">
              {darkModeSwitch}
              {organizeButton}
            </div>
          </div>

          {/* 登入 / 登出 區塊 */}
          <div className="pt-1 w-full flex flex-col">
            {authSection}
          </div>
        </div>
      )}
    </div>
  );
}