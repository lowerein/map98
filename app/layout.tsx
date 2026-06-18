import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/Navbar"; // 跟你最新嘅路徑

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "98Map - 走吧！你的專屬地圖",
  description: "Create, configure, and share your map schedules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 1. 將 body 鎖死做 100vh (h-screen)，並設定為 flex-col */}
      <body className={`${inter.className} h-screen flex flex-col overflow-hidden`}>
        <Navbar />
        {/* 2. 用 flex-1 等佢自動填滿 Navbar 淨低嘅所有高度 */}
        <main className="flex-1 relative bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}