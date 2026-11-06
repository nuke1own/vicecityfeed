"use client";

import { useActionState, useRef } from "react";
import { deleteAccount, type SettingsFormState } from "@/app/actions/profile";
import { FieldError, FormMessage, inputClass, labelClass } from "@/components/account/Field";

const initial: SettingsFormState = { status: "idle" };
const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#c62f35] px-5 text-base font-bold text-white transition-colors hover:bg-[#e0353c] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white disabled:cursor-wait disabled:opacity-70";

export function DeleteAccount({ handle }: { handle: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(deleteAccount, initial);

  return (
    <div className="flex flex-col gap-3 py-4 md:items-start md:gap-6 md:py-7">
      <p className="text-sm leading-relaxed text-white/80 md:text-base md:text-white/85">
        <span className="md:hidden">Permanently removes your profile, posts and follows. This cannot be undone.</span>
        <span className="hidden md:inline">
          Deleting your Vice City Feed account is permanent. Your profile, posts, follows and
          avatar are removed and cannot be recovered.
        </span>
      </p>
      <button
        type="button"
        className={`${dangerButtonClass} shrink-0 self-start md:min-h-12 md:px-7`}
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete Account
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-surface p-0 text-white backdrop:bg-black/80"
      >
        <form action={action} className="space-y-5 p-6" noValidate>
          <h2 id="delete-title" className="text-2xl font-bold">
            Delete your account?
          </h2>
          <p className="text-base text-white/85">
            This cannot be undone. Type <strong className="text-white">{handle}</strong> to confirm.
          </p>
          {state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
          <div>
            <label htmlFor="delete-confirm" className={labelClass}>
              Your handle
            </label>
            <input
              id="delete-confirm"
              name="confirm"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={state.fields?.confirm ? true : undefined}
              aria-describedby={state.fields?.confirm ? "delete-confirm-error" : undefined}
              className={inputClass}
            />
            {state.fields?.confirm ? (
              <FieldError id="delete-confirm-error">{state.fields.confirm}</FieldError>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex min-h-12 items-center rounded-full px-5 text-base font-semibold text-white hover:bg-white/10"
            >
              Cancel
            </button>
            <button type="submit" className={dangerButtonClass} disabled={pending}>
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
