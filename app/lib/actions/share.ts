// actions/Share.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { notifyUsers } from "@/lib/realtime";
import type { ShareRole } from "@prisma/client";

export type CollaboratorDTO = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "owner" | "editor" | "viewer";
};

function toRole(r: ShareRole): "editor" | "viewer" {
  return r === "EDITOR" ? "editor" : "viewer";
}

function normaliseRole(role: string): ShareRole {
  return role === "viewer" || role === "VIEWER" ? "VIEWER" : "EDITOR";
}

// ----------------------------------------------------------------------------
// 1. Itinerary sharing (維持原判，完美代碼)
// ----------------------------------------------------------------------------

async function assertItineraryOwner(itineraryId: string, userId: string) {
  const it = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    select: { ownerId: true },
  });
  if (!it) throw new Error("Itinerary not found");
  if (it.ownerId !== userId)
    throw new Error("Only the owner can manage sharing");
  return it.ownerId;
}

export async function listItineraryCollaborators(
  itineraryId: string,
): Promise<CollaboratorDTO[]> {
  const user = await requireUser();
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
  });
  if (!it) throw new Error("Itinerary not found");

  const isCollaborator =
    it.ownerId === user.id || it.shares.some((s) => s.userId === user.id);
  if (!isCollaborator) throw new Error("No access to this itinerary");

  return [
    { ...it.owner, role: "owner" as const },
    ...it.shares.map((s) => ({ ...s.user, role: toRole(s.role) })),
  ];
}

export async function inviteToItinerary(
  itineraryId: string,
  email: string,
  role: string,
): Promise<
  { ok: true; collaborators: CollaboratorDTO[] } | { ok: false; error: string }
> {
  const user = await requireUser();
  await assertItineraryOwner(itineraryId, user.id);

  const invitee = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (!invitee) {
    return {
      ok: false,
      error: "該電郵尚未註冊本系統，請對方先用 Google 登入一次。",
    };
  }
  if (invitee.id === user.id) {
    return { ok: false, error: "你已經係擁有者，無需邀請自己。" };
  }

  await prisma.itineraryShare.upsert({
    where: { itineraryId_userId: { itineraryId, userId: invitee.id } },
    create: { itineraryId, userId: invitee.id, role: normaliseRole(role) },
    update: { role: normaliseRole(role) },
  });

  await notifyUsers([user.id, invitee.id], "itineraries");
  return {
    ok: true,
    collaborators: await listItineraryCollaborators(itineraryId),
  };
}

export async function updateItineraryShareRole(
  itineraryId: string,
  userId: string,
  role: string,
): Promise<void> {
  const user = await requireUser();
  await assertItineraryOwner(itineraryId, user.id);
  await prisma.itineraryShare.update({
    where: { itineraryId_userId: { itineraryId, userId } },
    data: { role: normaliseRole(role) },
  });
  await notifyUsers([user.id, userId], "itineraries");
}

export async function removeItineraryCollaborator(
  itineraryId: string,
  userId: string,
): Promise<void> {
  const user = await requireUser();
  if (userId !== user.id) {
    await assertItineraryOwner(itineraryId, user.id);
  }
  await prisma.itineraryShare
    .delete({ where: { itineraryId_userId: { itineraryId, userId } } })
    .catch(() => undefined);
  await notifyUsers([user.id, userId], "itineraries");
}

// ----------------------------------------------------------------------------
// 2. Place Library sharing (全庫生態重構版)
// ----------------------------------------------------------------------------

/**
 * 🚀 撈出全庫觀察者名單：透過 PlaceShare 逆向追蹤，有誰正在訂閱我的景點庫？
 */
export async function listLibraryCollaborators(): Promise<CollaboratorDTO[]> {
  const user = await requireUser();

  const sharedUsers = await prisma.user.findMany({
    where: {
      placeShares: {
        some: {
          place: { ownerId: user.id },
        },
      },
    },
    select: { id: true, name: true, email: true, image: true },
  });

  return [
    {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      role: "owner" as const,
    },
    ...sharedUsers.map((u) => ({ ...u, role: "viewer" as const })), // 嚴格標記為 viewer
  ];
}

/**
 * 🚀 全庫發放簽證：找出我名下所有景點，一次過打包派發 VIEWER 通行證給對方！
 */
export async function inviteToLibrary(
  email: string,
): Promise<
  { ok: true; collaborators: CollaboratorDTO[] } | { ok: false; error: string }
> {
  const user = await requireUser();
  const cleanEmail = email.trim().toLowerCase();

  const invitee = await prisma.user.findUnique({
    where: { email: cleanEmail },
    select: { id: true },
  });

  if (!invitee) {
    return {
      ok: false,
      error: "該電郵尚未註冊本系統，請對方先用 Google 登入一次。",
    };
  }
  if (invitee.id === user.id) {
    return { ok: false, error: "你已經係擁有者，無需邀請自己。" };
  }

  // 撈出我名下所有景點的 ID
  const myPlaceIds = await prisma.place.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (myPlaceIds.length === 0) {
    return { ok: false, error: "你的景點庫目前係空的，請先新增景點再分享！" };
  }

  // 實施全庫 VIEWER 覆蓋（利用 skipDuplicates 避免重複發送報錯）
  await prisma.placeShare.createMany({
    data: myPlaceIds.map((p) => ({
      placeId: p.id,
      userId: invitee.id,
      role: "VIEWER",
    })),
    skipDuplicates: true,
  });

  return { ok: true, collaborators: await listLibraryCollaborators() };
}

/**
 * 🚀 一鍵吊銷全庫執照：將發給該 userId 且屬於我的 PlaceShare 物理蒸發
 */
export async function removeLibraryCollaborator(userId: string): Promise<void> {
  const user = await requireUser();

  if (userId === user.id) {
    throw new Error("你不能沒收擁有者自己的庫權限");
  }

  await prisma.placeShare.deleteMany({
    where: {
      userId: userId,
      place: { ownerId: user.id },
    },
  });
}
