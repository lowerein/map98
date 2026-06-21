// actions/place.ts
"use server"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth-helpers"
import { notifyUsers } from "@/lib/realtime"
import type { Place as DbPlace } from "@prisma/client"

export type PlaceDTO = {
  id: string
  name: string
  lat: number
  lng: number
  googleMapsUrl?: string
  address?: string
  phoneNumber?: string
  openingHours?: string[]
  country?: string
  province?: string
  color?: string // 🎨 1. 補領 DTO 身份證
  customFields?: Record<string, unknown>
  ownerId: string
  access: "owner" | "editor" | "viewer"
}

export type SavePlaceInput = {
  id?: string
  name: string
  lat: number
  lng: number
  googleMapsUrl?: string
  address?: string
  phoneNumber?: string
  openingHours?: string[]
  country?: string
  province?: string
  color?: string // 🎨 2. 補領 Input 接收簽證
  googlePlaceId?: string
  customFields?: Record<string, unknown>
}

function serialize(
  p: DbPlace,
  access: PlaceDTO["access"]
): PlaceDTO {
  return {
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    googleMapsUrl: p.googleMapsUrl ?? undefined,
    address: p.address ?? undefined,
    phoneNumber: p.phoneNumber ?? undefined,
    openingHours: p.openingHours ?? [],
    country: p.country ?? undefined,
    province: p.province ?? undefined,
    color: p.color ?? "#2563eb", // 🎨 3. 讀取時從 DB 撈返出嚟（無就畀預設藍）
    customFields: (p.customFields as Record<string, unknown>) ?? {},
    ownerId: p.ownerId,
    access,
  }
}

/** Owner + share users for a place, used to fan out realtime pings. */
async function affectedUsers(placeId: string): Promise<string[]> {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { ownerId: true, shares: { select: { userId: true } } },
  })
  if (!place) return []
  return [place.ownerId, ...place.shares.map((s) => s.userId)]
}

/**
 * Resolves a user's access level to a place: owner > editor > viewer > null.
 * 🚀 升級：如果明文無 Share，會自動檢查該景點是否掛在「用家有權讀寫的行程」入面！
 */
async function resolveAccess(
  placeId: string,
  userId: string
): Promise<{ place: DbPlace; access: PlaceDTO["access"] } | null> {
  const place = await prisma.place.findUnique({ where: { id: placeId } })
  if (!place) return null
  if (place.ownerId === userId) return { place, access: "owner" }
  
  const share = await prisma.placeShare.findUnique({
    where: { placeId_userId: { placeId, userId } },
  })
  if (share) return { place, access: share.role === "EDITOR" ? "editor" : "viewer" }

  // =====================================================================
  // 🌟 行程依附偷渡通道：如果呢個地方喺「我有權看」嘅行程入面，自動放行編輯權！
  // =====================================================================
  try {
    const accessibleItineraries = await prisma.itinerary.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { userId: userId } } }
        ]
      },
      select: { scheduleDays: true, calendarEvents: true }
    })

    for (const iti of accessibleItineraries) {
      // 檢查側邊欄行程清單 JSON
      const sDays = (iti.scheduleDays as any[]) || []
      for (const day of sDays) {
        const items = (day.items as any[]) || []
        if (items.some((item: any) => item?.placeId === placeId)) {
          return { place, access: "editor" }
        }
      }
      // 檢查大日曆排程 JSON
      const cEvents = (iti.calendarEvents as any[]) || []
      if (cEvents.some((ev: any) => ev?.extendedProps?.placeId === placeId)) {
        return { place, access: "editor" }
      }
    }
  } catch (err) {
    console.warn("resolveAccess 隱式行程授權審查略過:", err)
  }

  return null
}

/** * All places the current user owns or has been granted access to. 
 * 🚀 升級：會自覺搜刮全量共享行程，將入面所有依附嘅景點一齊打包派發！
 */
