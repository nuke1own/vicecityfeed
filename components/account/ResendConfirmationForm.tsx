"use client";

import { useActionState } from "react";
import { resendConfirmation, type ResendFormState } from "@/app/actions/auth";
import { AuthCard, secondaryButtonClass } from "@/components/account/AuthCard";
import { FormMessage } from "@/components/account/Field";
import { FloatingField } from "@/components/account/FloatingField";

const initial: ResendFormState = { status: "idle" };

export function ResendConfirmationForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, initial);

  return (
    <AuthCard as="h2" title="Need a new confirmation link?" titleId="resend-heading">
      <form action={action} className="space-y-4" noValidate>
        {state.message ? (
          <FormMessage tone={state.status === "sent" ? "success" : "error"}>
            {state.message}
          </FormMessage>
        ) : null}
        <FloatingField
          id="resend-email"
          name="email"
          label="Email you signed up with"
          type="email"
          autoComplete="email"
          defaultValue={email}
          required
        />
        <div className="flex justify-end">
          <button type="submit" className={secondaryButtonClass} disabled={pending}>
            {pending ? "Sending…" : "Send new link"}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
