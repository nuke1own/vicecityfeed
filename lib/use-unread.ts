"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "./supabase";

/** Number of conversations with unread messages, for nav badges. */
export function useUnreadMessages(userId: string | null): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    let cancelled = false;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      supabase.rpc("unread_conversation_count").then(({ data }) => {
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
  }, [userId, pathname]);

  return userId ? count : 0;
}
