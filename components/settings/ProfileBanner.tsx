"use client";

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
          <div className="settings-banner relative overflow-hidden rounded-2xl border border-white/10 px-5 py-8 sm:px-10 sm:py-10">
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
              <div className="relative shrink-0">
                <Avatar
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  size={120}
                  className="ring-2 ring-white/80 ring-offset-2 ring-offset-black"
                />
                <button
                  type="button"
                  onClick={open}
                  disabled={pending}
                  aria-label="Change avatar"
                  className="absolute right-0 bottom-0 inline-flex size-11 items-center justify-center rounded-full border-2 border-black bg-white text-black transition-colors hover:bg-vice-pink hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait"
                >
                  <Pencil aria-hidden className="size-5" />
                </button>
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight break-words text-white sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-base font-semibold text-white/85">@{handle}</p>
                <p className="mt-1 text-base text-white/85">
                  Created on <time dateTime={createdAt}>{createdFormat.format(new Date(createdAt))}</time>
                </p>
                <button
                  type="button"
                  onClick={open}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-2 hover:text-vice-pink"
                >
                  {avatarUrl ? "Change avatar" : "Choose an avatar"}
                </button>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
