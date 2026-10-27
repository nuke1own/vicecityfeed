"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { outlinePillClass } from "@/components/pills";
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
      className={outlinePillClass(
        count > 0
          ? "h-9 min-h-9 gap-1 px-2.5 sm:h-11 sm:min-h-11 sm:gap-1.5 sm:px-3"
          : "size-9 min-h-9 sm:size-11 sm:min-h-11",
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
