"use client";

import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/app/actions/auth";
import { Field, FormMessage } from "@/components/account/Field";
import { ctaPillClass } from "@/components/pills";

const initial: AuthFormState = { status: "idle" };

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);

  if (state.status === "check-email" && state.message) {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  const errors = state.fields ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <Field
        name="displayName"
        label="Display name"
        autoComplete="nickname"
        maxLength={60}
        required
        defaultValue={values.displayName}
        error={errors.displayName}
      />
      <Field
        name="handle"
        label="Handle"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        minLength={3}
        maxLength={24}
        pattern="[A-Za-z0-9_]+"
        required
        hint="3 to 24 letters, numbers or underscores. This is your @name."
        defaultValue={values.handle}
        error={errors.handle}
      />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={values.email}
        error={errors.email}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        hint="At least 8 characters."
        error={errors.password}
      />
      <button type="submit" className={ctaPillClass("white", "w-full")} disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
