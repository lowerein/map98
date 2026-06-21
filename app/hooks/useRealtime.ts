"use client";
import { useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";

type SyncScope = "places" | "itineraries" | "all";

/**
 * Subscribes to the current user's realtime topic (`user:<id>`) and invokes
 * `onSync` whenever a Server Action broadcasts a change. The actual data is
 * always re-fetched through authorized Server Actions — the broadcast only
 * carries a lightweight "refetch" ping (see lib/realtime.ts).
 */
export function useRealtime(
  userId: string | null | undefined,
  onSync: (scope: SyncScope) => void
) {
  // Keep the latest callback without resubscribing on every render.
  const cb = useRef(onSync);
  cb.current = onSync;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user:${userId}`)
      .on("broadcast", { event: "sync" }, (msg) => {
        const scope = (msg?.payload?.scope as SyncScope) ?? "all";
        cb.current(scope);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
