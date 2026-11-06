"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { ghostPillClass } from "@/components/pills";
import { useSavedStories } from "@/lib/saved";

export function SavedNav() {
  const pathname = usePathname();
  const { count } = useSavedStories();
  const active = pathname === "/saved" || pathname.startsWith("/saved/");
  const label =
    count > 0
      ? `Saved, ${count} ${count === 1 ? "story" : "stories"}`
      : "Saved stories";

  return (
    <Link
      href="/saved/"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      data-saved-nav
      data-saved-count={count}
      className={ghostPillClass(
        count > 0
          ? "h-11 min-h-11 gap-1.5 px-3"
          : "size-11 min-h-11",
      )}
    >
      <Bookmark
        className="size-4"
        fill={count > 0 ? "currentColor" : "none"}
        aria-hidden
      />
      {count > 0 ? (
        <span className="text-xs font-medium tabular-nums sm:text-sm">{count}</span>
      ) : null}
    </Link>
  );
}
