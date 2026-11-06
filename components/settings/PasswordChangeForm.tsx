"use client";

import { useActionState } from "react";
import Link from "next/link";
import { changePassword, type AuthFormState } from "@/app/actions/auth";
import { primaryButtonClass } from "@/components/account/AuthCard";
import { FormMessage } from "@/components/account/Field";
import { FloatingField } from "@/components/account/FloatingField";

const initial: AuthFormState = { status: "idle" };

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  const errors = state.fields ?? {};

  return (
    <form action={action} className="space-y-5 py-6 sm:py-7" noValidate>
      {state.message ? (
        <FormMessage tone={state.status === "sent" ? "success" : "error"}>{state.message}</FormMessage>
      ) : null}
      <FloatingField
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.currentPassword}
      />
      <FloatingField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        hint="At least 8 characters."
        error={errors.password}
      />
      <FloatingField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/forgot-password/" className="text-sm text-white underline underline-offset-2 hover:text-vice-pink">
          Forgot your current password?
        </Link>
        <button type="submit" className={primaryButtonClass.replace("rounded-sm", "rounded-full")} disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
