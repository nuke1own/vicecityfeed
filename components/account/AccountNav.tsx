"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { useAccount } from "@/lib/use-account";

/** Header account control (tablet and desktop; phones use the tab bar). */
export function AccountNav() {
  const state = useAccount();



  if (state.profile) {
    const { handle, displayName, avatarUrl } = state.profile;
    return (
      <Link
        href="/settings/profile/"
        aria-label={`Your profile, @${handle}`}
        data-account-nav="signed-in"
        className="group relative inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
      >
        {/* Accent ring that glows on hover. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full p-[2px] transition-[box-shadow,background-color] duration-200 [background:linear-gradient(135deg,var(--accent),rgb(var(--accent-rgb)/0.35))] group-hover:shadow-[0_0_14px_rgb(var(--accent-rgb)/0.6)]"
        />
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${displayName}'s avatar`}
            width={40}
            height={40}
            sizes="40px"
            className="relative size-10 rounded-full border-2 border-black object-cover transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <span aria-hidden className="relative inline-flex size-10 items-center justify-center rounded-full border-2 border-black bg-raised text-sm font-bold text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={state.userId ? "/settings/profile/" : "/login/"}
      aria-label={state.userId ? "Your account" : "Sign in or join"}
      data-account-nav="signed-out"
      className="tap-press inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 md:h-10 text-sm font-bold text-black transition-colors hover:bg-vice-pink hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
    >
      <UserRound className="size-4 shrink-0" aria-hidden />
      <span>
        {state.userId ? "Account" : "Sign in"}
      </span>
    </Link>
  );
}
