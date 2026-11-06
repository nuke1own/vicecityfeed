"use client";

import { useActionState, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  removeAvatar,
  updateAvatar,
  type SettingsFormState,
} from "@/app/actions/profile";
import { Avatar } from "@/components/account/Avatar";
import { FormMessage } from "@/components/account/Field";

type ProfileBannerProps = {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  createdAt: string;
};

const initial: SettingsFormState = { status: "idle" };
const createdFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function ProfileBanner({ displayName, handle, avatarUrl, createdAt }: ProfileBannerProps) {
  const [uploadState, uploadAction, uploading] = useActionState(updateAvatar, initial);
  const [removeState, removeAction, removing] = useActionState(removeAvatar, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Show the message from whichever photo action finished most recently.
  const [state, setState] = useState<SettingsFormState>(initial);
  const [seen, setSeen] = useState({ upload: uploadState, remove: removeState });
  if (seen.upload !== uploadState || seen.remove !== removeState) {
    setState(seen.upload !== uploadState ? uploadState : removeState);
    setSeen({ upload: uploadState, remove: removeState });
  }
  const busy = uploading || removing;

  return (
    <div>
      <div className="settings-banner relative overflow-hidden rounded-2xl border border-white/10 px-5 py-8 sm:px-10 sm:py-10">
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative shrink-0">
            <Avatar
              displayName={displayName}
              avatarUrl={avatarUrl}
              size={120}
              className="ring-2 ring-white/80 ring-offset-2 ring-offset-black"
            />
            <form ref={formRef} action={uploadAction}>
              <input
                ref={fileRef}
                id="avatar-upload"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={() => {
                  if (fileRef.current?.files?.length) formRef.current?.requestSubmit();
                }}
              />
            </form>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Change profile photo"
              className="absolute right-0 bottom-0 inline-flex size-11 items-center justify-center rounded-full border-2 border-black bg-white text-black transition-colors hover:bg-vice-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait"
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
            {avatarUrl ? (
              <form action={removeAction}>
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-2 hover:text-vice-pink disabled:cursor-wait"
                >
                  Remove photo
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/75" aria-live="polite">
        {busy ? "Updating your photo…" : "Use the pencil to upload a JPG, PNG or WebP photo up to 2 MB."}
      </p>
      {state.message ? (
        <div className="mt-3">
          <FormMessage tone={state.status === "saved" ? "success" : "error"}>{state.message}</FormMessage>
        </div>
      ) : null}
    </div>
  );
}
