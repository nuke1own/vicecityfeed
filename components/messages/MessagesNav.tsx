"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { outlinePillClass } from "@/components/pills";
import { useAccount } from "@/lib/use-account";
import { useUnreadMessages } from "@/lib/use-unread";

/** Header Messages button with an unread badge (tablet and desktop). */
export function MessagesNav() {
  const { userId } = useAccount();
  const unread = useUnreadMessages(userId);
  if (!userId) return null;
  return (
    <Link
      href="/messages/"
      aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
      className={outlinePillClass("relative size-11 min-h-11")}
    >
      <Mail aria-hidden className="size-4" />
      {unread > 0 ? (
        <span aria-hidden className="absolute -top-1 -right-1 min-w-5 rounded-full bg-vice-pink px-1 text-center text-[11px] leading-5 font-bold text-accent-ink tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
