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
  if (!share) return null
  return { place, access: share.role === "EDITOR" ? "editor" : "viewer" }
}

/** All places the current user owns or has been granted access to. */
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

  return [
    ...owned.map((p) => serialize(p, "owner")),
    ...shared.map((s) =>
      serialize(s.place, s.role === "EDITOR" ? "editor" : "viewer")
    ),
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
