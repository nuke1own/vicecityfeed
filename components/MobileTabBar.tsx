"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Newspaper, Search, UserRound, UsersRound } from "lucide-react";
import { openSearch, useSearchOpen } from "@/lib/search-store";
import { useAccount } from "@/lib/use-account";
import { useUnreadMessages } from "@/lib/use-unread";

const itemClass =
  "tap-press relative flex h-full min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white";

function tone(active: boolean) {
  return active ? "bg-white/10 text-vice-pink" : "text-white/80 active:bg-white/5 active:text-white";
}

/**
 * Thumb-reachable navigation for phones (hidden from md up). Sits above the
 * iPhone home indicator using the bottom safe-area inset.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { userId, profile } = useAccount();
  const searchOpen = useSearchOpen();
  const unread = useUnreadMessages(userId);

  const articlesActive =
    pathname === "/" || pathname.startsWith("/feed") || pathname.startsWith("/posts/");
  const socialActive = pathname.startsWith("/social");
  const messagesActive = pathname.startsWith("/messages");
  const accountActive =
    pathname.startsWith("/settings") || (profile ? pathname === `/u/${profile.handle}/` : false);
  const accountHref = userId ? "/settings/profile/" : "/login/";
  const accountLabel = userId ? "Account" : "Sign in";

  return (
    <nav
      aria-label="Primary"
      data-mobile-tab-bar
      className="mobile-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-white/10 md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1.5 pt-1">
        <li>
          <Link href="/" aria-current={articlesActive ? "page" : undefined} className={`${itemClass} ${tone(articlesActive)}`}>
            <Newspaper aria-hidden className="size-6" strokeWidth={articlesActive ? 2.4 : 1.8} />
            Articles
          </Link>
        </li>
        <li>
          <Link href="/social/" aria-current={socialActive ? "page" : undefined} className={`${itemClass} ${tone(socialActive)}`}>
            <UsersRound aria-hidden className="size-6" strokeWidth={socialActive ? 2.4 : 1.8} />
            Social
          </Link>
        </li>
        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            onClick={openSearch}
            className={`${itemClass} ${tone(searchOpen)}`}
          >
            <Search aria-hidden className="size-6" strokeWidth={1.8} />
            Search
          </button>
        </li>
        <li>
          <Link
            href={userId ? "/messages/" : "/login/?next=/messages/"}
            aria-current={messagesActive ? "page" : undefined}
            aria-label={unread > 0 ? `Messages, ${unread} unread` : undefined}
            className={`${itemClass} ${tone(messagesActive)}`}
          >
            <span className="relative">
              <Mail aria-hidden className="size-6" strokeWidth={messagesActive ? 2.4 : 1.8} />
              {unread > 0 ? (
                <span aria-hidden className="absolute -top-1.5 -right-2.5 min-w-5 rounded-full bg-vice-pink px-1 text-center text-[11px] leading-5 font-bold text-accent-ink tabular-nums">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </span>
            Messages
          </Link>
        </li>
        <li>
          <Link
            href={accountHref}
            aria-current={accountActive ? "page" : undefined}
            className={`${itemClass} ${tone(accountActive)}`}
          >
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                width={26}
                height={26}
                sizes="26px"
                className={`size-[26px] rounded-full object-cover ${accountActive ? "ring-2 ring-vice-pink" : ""}`}
              />
            ) : profile ? (
              <span
                aria-hidden
                className={`inline-flex size-[26px] items-center justify-center rounded-full text-xs font-bold ${
                  accountActive ? "bg-vice-pink text-accent-ink" : "bg-white/15 text-white"
                }`}
              >
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <UserRound aria-hidden className="size-6" strokeWidth={accountActive ? 2.4 : 1.8} />
            )}
            {accountLabel}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
