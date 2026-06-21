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
  color?: string 
  customFields?: Record<string, unknown>
  ownerId: string
  access: "owner" | "editor" | "viewer"

  // 🔥 升級：對接前端 PlaceLibrary.tsx 頂部雙 Tab 專用的識別護照！
  isShared?: boolean
  ownerName?: string
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
  color?: string 
  googlePlaceId?: string
  customFields?: Record<string, unknown>
}

function serialize(
  p: DbPlace,
  access: PlaceDTO["access"],
  meta?: { isShared?: boolean; ownerName?: string } // 🚀 擴容：接收擁有者標籤
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
    color: p.color ?? "#2563eb", 
    customFields: (p.customFields as Record<string, unknown>) ?? {},
    ownerId: p.ownerId,
    access,
    isShared: meta?.isShared ?? false,
    ownerName: meta?.ownerName,
  }
}

async function affectedUsers(placeId: string): Promise<string[]> {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { ownerId: true, shares: { select: { userId: true } } },
  })
  if (!place) return []
  return [place.ownerId, ...place.shares.map((s) => s.userId)]
}

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
  // 嚴格執行 PM 批示：只要不是 owner，一律只給 viewer 權限，禁止越權改資料！
  if (share) return { place, access: "viewer" }

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
      const sDays = (iti.scheduleDays as any[]) || []
      for (const day of sDays) {
        const items = (day.items as any[]) || []
        if (items.some((item: any) => item?.placeId === placeId)) {
          return { place, access: "viewer" } // 行程偷渡客同樣只准看，不准動原生地標
        }
      }
      const cEvents = (iti.calendarEvents as any[]) || []
      if (cEvents.some((ev: any) => ev?.extendedProps?.placeId === placeId)) {
        return { place, access: "viewer" }
      }
    }
  } catch (err) {
    console.warn("resolveAccess 隱式行程授權審查略過:", err)
  }

  return null
}

/** * 🚀 終極全域搜刮引擎：[ Owned ] + [ PlaceShare ] + [ 共享行程依附點 ] 大合流
 */
export async function getPlaces(): Promise<PlaceDTO[]> {
  const user = await requireUser()

  // 1. 我自己的點
  const owned = await prisma.place.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  })

  // 2. 契哥明確透過 PlaceShare 給我的點（順手連契哥個全名撈埋出嚟！）
  const sharedRaw = await prisma.placeShare.findMany({
    where: { userId: user.id },
    include: { 
      place: {
        include: {
          owner: { select: { name: true, email: true } }
        }
      } 
    },
  })

  // 3. 挖出所有我參與的行程中，被人排進去但未 explicitly share 給我的點
  let piggybackRaw: any[] = []

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

    const alreadyHaveIds = new Set([
      ...owned.map(p => p.id),
      ...sharedRaw.map(s => s.place.id)
    ])

    const missingIds = Array.from(neededPlaceIds).filter(id => !alreadyHaveIds.has(id))

    if (missingIds.length > 0) {
      // 順手 include 擁有者，等這批偷渡點都可以堂堂正正列入「與我共用」Tab！
      piggybackRaw = await prisma.place.findMany({
        where: { id: { in: missingIds } },
        include: { owner: { select: { name: true, email: true } } }
      })
    }
  } catch (err) {
    console.warn("getPlaces 行程景點搜刮器略過:", err)
  }

  // 4. 完美打標籤大包裝
  const sharedDTOs = sharedRaw.map((s) => {
    const p = s.place
    const displayOwner = p.owner?.name || p.owner?.email?.split('@')[0] || "好友"
    return serialize(p, "viewer", { isShared: true, ownerName: displayOwner })
  })

  const piggybackDTOs = piggybackRaw.map((p) => {
    const displayOwner = p.owner?.name || p.owner?.email?.split('@')[0] || "行程夥伴"
    return serialize(p, "viewer", { isShared: true, ownerName: displayOwner })
  })

  return [
    ...owned.map((p) => serialize(p, "owner")),
    ...sharedDTOs,
    ...piggybackDTOs,
  ]
}

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
    color: input.color ?? "#2563eb", 
    googlePlaceId: input.googlePlaceId ?? null,
    customFields: (input.customFields ?? {}) as object,
  }

  if (input.id) {
    const resolved = await resolveAccess(input.id, user.id)
    if (resolved) {
      // 雙重保險：如果前端駭客強行解除 [🔒唯讀] 按鈕發送 Request，在這裡當場被天雷劈死！
      if (resolved.access === "viewer") {
        throw new Error("You only have view access to this place. Modification forbidden.")
      }
      const updated = await prisma.place.update({
        where: { id: input.id },
        data,
      })
      await notifyUsers(await affectedUsers(updated.id), "places")
      return serialize(updated, resolved.access)
    }
  }

  const created = await prisma.place.create({
    data: { ...data, ownerId: user.id },
  })
  await notifyUsers([user.id], "places")
  return serialize(created, "owner")
}

export async function deletePlace(id: string): Promise<void> {
  const user = await requireUser()
  const resolved = await resolveAccess(id, user.id)
  if (!resolved) throw new Error("Place not found")
  if (resolved.access === "viewer") {
    throw new Error("You do not have permission to delete a shared place.")
  }
  const recipients = await affectedUsers(id)
  await prisma.place.delete({ where: { id } })
  await notifyUsers(recipients, "places")
}