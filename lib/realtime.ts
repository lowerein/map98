import "server-only"

/**
 * Live collaboration signalling.
 *
 * We keep ALL data access in Prisma. For real-time sync we only emit a tiny
 * "something changed, please refetch" signal over Supabase Realtime's HTTP
 * Broadcast API after a successful Prisma write. Clients subscribe to their own
 * `user:<id>` topic and re-fetch through authorized Server Actions when pinged.
 *
 * Topics are public (keyed by an unguessable cuid), so no Supabase Auth / RLS is
 * required and this works cleanly alongside NextAuth. No actual data is ever
 * exposed to the browser's anon key — only the change ping.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
// Prefer the service role key on the server if present; fall back to anon.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export type SyncScope = "places" | "itineraries" | "all"

/** Broadcast a `sync` event to one or more `user:<id>` topics. Best-effort. */
export async function notifyUsers(userIds: string[], scope: SyncScope = "all") {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) return
  if (!SUPABASE_URL || !SUPABASE_KEY) return

  const messages = unique.map((id) => ({
    topic: `user:${id}`,
    event: "sync",
    payload: { scope, at: Date.now() },
    private: false,
  }))

  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ messages }),
      // Don't let realtime latency block the mutation response.
      cache: "no-store",
    })
  } catch (err) {
    // Realtime is a non-critical enhancement; swallow transport errors.
    console.error("[realtime] broadcast failed:", err)
  }
}
