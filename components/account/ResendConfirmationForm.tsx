"use client";

import { useActionState } from "react";
import { resendConfirmation, type ResendFormState } from "@/app/actions/auth";
import { Field, FormMessage } from "@/components/account/Field";
import { outlinePillClass } from "@/components/pills";

const initial: ResendFormState = { status: "idle" };

export function ResendConfirmationForm() {
  const [state, action, pending] = useActionState(resendConfirmation, initial);

  return (
    <section aria-labelledby="resend-heading" className="mt-6 rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
      <h2 id="resend-heading" className="text-base font-bold text-white">
        Need a new confirmation link?
      </h2>
      <form action={action} className="mt-4 space-y-4" noValidate>
        {state.message ? (
          <FormMessage tone={state.status === "sent" ? "success" : "error"}>
            {state.message}
          </FormMessage>
        ) : null}
        <Field
          id="resend-email"
          name="email"
          label="Email you signed up with"
          type="email"
          autoComplete="email"
          required
        />
        <button
          type="submit"
          className={outlinePillClass("px-5 text-sm font-semibold")}
          disabled={pending}
        >
          {pending ? "Sending…" : "Send new link"}
        </button>
      </form>
    </section>
  );
}
