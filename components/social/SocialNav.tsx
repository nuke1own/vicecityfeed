"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  CircleEllipsis,
  Ellipsis,
  Feather,
  Home,
  MessageCircle,
  Newspaper,
  Palette,
  Search,
  Settings,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { useAccount } from "@/lib/use-account";
import { useUnreadMessages, useUnreadNotifications } from "@/lib/use-unread";

type Item = { href: string; label: string; Icon: LucideIcon; match: (path: string) => boolean; badge?: number; auth?: boolean };

/**
 * X-style navigation down the left of Social, Notifications and Messages.
 * Icons only on tablets, icons and labels on wide screens, hidden on phones
 * (they use the bottom tab bar).
 */
export function SocialNav() {
  const pathname = usePathname();
  const { userId, profile } = useAccount();
  const notifications = useUnreadNotifications(userId);
  const messages = useUnreadMessages(userId);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMoreOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const signIn = (next: string) => `/login/?next=${encodeURIComponent(next)}`;
  const items: Item[] = [
    { href: "/social/", label: "Home", Icon: Home, match: (p) => p === "/social" || p === "/social/" || p.startsWith("/social/post") },
    { href: "/social/search/", label: "Explore", Icon: Search, match: (p) => p.startsWith("/social/search") },
    { href: "/notifications/", label: "Notifications", Icon: Bell, match: (p) => p.startsWith("/notifications"), badge: notifications, auth: true },
    { href: "/social/connect/", label: "Follow", Icon: UserPlus, match: (p) => p.startsWith("/social/connect") },
    { href: "/messages/", label: "Chat", Icon: MessageCircle, match: (p) => p.startsWith("/messages"), badge: messages, auth: true },
    { href: "/social/bookmarks/", label: "Bookmarks", Icon: Bookmark, match: (p) => p.startsWith("/social/bookmarks"), auth: true },
    {
      href: profile ? `/u/${profile.handle}/` : "/login/",
      label: "Profile",
      Icon: UserRound,
      match: (p) => Boolean(profile) && p.startsWith(`/u/${profile?.handle}`),
      auth: true,
    },
  ];

  const row =
    "group flex min-h-12 w-full items-center justify-center gap-4 rounded-full px-3 text-xl transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white xl:justify-start xl:pr-6";

  return (
    <nav aria-label="Social" className="social-nav sticky hidden shrink-0 flex-col self-start pt-4 pb-4 md:flex md:w-[4.5rem] xl:w-64">
      <ul className="space-y-0.5">
        {items.map(({ href, label, Icon, match, badge, auth }) => {
          const active = match(pathname);
          const target = auth && !userId ? signIn(href) : href;
          return (
            <li key={label}>
              <Link
                href={target}
                aria-current={active ? "page" : undefined}
                aria-label={badge ? `${label}, ${badge} unread` : label}
                title={label}
                className={`${row} ${active ? "font-bold text-white" : "text-white/90"}`}
              >
                <span className="relative">
                  <Icon aria-hidden className={`size-[26px] ${active ? "text-vice-pink" : ""}`} strokeWidth={active ? 2.4 : 1.8} fill={active && label === "Home" ? "currentColor" : "none"} />
                  {badge ? (
                    <span aria-hidden className="absolute -top-1.5 -right-2 min-w-5 rounded-full bg-vice-pink px-1 text-center text-[11px] leading-5 font-bold text-accent-ink tabular-nums">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="hidden xl:inline">{label}</span>
              </Link>
            </li>
          );
        })}
        <li ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-label="More"
            title="More"
            className={`${row} text-white/90`}
          >
            <CircleEllipsis aria-hidden className="size-[26px]" strokeWidth={1.8} />
            <span className="hidden xl:inline">More</span>
          </button>
          {moreOpen ? (
            <div role="menu" className="absolute bottom-14 left-0 z-40 w-60 rounded-2xl border border-white/10 bg-raised p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.6)]">
              {[
                { href: "/settings/profile/", label: "Settings", Icon: Settings },
                { href: "/settings/preferences/", label: "Color theme", Icon: Palette },
                { href: "/", label: "Articles", Icon: Newspaper },
              ].map(({ href, label, Icon }) => (
                <Link key={label} role="menuitem" href={href} onClick={() => setMoreOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-white hover:bg-white/10">
                  <Icon aria-hidden className="size-5" /> {label}
                </Link>
              ))}
            </div>
          ) : null}
        </li>
      </ul>

      <Link
        href={userId ? "/social/compose/" : signIn("/social/compose/")}
        aria-label="Post"
        className="mt-5 inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-vice-pink text-base font-extrabold text-accent-ink shadow-[0_0_18px_rgb(var(--accent-rgb)/0.35)] transition-colors hover:bg-white md:size-12 md:self-center xl:w-full xl:self-auto"
      >
        <Feather aria-hidden className="size-6 xl:hidden" />
        <span className="hidden xl:inline">Post</span>
      </Link>

      <div className="mt-auto pt-6">
        {profile ? (
          <Link href="/settings/profile/" title="Your account" className="flex min-h-14 items-center gap-3 rounded-full p-2 hover:bg-white/10 md:justify-center xl:justify-start">
            <Avatar displayName={profile.displayName} avatarUrl={profile.avatarUrl} size={40} />
            <span className="hidden min-w-0 flex-1 xl:block">
              <span className="block truncate text-[15px] font-bold text-white">{profile.displayName}</span>
              <span className="block truncate text-sm text-white/60">@{profile.handle}</span>
            </span>
            <Ellipsis aria-hidden className="hidden size-5 text-white/70 xl:block" />
            <span className="sr-only">Your account</span>
          </Link>
        ) : (
          <Link href="/login/?next=/social/" className="flex min-h-12 items-center justify-center rounded-full border border-white/25 font-bold text-white hover:border-white md:size-12 md:self-center xl:w-full">
            <UserRound aria-hidden className="size-5 xl:hidden" />
            <span className="hidden xl:inline">Sign in</span>
            <span className="sr-only xl:hidden">Sign in</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
