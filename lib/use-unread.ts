"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "./supabase";

/** Number of conversations with unread messages, for nav badges. */
export function useUnreadMessages(userId: string | null): number {
  return useUnreadCount(userId, "unread_conversation_count");
}

/** Number of unread notifications, for the bell badge. */
export function useUnreadNotifications(userId: string | null): number {
  return useUnreadCount(userId, "unread_notification_count");
}

function useUnreadCount(
  userId: string | null,
  fn: "unread_conversation_count" | "unread_notification_count",
): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    let cancelled = false;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      supabase.rpc(fn).then(({ data }) => {
        if (!cancelled && typeof data === "number") setCount(data);
      });
    };
    load();
    const id = window.setInterval(load, 60_000);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", load);
    };
  }, [userId, pathname, fn]);

  return userId ? count : 0;
}
