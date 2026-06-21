import "server-only"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

/**
 * Returns the authenticated session user, or throws. Use at the top of every
 * Server Action / Route Handler that mutates or reads private data.
 */
export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized")
  }
  if (session.user.status === "BANNED") {
    throw new ForbiddenError("Account is banned")
  }
  return session.user
}

/** Returns the authenticated user only if they are an ADMIN, otherwise throws. */
export async function requireAdmin() {
  const user = await requireUser()
  // Re-check role against the DB so a stale session can't elevate privileges.
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (fresh?.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required")
  }
  return user
}

/** Convenience: returns the session user id or null without throwing. */
export async function getUserId() {
  const session = await auth()
  return session?.user?.id ?? null
}
