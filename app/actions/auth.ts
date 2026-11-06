"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  emailSchema,
  fieldErrors,
  safeNextPath,
  signInSchema,
  signUpSchema,
} from "@/lib/community-validation";
import { isHandleTaken, profileHref } from "@/lib/profiles";
import { SITE } from "@/lib/site";
import { createServerSupabase } from "@/lib/supabase-server";

export type AuthFormState = {
  status: "idle" | "error" | "check-email";
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : SITE.url;
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    email: text(formData, "email"),
    handle: text(formData, "handle"),
    displayName: text(formData, "displayName"),
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error), values };
  }
  const { email, password, handle, displayName } = parsed.data;

  if (await isHandleTaken(handle)) {
    return {
      status: "error",
      fields: { handle: "That handle is taken." },
      values,
    };
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
      : /password/i.test(error.message)
        ? error.message
        : "We could not create your account. Please try again.";
    return { status: "error", message, values };
  }

  // Email confirmation is on: there is no session until the link is clicked.
  if (!data.session) {
    return {
      status: "check-email",
      message: `We sent a confirmation link to ${email}. Open it to finish joining.`,
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
  });
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error), values };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message = /confirm/i.test(error.message)
      ? "Confirm your email first. Use the form below to get a new link."
      : "That email and password do not match.";
    return { status: "error", message, values };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
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
  if (error && /rate|seconds|too many/i.test(error.message)) {
    return {
      status: "error",
      message: "Too many emails sent. Wait a minute, then try again.",
    };
  }
  // Same answer whether or not the account exists, so emails cannot be probed.
  return {
    status: "sent",
    message: `If ${parsed.data} has an unconfirmed account, a new link is on its way. It works once and expires in an hour.`,
  };
}
