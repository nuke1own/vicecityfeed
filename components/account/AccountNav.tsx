"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { outlinePillClass } from "@/components/pills";
import { useAccount } from "@/lib/use-account";

/** Header account control (tablet and desktop; phones use the tab bar). */
export function AccountNav() {
  const state = useAccount();

  const size = "size-11 min-h-11";

  if (state.profile) {
    const { handle, displayName, avatarUrl } = state.profile;
    return (
      <Link
        href="/settings/profile/"
        aria-label={`Your profile, @${handle}`}
        data-account-nav="signed-in"
        className={outlinePillClass(`${size} overflow-hidden p-0`)}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${displayName}'s avatar`}
            width={44}
            height={44}
            sizes="44px"
            className="size-full rounded-full object-cover"
          />
        ) : (
          <span aria-hidden className="text-xs font-bold">
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
      className={outlinePillClass(`${size} md:w-auto md:gap-2 md:px-3.5`)}
    >
      <UserRound className="size-4 shrink-0" aria-hidden />
      <span className="hidden text-xs font-semibold tracking-wide md:inline">
        {state.userId ? "Account" : "Sign in"}
      </span>
    </Link>
  );
}
