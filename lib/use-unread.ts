"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "./supabase";

type CountFn = "unread_conversation_count" | "unread_notification_count";

/**
 * Unread badges share one poller per count (not one per badge), refresh on
 * navigation, focus and every 60 seconds, and stop for good if the database
 * function does not exist yet (run supabase/schema.sql), instead of
 * flooding the console with 404s.
 */
type Poller = {
  value: number;
  listeners: Set<() => void>;
  disabled: boolean;
  inFlight: boolean;
  lastLoad: number;
  timer: number | null;
};

const pollers: Record<CountFn, Poller> = {
  unread_conversation_count: { value: 0, listeners: new Set(), disabled: false, inFlight: false, lastLoad: 0, timer: null },
  unread_notification_count: { value: 0, listeners: new Set(), disabled: false, inFlight: false, lastLoad: 0, timer: null },
};

function load(fn: CountFn, force = false) {
  const poller = pollers[fn];
  const supabase = getSupabase();
  if (!supabase || poller.disabled || poller.inFlight) return;
  if (document.visibilityState !== "visible") return;
  if (!force && Date.now() - poller.lastLoad < 5_000) return;
  poller.inFlight = true;
  poller.lastLoad = Date.now();
  supabase.rpc(fn).then(({ data, error, status }) => {
    poller.inFlight = false;
    if (error) {
      // Missing function (404 / PGRST202): stop asking until the page reloads.
      if (status === 404 || error.code === "PGRST202") {
        poller.disabled = true;
        if (poller.timer) window.clearInterval(poller.timer);
        poller.timer = null;
      }
      return;
    }
    if (typeof data === "number" && data !== poller.value) {
      poller.value = data;
      for (const listener of poller.listeners) listener();
    }
  });
}

function subscribe(fn: CountFn, listener: () => void) {
  const poller = pollers[fn];
  poller.listeners.add(listener);
  if (poller.listeners.size === 1 && !poller.disabled) {
    poller.timer = window.setInterval(() => load(fn), 60_000);
  }
  return () => {
    poller.listeners.delete(listener);
    if (poller.listeners.size === 0 && poller.timer) {
      window.clearInterval(poller.timer);
      poller.timer = null;
    }
  };
}

function useUnreadCount(userId: string | null, fn: CountFn): number {
  const pathname = usePathname();
  const value = useSyncExternalStore(
    (listener) => subscribe(fn, listener),
    () => pollers[fn].value,
    () => 0,
  );

  useEffect(() => {
    if (!userId) return;
    load(fn);
    const onFocus = () => load(fn);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId, pathname, fn]);

  return userId ? value : 0;
}

/** Number of conversations with unread messages, for nav badges. */
export function useUnreadMessages(userId: string | null): number {
  return useUnreadCount(userId, "unread_conversation_count");
}

/** Number of unread notifications, for the bell badge. */
export function useUnreadNotifications(userId: string | null): number {
  return useUnreadCount(userId, "unread_notification_count");
}
