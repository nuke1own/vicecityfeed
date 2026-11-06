"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { setAvatar, type SettingsFormState } from "@/app/actions/profile";
import { primaryButtonClass } from "@/components/account/AuthCard";
import { FormMessage } from "@/components/account/Field";
import { AVATARS, avatarIdFromUrl, avatarSrc, type AvatarId } from "@/lib/avatars";
import { notifyAccountChanged } from "@/lib/use-account";

const initial: SettingsFormState = { status: "idle" };

type AvatarPickerProps = {
  currentUrl: string | null;
  /** Renders the button that opens the picker. */
  trigger: (open: () => void, pending: boolean) => React.ReactNode;
};

/** Modal grid of the preset avatars. Members cannot upload their own. */
export function AvatarPicker({ currentUrl, trigger }: AvatarPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = avatarIdFromUrl(currentUrl);
  const [choice, setChoice] = useState<AvatarId | "">(current ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: SettingsFormState, formData: FormData) => {
    const result = await setAvatar(prev, formData);
    if (result.status === "saved") {
      setIsOpen(false);
      notifyAccountChanged();
    }
    return result;
  }, initial);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function open() {
    setChoice(current ?? "");
    setIsOpen(true);
  }

  const close = () => setIsOpen(false);

  return (
    <>
      {trigger(open, pending)}
      {state.message && state.status !== "idle" ? (
        <div className="mt-3">
          <FormMessage tone={state.status === "saved" ? "success" : "error"}>{state.message}</FormMessage>
        </div>
      ) : null}
      <dialog
        ref={dialogRef}
        onClose={close}
        aria-labelledby="avatar-picker-title"
        className="avatar-dialog m-auto max-h-[min(44rem,calc(100dvh-2rem))] w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-surface p-0 text-white backdrop:bg-black/80"
      >
        <form action={action} className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="avatar-picker-title" className="text-xl font-bold sm:text-2xl">
                Choose your avatar
              </h2>
              <p className="mt-1 text-sm text-white/80">Pick a Vice City Feed avatar for your profile.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <fieldset className="mt-5">
            <legend className="sr-only">Avatars</legend>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {AVATARS.map((avatar) => {
                const selected = choice === avatar.id;
                return (
                  <label
                    key={avatar.id}
                    className={`group relative cursor-pointer rounded-xl p-1 transition-[background-color,transform] active:scale-[0.97] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white ${
                      selected ? "bg-vice-pink" : "hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="avatar"
                      value={avatar.id}
                      checked={selected}
                      onChange={() => setChoice(avatar.id)}
                      className="sr-only"
                    />
                    <Image
                      src={avatarSrc(avatar.id)}
                      alt=""
                      width={160}
                      height={160}
                      sizes="(min-width: 640px) 130px, 30vw"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <span className={`mt-1.5 block truncate px-0.5 text-center text-xs font-semibold ${selected ? "text-accent-ink" : "text-white"}`}>
                      {avatar.name}
                    </span>
                    {selected ? (
                      <span aria-hidden className="absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full bg-vice-pink text-accent-ink">
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white">
              <input
                type="radio"
                name="avatar"
                value=""
                checked={choice === ""}
                onChange={() => setChoice("")}
                className="size-5 accent-vice-pink"
              />
              No avatar (show my initials)
            </label>
          </fieldset>

          {state.status === "error" && state.message ? (
            <div className="mt-3">
              <FormMessage tone="error">{state.message}</FormMessage>
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-5 mt-4 flex justify-end gap-3 border-t border-white/10 bg-surface px-5 pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center rounded-full px-5 font-semibold text-white hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || choice === (current ?? "")}
              className={primaryButtonClass.replace("rounded-sm", "rounded-full")}
            >
              {pending ? "Saving…" : "Save avatar"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
