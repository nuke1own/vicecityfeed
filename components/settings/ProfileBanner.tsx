"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { AvatarPicker } from "@/components/settings/AvatarPicker";

type ProfileBannerProps = {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  createdAt: string;
};

const createdFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function ProfileBanner({ displayName, handle, avatarUrl, createdAt }: ProfileBannerProps) {
  return (
    <div>
      <AvatarPicker
        currentUrl={avatarUrl}
        trigger={(open, pending) => (
          <div className="settings-banner relative overflow-hidden rounded-2xl border border-white/10 px-4 py-5 sm:px-6 sm:py-6">
            <div className="relative flex items-center gap-4 sm:gap-6">
              <div className="relative shrink-0">
                <Avatar
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  size={84}
                  className="ring-2 ring-white/80 ring-offset-2 ring-offset-black"
                />
                <button
                  type="button"
                  onClick={open}
                  disabled={pending}
                  aria-label="Change avatar"
                  className="absolute -right-1.5 -bottom-1.5 inline-flex size-11 items-center justify-center rounded-full border-2 border-black bg-white text-black transition-colors hover:bg-vice-pink hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait"
                >
                  <Pencil aria-hidden className="size-[18px]" />
                </button>
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight break-words text-white sm:text-3xl">
                  {displayName}
                </h1>
                <p className="truncate text-sm font-semibold text-white/85">@{handle}</p>
                <p className="text-sm text-white/70">
                  Created on <time dateTime={createdAt}>{createdFormat.format(new Date(createdAt))}</time>
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4">
                  <button
                    type="button"
                    onClick={open}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-2 hover:text-vice-pink"
                  >
                    {avatarUrl ? "Change avatar" : "Choose an avatar"}
                  </button>
                  <Link
                    href={`/u/${handle}/`}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-2 hover:text-vice-pink"
                  >
                    Public profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
