// lib/actions/itineraries.ts
"use server"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth-helpers"
import { notifyUsers } from "@/lib/realtime"
import type { Itinerary as DbItinerary } from "@prisma/client"

export type ItineraryDTO = {
  id: string
  name: string
  startDate: string
  endDate: string
  scheduleDays: unknown[]
  calendarEvents: unknown[]
  ownerId: string
  access: "owner" | "editor" | "viewer"

  // 🔥 1. 補領護照章：讓前端 UI 認得出「別人的行程」與「擁有者是誰」
  isShared?: boolean
  ownerName?: string
}

export type CreateItineraryInput = {
  name: string
  startDate?: string
  endDate?: string
  scheduleDays?: unknown[]
  calendarEvents?: unknown[]
}

export type UpdateItineraryInput = {
  name?: string
  startDate?: string
  endDate?: string
  scheduleDays?: unknown[]
  calendarEvents?: unknown[]
}

function serialize(
  i: DbItinerary, 
  access: ItineraryDTO["access"],
  meta?: { isShared?: boolean; ownerName?: string } // 🚀 2. 擴容接收 Meta 資訊
): ItineraryDTO {
  return {
    id: i.id,
    name: i.name,
    startDate: i.startDate ?? "",
    endDate: i.endDate ?? "",
    scheduleDays: (i.scheduleDays as unknown[]) ?? [],
    calendarEvents: (i.calendarEvents as unknown[]) ?? [],
    ownerId: i.ownerId,
    access,
    isShared: meta?.isShared ?? false,
    ownerName: meta?.ownerName,
  }
}

async function affectedUsers(itineraryId: string): Promise<string[]> {
  const it = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    select: { ownerId: true, shares: { select: { userId: true } } },
  })
  if (!it) return []
  return [it.ownerId, ...it.shares.map((s) => s.userId)]
}

async function resolveAccess(
  itineraryId: string,
  userId: string
): Promise<{ itinerary: DbItinerary; access: ItineraryDTO["access"] } | null> {
  const itinerary = await prisma.itinerary.findUnique({ where: { id: itineraryId } })
  if (!itinerary) return null
  if (itinerary.ownerId === userId) return { itinerary, access: "owner" }
  const share = await prisma.itineraryShare.findUnique({
    where: { itineraryId_userId: { itineraryId, userId } },
  })
  if (!share) return null
  return { itinerary, access: share.role === "EDITOR" ? "editor" : "viewer" }
}

export async function getItineraries(): Promise<ItineraryDTO[]> {
  const user = await requireUser()
  
  const owned = await prisma.itinerary.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  })

  // 🚀 3. 關聯大解封：透過 ItineraryShare 順手撈出 itinerary.owner 的名字與 Email！
  const sharedRaw = await prisma.itineraryShare.findMany({
    where: { userId: user.id },
    include: { 
      itinerary: {
        include: {
          owner: { select: { name: true, email: true } }
        }
      } 
    },
    orderBy: { createdAt: "asc" },
  })

  // 完美封裝打標籤
  const sharedDTOs = sharedRaw.map((s) => {
    const iti = s.itinerary
    const displayOwner = iti.owner?.name || iti.owner?.email?.split('@')[0] || "夥伴"
    return serialize(iti, s.role === "EDITOR" ? "editor" : "viewer", {
      isShared: true,
      ownerName: displayOwner
    })
  })

  return [
    ...owned.map((i) => serialize(i, "owner")),
    ...sharedDTOs,
  ]
}

export async function createItinerary(
  input: CreateItineraryInput
): Promise<ItineraryDTO> {
  const user = await requireUser()
  const created = await prisma.itinerary.create({
    data: {
      name: input.name || "未命名行程",
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      scheduleDays: (input.scheduleDays ?? []) as object,
      calendarEvents: (input.calendarEvents ?? []) as object,
      ownerId: user.id,
    },
  })
  await notifyUsers([user.id], "itineraries")
  return serialize(created, "owner")
}

export async function updateItinerary(
  id: string,
  input: UpdateItineraryInput
): Promise<ItineraryDTO> {
  const user = await requireUser()
  const resolved = await resolveAccess(id, user.id)
  if (!resolved) throw new Error("Itinerary not found")
  
  // 🔥 純金打造的後端防線：只要是 viewer，天王老子來了也別想改動資料庫一根汗毛！
  if (resolved.access === "viewer") {
    throw new Error("You only have view access to this itinerary. Update rejected.")
  }

  const updated = await prisma.itinerary.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate || null } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate || null } : {}),
      ...(input.scheduleDays !== undefined
        ? { scheduleDays: input.scheduleDays as object }
        : {}),
      ...(input.calendarEvents !== undefined
        ? { calendarEvents: input.calendarEvents as object }
        : {}),
    },
  })
  await notifyUsers(await affectedUsers(id), "itineraries")
  return serialize(updated, resolved.access)
}

export async function deleteItinerary(id: string): Promise<void> {
  const user = await requireUser()
  const resolved = await resolveAccess(id, user.id)
  if (!resolved) return
  const recipients = await affectedUsers(id)

  if (resolved.access === "owner") {
    await prisma.itinerary.delete({ where: { id } })
  } else {
    await prisma.itineraryShare.delete({
      where: { itineraryId_userId: { itineraryId: id, userId: user.id } },
    })
  }
  await notifyUsers(recipients, "itineraries")
}