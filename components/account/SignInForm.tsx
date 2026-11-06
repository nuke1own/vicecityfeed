"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthFormState } from "@/app/actions/auth";
import {
  AuthCard,
  primaryButtonClass,
  textLinkClass,
} from "@/components/account/AuthCard";
import { FormMessage } from "@/components/account/Field";
import { FloatingField } from "@/components/account/FloatingField";
import { ResendConfirmationForm } from "@/components/account/ResendConfirmationForm";

const initial: AuthFormState = { status: "idle" };

type SignInFormProps = {
  next: string;
  notice?: string;
  showResend?: boolean;
};

export function SignInForm({ next, notice, showResend = false }: SignInFormProps) {
  const [state, action, pending] = useActionState(signIn, initial);
  const errors = state.fields ?? {};
  const message = state.status === "error" ? state.message : notice;

  return (
    <>
      <AuthCard title="Sign In" titleId="signin-heading">
        <form action={action} className="space-y-5" noValidate>
          <input type="hidden" name="next" value={next} />
          {message ? <FormMessage tone="error">{message}</FormMessage> : null}
          <FloatingField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            error={errors.email}
          />
          <FloatingField
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password}
          />
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-base text-white">
            <input
              type="checkbox"
              name="remember"
              className="size-5 rounded-sm accent-vice-pink"
            />
            Keep me signed in
          </label>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/forgot-password/" className={textLinkClass}>
              Forgot your password?
            </Link>
            <button type="submit" className={primaryButtonClass} disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </AuthCard>
      {showResend || state.needsConfirmation ? (
        <ResendConfirmationForm email={state.values?.email} />
      ) : null}
      <p className="text-center text-base text-white">
        Don&apos;t have a Vice City Feed account?{" "}
        <Link href="/signup/" className="font-semibold text-vice-pink underline underline-offset-2 hover:text-white">
          Create a new account
        </Link>
      </p>
    </>
  );
}
