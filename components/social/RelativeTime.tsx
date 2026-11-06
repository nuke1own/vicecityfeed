"use client";

import { useEffect, useState } from "react";

const fullFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** X-style short time ("now", "5m", "3h", "Nov 4"), refreshed every minute. */
export function shortTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  if (diff < minute) return "now";
  if (diff < 60 * minute) return `${Math.floor(diff / minute)}m`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))}h`;
  return dayFormat.format(then);
}

export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return (
    <time dateTime={iso} title={fullFormat.format(new Date(iso))} className={className} suppressHydrationWarning>
      {now === null ? dayFormat.format(new Date(iso)) : shortTime(iso, now)}
    </time>
  );
}
