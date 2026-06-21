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

function serialize(i: DbItinerary, access: ItineraryDTO["access"]): ItineraryDTO {
  return {
    id: i.id,
    name: i.name,
    startDate: i.startDate ?? "",
    endDate: i.endDate ?? "",
    scheduleDays: (i.scheduleDays as unknown[]) ?? [],
    calendarEvents: (i.calendarEvents as unknown[]) ?? [],
    ownerId: i.ownerId,
    access,
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
  const shared = await prisma.itineraryShare.findMany({
    where: { userId: user.id },
    include: { itinerary: true },
    orderBy: { createdAt: "asc" },
  })
  return [
    ...owned.map((i) => serialize(i, "owner")),
    ...shared.map((s) =>
      serialize(s.itinerary, s.role === "EDITOR" ? "editor" : "viewer")
    ),
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
  if (resolved.access === "viewer") {
    throw new Error("You only have view access to this itinerary")
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

/**
 * Owner deletes the itinerary entirely. A collaborator "deleting" simply
 * removes their own share (they leave the collaboration).
 */
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
