"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/app/actions/auth";
import { AuthCard, primaryButtonClass } from "@/components/account/AuthCard";
import { FormMessage } from "@/components/account/Field";
import { FloatingField } from "@/components/account/FloatingField";

const initial: AuthFormState = { status: "idle" };

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  const errors = state.fields ?? {};

  return (
    <AuthCard title="Choose a new password" titleId="reset-heading">
      <form action={action} className="space-y-5" noValidate>
        {state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
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
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={pending}>
            {pending ? "Saving…" : "Save password"}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
