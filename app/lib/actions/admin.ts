// action/admin.ts
"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache" // 🚀 1. 引入 Next.js 伺服器快取導播機
import type { PlaceStatus, UserStatus, Role } from "@prisma/client"

// ----------------------------------------------------------------------------
// Dashboard stats
// ----------------------------------------------------------------------------
export async function getStats() {
  await requireAdmin()
  // 🚀 2. 補上 pendingUsers 點算器，精準捕捉 status 為 INACTIVE 的等候人數！
  const [users, pendingUsers, itineraries, places, pendingPlaces] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "INACTIVE" } }), 
    prisma.itinerary.count(),
    prisma.place.count(),
    prisma.place.count({ where: { status: "PENDING" } }),
  ])
  return { users, pendingUsers, itineraries, places, pendingPlaces }
}

// ----------------------------------------------------------------------------
// User management
// ----------------------------------------------------------------------------
export type AdminUserDTO = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: "admin" | "user"
  status: "active" | "inactive" | "banned"
  createdAt: string
}

export async function listUsers(): Promise<AdminUserDTO[]> {
  await requireAdmin()
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } })
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role === "ADMIN" ? "admin" : "user",
    status: u.status.toLowerCase() as AdminUserDTO["status"],
    createdAt: u.createdAt.toISOString().slice(0, 10),
  }))
}

export async function updateUserStatus(userId: string, status: string) {
  const admin = await requireAdmin()
  if (userId === admin.id) throw new Error("你不能更改自己的帳號狀態")
  
  await prisma.user.update({
    where: { id: userId },
    data: { status: status.toUpperCase() as UserStatus },
  })

  revalidatePath("/admin") // 🚀 3. 觸發導播機：立刻抹除舊畫面，UI 實時由紅燈轉綠燈！
}

export async function updateUserRole(userId: string, role: string) {
  const admin = await requireAdmin()
  if (userId === admin.id) throw new Error("你不能更改自己的權限")
  
  await prisma.user.update({
    where: { id: userId },
    data: { role: role.toUpperCase() as Role },
  })

  revalidatePath("/admin") // 🚀 同上
}

// ----------------------------------------------------------------------------
// Place review
// ----------------------------------------------------------------------------
export type AdminPlaceDTO = {
  id: string
  name: string
  address: string | null
  country: string | null
  province: string | null
  status: "pending" | "approved" | "rejected"
  submitter: string
  date: string
}

export async function listAllPlaces(): Promise<AdminPlaceDTO[]> {
  await requireAdmin()
  const places = await prisma.place.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, email: true } } },
  })
  return places.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    country: p.country,
    province: p.province,
    status: p.status.toLowerCase() as AdminPlaceDTO["status"],
    submitter: p.owner?.name || p.owner?.email || "—",
    date: p.createdAt.toISOString().slice(0, 10),
  }))
}

export async function updatePlaceStatus(placeId: string, status: string) {
  await requireAdmin()
  await prisma.place.update({
    where: { id: placeId },
    data: { status: status.toUpperCase() as PlaceStatus },
  })
  revalidatePath("/admin") 
}

// ----------------------------------------------------------------------------
// System settings
// ----------------------------------------------------------------------------
export type SystemSettingsDTO = {
  appName: string
  maintenanceMode: boolean
  mapLat: string
  mapLng: string
  mapZoom: string
}

const SETTINGS_KEY = "app_settings"
const DEFAULT_SETTINGS: SystemSettingsDTO = {
  appName: "98Map",
  maintenanceMode: false,
  mapLat: "22.3193",
  mapLng: "114.1694",
  mapZoom: "12",
}

export async function getSettings(): Promise<SystemSettingsDTO> {
  await requireAdmin()
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTINGS_KEY } })
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<SystemSettingsDTO>) ?? {}) }
}

export async function saveSettings(
  settings: SystemSettingsDTO
): Promise<SystemSettingsDTO> {
  await requireAdmin()
  const merged = { ...DEFAULT_SETTINGS, ...settings }
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: merged },
    update: { value: merged },
  })
  return merged
}