export async function getPlaces(): Promise<PlaceDTO[]> {
  const user = await requireUser()

  const owned = await prisma.place.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  })
  const shared = await prisma.placeShare.findMany({
    where: { userId: user.id },
    include: { place: true },
  })

  // =====================================================================
  // 🌟 行程依附搜刮通道：挖出所有我有權參與嘅行程，提取入面用過嘅所有 placeId
  // =====================================================================
  let piggybackPlaces: DbPlace[] = []

  try {
    const accessibleItineraries = await prisma.itinerary.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { shares: { some: { userId: user.id } } }
        ]
      },
      select: { scheduleDays: true, calendarEvents: true }
    })

    const neededPlaceIds = new Set<string>()

    for (const iti of accessibleItineraries) {
      const sDays = (iti.scheduleDays as any[]) || []
      for (const day of sDays) {
        const items = (day.items as any[]) || []
        for (const item of items) {
          if (item?.placeId) neededPlaceIds.add(item.placeId)
        }
      }
      const cEvents = (iti.calendarEvents as any[]) || []
      for (const ev of cEvents) {
        if (ev?.extendedProps?.placeId) neededPlaceIds.add(ev.extendedProps.placeId)
      }
    }

    // 排除咗用家名下本來就睇得到嘅景點 ID
    const alreadyHaveIds = new Set([
      ...owned.map(p => p.id),
      ...shared.map(s => s.place.id)
    ])

    const missingIds = Array.from(neededPlaceIds).filter(id => !alreadyHaveIds.has(id))

    if (missingIds.length > 0) {
      piggybackPlaces = await prisma.place.findMany({
        where: { id: { in: missingIds } }
      })
    }
  } catch (err) {
    console.warn("getPlaces 行程景點搜刮器略過:", err)
  }

  return [
    ...owned.map((p) => serialize(p, "owner")),
    ...shared.map((s) =>
      serialize(s.place, s.role === "EDITOR" ? "editor" : "viewer")
    ),
    // 🚀 將呢批偷渡發放落地簽證嘅景點，冠以 "editor" 身份發送畀前端！
    ...piggybackPlaces.map((p) => serialize(p, "editor")),
  ]
}

/** Create a new place (always owned by the current user) or update an existing one. */
export async function savePlace(input: SavePlaceInput): Promise<PlaceDTO> {
  const user = await requireUser()

  const data = {
    name: input.name,
    lat: input.lat,
    lng: input.lng,
    googleMapsUrl: input.googleMapsUrl ?? null,
    address: input.address ?? null,
    phoneNumber: input.phoneNumber ?? null,
    openingHours: input.openingHours ?? [],
    country: input.country ?? null,
    province: input.province ?? null,
    color: input.color ?? "#2563eb", // 🎨 4. 正式寫入 DB Payload！
    googlePlaceId: input.googlePlaceId ?? null,
    customFields: (input.customFields ?? {}) as object,
  }

  // Update path — only when the id refers to a real place the user can edit.
  if (input.id) {
    const resolved = await resolveAccess(input.id, user.id)
    if (resolved) {
      if (resolved.access === "viewer") {
        throw new Error("You only have view access to this place")
      }
      const updated = await prisma.place.update({
        where: { id: input.id },
        data,
      })
      await notifyUsers(await affectedUsers(updated.id), "places")
      return serialize(updated, resolved.access)
    }
    // Unknown id (e.g. a client-side temp id) falls through to create.
  }

  const created = await prisma.place.create({
    data: { ...data, ownerId: user.id },
  })
  await notifyUsers([user.id], "places")
  return serialize(created, "owner")
}

/** Delete a place (owner or editor). */
export async function deletePlace(id: string): Promise<void> {
  const user = await requireUser()
  const resolved = await resolveAccess(id, user.id)
  if (!resolved) throw new Error("Place not found")
  if (resolved.access === "viewer") {
    throw new Error("You only have view access to this place")
  }
  const recipients = await affectedUsers(id)
  await prisma.place.delete({ where: { id } })
  await notifyUsers(recipients, "places")
}