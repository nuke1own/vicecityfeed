"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthFormState } from "@/app/actions/auth";
import { AuthCard, primaryButtonClass, textLinkClass } from "@/components/account/AuthCard";
import { FormMessage } from "@/components/account/Field";
import { FloatingField } from "@/components/account/FloatingField";

const initial: AuthFormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  return (
    <AuthCard
      title="Reset your password"
      titleId="forgot-heading"
      description="Enter the email you use for Vice City Feed and we will send you a reset link."
    >
      <form action={action} className="space-y-5" noValidate>
        {state.message ? (
          <FormMessage tone={state.status === "sent" ? "success" : "error"}>
            {state.message}
          </FormMessage>
        ) : null}
        <FloatingField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fields?.email}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/login/" className={textLinkClass}>
            Back to sign in
          </Link>
          <button type="submit" className={primaryButtonClass} disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
