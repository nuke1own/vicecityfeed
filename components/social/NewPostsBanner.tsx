"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { loadSupabase } from "@/lib/supabase";

/**
 * Like X: while you read, new top-level posts are counted live (Supabase
 * Realtime) and a button shows them without losing your place first.
 */
export function NewPostsBanner() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    // Live updates are a nice-to-have: connect once the page has settled.
    const start = () =>
      void loadSupabase().then((supabase) => {
        if (!supabase || cancelled) return;
        const channel = supabase
          .channel("social-timeline")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
            const row = payload.new as { reply_to?: string | null; hidden?: boolean };
            if (!row.reply_to && !row.hidden) setCount((value) => value + 1);
          })
          .subscribe();
        stop = () => void supabase.removeChannel(channel);
      });
    const idle = window.setTimeout(start, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(idle);
      stop?.();
    };
  }, []);

  if (count === 0) return null;
  return (
    <div className="below-header pointer-events-none sticky z-30 flex justify-center">
      <button
        type="button"
        onClick={() => {
          setCount(0);
          window.scrollTo({ top: 0, behavior: "smooth" });
          router.refresh();
        }}
        className="pointer-events-auto mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-vice-pink px-4 text-sm font-bold text-accent-ink shadow-[0_8px_24px_rgb(0_0_0/0.5)]"
      >
        <ArrowUp aria-hidden className="size-4" />
        {count === 1 ? "1 new post" : `${count > 20 ? "20+" : count} new posts`}
      </button>
    </div>
  );
}
