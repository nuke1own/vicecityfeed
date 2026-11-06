"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  emailSchema,
  fieldErrors,
  newPasswordSchema,
  passwordChangeSchema,
  passwordResetRequestSchema,
  safeNextPath,
  signInSchema,
  signUpSchema,
} from "@/lib/community-validation";
import { isHandleTaken, profileHref } from "@/lib/profiles";
import { SESSION_ONLY_COOKIE } from "@/lib/session-cookie";
import { SITE } from "@/lib/site";
import { createServerSupabase } from "@/lib/supabase-server";

export type AuthFormState = {
  status: "idle" | "error" | "check-email" | "sent";
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  /** Set when sign-in failed because the email is not confirmed yet. */
  needsConfirmation?: boolean;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : SITE.url;
}

function isRateLimited(message: string): boolean {
  return /rate|seconds|too many/i.test(message);
}

const RATE_LIMITED = "Too many emails sent. Wait a minute, then try again.";

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    email: text(formData, "email"),
    handle: text(formData, "handle"),
    displayName: text(formData, "displayName"),
  };
  // The date of birth is checked here and never stored.
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(formData, "password"),
    birthYear: text(formData, "birthYear"),
    birthMonth: text(formData, "birthMonth"),
    birthDay: text(formData, "birthDay"),
  });
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error), values };
  }
  const { email, password, handle, displayName } = parsed.data;

  if (await isHandleTaken(handle)) {
    return { status: "error", fields: { handle: "That handle is taken." }, values };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { handle, display_name: displayName },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm/`,
    },
  });

  if (error) {
    const message = /registered|exists/i.test(error.message)
      ? "An account with that email already exists. Try signing in."
      : isRateLimited(error.message)
        ? RATE_LIMITED
        : /password/i.test(error.message)
          ? error.message
          : "We could not create your account. Please try again.";
    return { status: "error", message, values };
  }

  // Email confirmation is on: there is no session until the link is clicked.
  if (!data.session) {
    return {
      status: "check-email",
      message: `We sent a confirmation link to ${email}. Open it to finish creating your account.`,
    };
  }

  redirect(profileHref(handle));
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: text(formData, "email") };
  const parsed = signInSchema.safeParse({
    email: values.email,
    password: text(formData, "password"),
    remember: formData.get("remember") === "on",
  });
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error), values };
  }
  const { email, password, remember } = parsed.data;

  const cookieStore = await cookies();
  if (remember) {
    cookieStore.delete(SESSION_ONLY_COOKIE);
  } else {
    // No Max-Age: the flag and the auth cookies end with the browser session.
    cookieStore.set(SESSION_ONLY_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const supabase = await createServerSupabase({ sessionOnly: !remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const needsConfirmation = /confirm/i.test(error.message);
    return {
      status: "error",
      message: needsConfirmation
        ? "Confirm your email first. You can get a new link below."
        : "The email or password you entered is incorrect.",
      values,
      needsConfirmation,
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect("/");
}

export type ResendFormState = {
  status: "idle" | "error" | "sent";
  message?: string;
};

/** Send a fresh sign-up confirmation link, e.g. after the first one expired. */
export async function resendConfirmation(
  _prev: ResendFormState,
  formData: FormData,
): Promise<ResendFormState> {
  const parsed = emailSchema.safeParse(text(formData, "email"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm/` },
  });
  if (error && isRateLimited(error.message)) {
    return { status: "error", message: RATE_LIMITED };
  }
  // Same answer whether or not the account exists, so emails cannot be probed.
  return {
    status: "sent",
    message: `If ${parsed.data} has an unconfirmed account, a new link is on its way. It works once and expires in an hour.`,
  };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: text(formData, "email") };
  const parsed = passwordResetRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error), values };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm/?next=${encodeURIComponent("/reset-password/")}`,
  });
  if (error && isRateLimited(error.message)) {
    return { status: "error", message: RATE_LIMITED, values };
  }
  return {
    status: "sent",
    message: `If an account uses ${parsed.data.email}, we sent it a link to reset the password. It works once and expires in an hour.`,
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error) };
  }
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      status: "error",
      message: "Your reset link has expired. Request a new one.",
    };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message: /different|same/i.test(error.message)
        ? "Choose a password you have not used for this account before."
        : "We could not update your password. Please try again.",
    };
  }
  redirect("/settings/profile/?password=updated");
}

/** Settings > Security: change password after re-checking the current one. */
export async function changePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: text(formData, "currentPassword"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error) };
  }
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) redirect("/login/?next=/settings/security/");

  const check = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  });
  if (check.error) {
    return {
      status: "error",
      fields: { currentPassword: "That is not your current password." },
    };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: "We could not update your password. Please try again." };
  }
  return { status: "sent", message: "Your password has been changed." };
}

/** Settings > Security: end every session on every device, including this one. */
export async function signOutEverywhere(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut({ scope: "global" });
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect("/login/");
}
