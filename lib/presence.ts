"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { loadSupabase } from "./supabase";

/**
 * "Active now" across the whole site: every signed-in member with Vice City
 * Feed open joins one Supabase Realtime presence channel. A tab hidden for a
 * minute stops counting, and counts again when it is looked at.
 */
const online = new Set<string>();
const listeners = new Set<() => void>();
let snapshot = new Set<string>();

function publish(ids: Iterable<string>) {
  online.clear();
  for (const id of ids) online.add(id);
  snapshot = new Set(online);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether a member currently has the site open. */
export function useIsOnline(userId: string | null | undefined): boolean {
  const ids = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
  return Boolean(userId && ids.has(userId));
}
const EMPTY = new Set<string>();

const HIDDEN_GRACE_MS = 60_000;

/** Joins the presence channel while `userId` is signed in (mounted once, in the root layout). */
export function usePresence(userId: string | null) {
  useEffect(() => {
    if (!userId) {
      publish([]);
      return;
    }
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let hiddenTimer: number | null = null;
    let tracking = false;

    const track = () => {
      if (!channel || tracking || channel.state !== "joined") return;
      tracking = true;
      void channel.track({ at: new Date().toISOString() });
    };
    const untrack = () => {
      if (!channel || !tracking) return;
      tracking = false;
      void channel.untrack();
    };
    const onVisibility = () => {
      if (hiddenTimer) window.clearTimeout(hiddenTimer);
      hiddenTimer = null;
      if (document.visibilityState === "visible") track();
      else hiddenTimer = window.setTimeout(untrack, HIDDEN_GRACE_MS);
    };

    void loadSupabase().then((supabase) => {
      if (!supabase || cancelled) return;
      channel = supabase
        .channel("online", { config: { presence: { key: userId } } })
        .on("presence", { event: "sync" }, () => {
          if (channel) publish(Object.keys(channel.presenceState()));
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && document.visibilityState === "visible") track();
        });
      document.addEventListener("visibilitychange", onVisibility);
    });

    return () => {
      cancelled = true;
      if (hiddenTimer) window.clearTimeout(hiddenTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) void channel.unsubscribe();
      publish([]);
    };
  }, [userId]);
}
