"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { useAccount } from "@/lib/use-account";

/**
 * Signed-in members see their avatar and name at the top of the home page.
 * Rendered in the browser so the cached home page stays the same for everyone.
 */
export function HomeWelcome() {
  const { profile } = useAccount();
  if (!profile) return null;

  return (
    <section aria-label="Your account" className="mx-auto max-w-7xl px-4 pt-4 md:px-6">
      <Link
        href="/settings/profile/"
        className="reveal flex items-center gap-4 rounded-2xl border border-white/10 bg-surface px-4 py-3.5 transition-colors hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5"
      >
        <Avatar
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
          size={56}
          className="ring-2 ring-vice-pink ring-offset-2 ring-offset-surface"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold text-white">
            Welcome back, {profile.displayName}
          </span>
          <span className="block truncate text-sm text-white/75">
            @{profile.handle}
            {profile.avatarUrl ? "" : " · Choose an avatar for your profile"}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-white/80" />
      </Link>
    </section>
  );
}
