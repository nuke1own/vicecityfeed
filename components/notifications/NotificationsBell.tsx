"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAccount } from "@/lib/use-account";
import { useUnreadNotifications } from "@/lib/use-unread";

/** Bell with unread count. `variant="header"` matches the header buttons. */
export function NotificationsBell({ className = "" }: { className?: string }) {
  const { userId } = useAccount();
  const unread = useUnreadNotifications(userId);
  if (!userId) return null;
  return (
    <Link
      href="/notifications/"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className={`relative inline-flex size-11 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
    >
      <Bell aria-hidden className="size-[18px]" />
      {unread > 0 ? (
        <span aria-hidden className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-vice-pink px-1 text-center text-[11px] leading-5 font-bold text-accent-ink tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
