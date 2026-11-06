"use client";

import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/app/actions/auth";
import { Field, FormMessage } from "@/components/account/Field";
import { ctaPillClass } from "@/components/pills";

const initial: AuthFormState = { status: "idle" };

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  const errors = state.fields ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : notice ? (
        <FormMessage tone="error">{notice}</FormMessage>
      ) : null}
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={errors.email}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password}
      />
      <button type="submit" className={ctaPillClass("white", "w-full")} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
