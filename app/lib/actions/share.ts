"use server"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth-helpers"
import { notifyUsers } from "@/lib/realtime"
import type { ShareRole } from "@prisma/client"

export type CollaboratorDTO = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: "owner" | "editor" | "viewer"
}

function toRole(r: ShareRole): "editor" | "viewer" {
  return r === "EDITOR" ? "editor" : "viewer"
}

function normaliseRole(role: string): ShareRole {
  return role === "viewer" || role === "VIEWER" ? "VIEWER" : "EDITOR"
}

// ----------------------------------------------------------------------------
// Itinerary sharing
// ----------------------------------------------------------------------------

async function assertItineraryOwner(itineraryId: string, userId: string) {
  const it = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    select: { ownerId: true },
  })
  if (!it) throw new Error("Itinerary not found")
  if (it.ownerId !== userId) throw new Error("Only the owner can manage sharing")
  return it.ownerId
}

export async function listItineraryCollaborators(
  itineraryId: string
): Promise<CollaboratorDTO[]> {
  const user = await requireUser()
  const it = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    select: {
      ownerId: true,
      owner: { select: { id: true, name: true, email: true, image: true } },
      shares: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!it) throw new Error("Itinerary not found")

  const isCollaborator =
    it.ownerId === user.id || it.shares.some((s) => s.userId === user.id)
  if (!isCollaborator) throw new Error("No access to this itinerary")

  return [
    { ...it.owner, role: "owner" as const },
    ...it.shares.map((s) => ({ ...s.user, role: toRole(s.role) })),
  ]
}

export async function inviteToItinerary(
  itineraryId: string,
  email: string,
  role: string
): Promise<{ ok: true; collaborators: CollaboratorDTO[] } | { ok: false; error: string }> {
  const user = await requireUser()
  await assertItineraryOwner(itineraryId, user.id)

  const invitee = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  })
  if (!invitee) {
    return {
      ok: false,
      error: "該電郵尚未註冊本系統，請對方先用 Google 登入一次。",
    }
  }
  if (invitee.id === user.id) {
    return { ok: false, error: "你已經係擁有者，無需邀請自己。" }
  }

  await prisma.itineraryShare.upsert({
    where: { itineraryId_userId: { itineraryId, userId: invitee.id } },
    create: { itineraryId, userId: invitee.id, role: normaliseRole(role) },
    update: { role: normaliseRole(role) },
  })

  await notifyUsers([user.id, invitee.id], "itineraries")
  return { ok: true, collaborators: await listItineraryCollaborators(itineraryId) }
}

export async function updateItineraryShareRole(
  itineraryId: string,
  userId: string,
  role: string
): Promise<void> {
  const user = await requireUser()
  await assertItineraryOwner(itineraryId, user.id)
  await prisma.itineraryShare.update({
    where: { itineraryId_userId: { itineraryId, userId } },
    data: { role: normaliseRole(role) },
  })
  await notifyUsers([user.id, userId], "itineraries")
}

export async function removeItineraryCollaborator(
  itineraryId: string,
  userId: string
): Promise<void> {
  const user = await requireUser()
  // Owner can remove anyone; a collaborator can remove themselves.
  if (userId !== user.id) {
    await assertItineraryOwner(itineraryId, user.id)
  }
  await prisma.itineraryShare
    .delete({ where: { itineraryId_userId: { itineraryId, userId } } })
    .catch(() => undefined)
  await notifyUsers([user.id, userId], "itineraries")
}

// ----------------------------------------------------------------------------
// Place sharing (individual places / lists)
// ----------------------------------------------------------------------------

async function assertPlaceOwner(placeId: string, userId: string) {
  const p = await prisma.place.findUnique({
    where: { id: placeId },
    select: { ownerId: true },
  })
  if (!p) throw new Error("Place not found")
  if (p.ownerId !== userId) throw new Error("Only the owner can manage sharing")
}

export async function listPlaceCollaborators(
  placeId: string
): Promise<CollaboratorDTO[]> {
  const user = await requireUser()
  const p = await prisma.place.findUnique({
    where: { id: placeId },
    select: {
      ownerId: true,
      owner: { select: { id: true, name: true, email: true, image: true } },
      shares: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  })
  if (!p) throw new Error("Place not found")
  const isCollaborator =
    p.ownerId === user.id || p.shares.some((s) => s.userId === user.id)
  if (!isCollaborator) throw new Error("No access to this place")

  return [
    { ...p.owner, role: "owner" as const },
    ...p.shares.map((s) => ({ ...s.user, role: toRole(s.role) })),
  ]
}

export async function inviteToPlace(
  placeId: string,
  email: string,
  role: string
): Promise<{ ok: true; collaborators: CollaboratorDTO[] } | { ok: false; error: string }> {
  const user = await requireUser()
  await assertPlaceOwner(placeId, user.id)
  const invitee = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  })
  if (!invitee) {
    return { ok: false, error: "該電郵尚未註冊本系統。" }
  }
  if (invitee.id === user.id) {
    return { ok: false, error: "你已經係擁有者。" }
  }
  await prisma.placeShare.upsert({
    where: { placeId_userId: { placeId, userId: invitee.id } },
    create: { placeId, userId: invitee.id, role: normaliseRole(role) },
    update: { role: normaliseRole(role) },
  })
  await notifyUsers([user.id, invitee.id], "places")
  return { ok: true, collaborators: await listPlaceCollaborators(placeId) }
}

export async function removePlaceCollaborator(
  placeId: string,
  userId: string
): Promise<void> {
  const user = await requireUser()
  if (userId !== user.id) {
    await assertPlaceOwner(placeId, user.id)
  }
  await prisma.placeShare
    .delete({ where: { placeId_userId: { placeId, userId } } })
    .catch(() => undefined)
  await notifyUsers([user.id, userId], "places")
}
