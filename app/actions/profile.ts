"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avatarName, avatarSrc } from "@/lib/avatars";
import {
  avatarChoiceSchema,
  bioSchema,
  displayNameSchema,
  emailSchema,
  handleSchema,
} from "@/lib/community-validation";
import { getCurrentProfile, isHandleTaken, profileHref, type Profile } from "@/lib/profiles";
import { SESSION_ONLY_COOKIE } from "@/lib/session-cookie";
import { SITE } from "@/lib/site";
import { removeQueuedImageFiles } from "@/lib/storage-cleanup";
import { createServerSupabase } from "@/lib/supabase-server";

const AVATARS_BUCKET = "avatars";
const SETTINGS_PATH = "/settings/profile/";

export type SettingsFormState = {
  status: "idle" | "error" | "saved";
  message?: string;
  fields?: Record<string, string>;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login/?next=${SETTINGS_PATH}`);
  return profile;
}

/** Storage path for an avatar URL in our bucket, or null if it is not ours. */
function avatarPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

function refresh(...handles: string[]) {
  for (const handle of handles) revalidatePath(profileHref(handle));
  revalidatePath("/settings", "layout");
}

const PROFILE_FIELDS = {
  displayName: { column: "display_name", schema: displayNameSchema },
  handle: { column: "handle", schema: handleSchema },
  bio: { column: "bio", schema: bioSchema },
} as const;

type ProfileField = keyof typeof PROFILE_FIELDS;

function isProfileField(value: string): value is ProfileField {
  return value in PROFILE_FIELDS;
}

/** Saves one profile detail row (display name, handle or bio). */
export async function updateProfileField(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const profile = await requireProfile();
  const field = text(formData, "field");
  if (!isProfileField(field)) return { status: "error", message: "Unknown field." };

  const { column, schema } = PROFILE_FIELDS[field];
  const parsed = schema.safeParse(text(formData, "value"));
  if (!parsed.success) {
    return { status: "error", fields: { value: parsed.error.issues[0].message } };
  }
  const value = parsed.data;

  if (field === "handle" && value !== profile.handle && (await isHandleTaken(value, profile.id))) {
    return { status: "error", fields: { value: "That handle is taken." } };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("profiles").update({ [column]: value }).eq("id", profile.id);
  if (error) {
    return error.code === "23505"
      ? { status: "error", fields: { value: "That handle is taken." } }
      : { status: "error", message: "We could not save that. Please try again." };
  }

  refresh(profile.handle, field === "handle" ? value : profile.handle);
  return { status: "saved", message: "Saved." };
}

/** Sets one of the preset avatars (or none). Custom uploads are not allowed. */
export async function setAvatar(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const profile = await requireProfile();
  const parsed = avatarChoiceSchema.safeParse(text(formData, "avatar"));
  if (!parsed.success) return { status: "error", message: "Choose one of the avatars." };

  const avatarUrl = parsed.data ? avatarSrc(parsed.data) : null;
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
  if (error) return { status: "error", message: "We could not save your avatar. Please try again." };

  // Clean up any photo uploaded before avatars became preset-only.
  const previous = avatarPath(profile.avatarUrl);
  if (previous) await supabase.storage.from(AVATARS_BUCKET).remove([previous]);
  refresh(profile.handle);
  return {
    status: "saved",
    message: parsed.data ? `Avatar set to ${avatarName(parsed.data)}.` : "Avatar removed.",
  };
}

export async function updateEmail(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireProfile();
  const parsed = emailSchema.safeParse(text(formData, "value"));
  if (!parsed.success) {
    return { status: "error", fields: { value: parsed.error.issues[0].message } };
  }
  const origin = (await headers()).get("origin");
  const site = origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : SITE.url;
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${site}/auth/confirm/?next=${encodeURIComponent(SETTINGS_PATH)}` },
  );
  if (error) {
    return {
      status: "error",
      fields: {
        value: /already|registered|exists/i.test(error.message)
          ? "Another account already uses that email."
          : /rate|seconds|too many/i.test(error.message)
            ? "Too many emails sent. Wait a minute, then try again."
            : "We could not change your email. Please try again.",
      },
    };
  }
  return {
    status: "saved",
    message: `Check ${parsed.data} for a confirmation link. Your email changes once you open it.`,
  };
}

export async function deleteAccount(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const profile = await requireProfile();
  if (text(formData, "confirm").trim().toLowerCase() !== profile.handle) {
    return { status: "error", fields: { confirm: `Type ${profile.handle} to confirm.` } };
  }

  const supabase = await createServerSupabase();
  const { data: files } = await supabase.storage.from(AVATARS_BUCKET).list(profile.id);
  if (files && files.length > 0) {
    await supabase.storage
      .from(AVATARS_BUCKET)
      .remove(files.map((file) => `${profile.id}/${file.name}`));
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return { status: "error", message: "We could not delete your account. Please try again." };
  }
  // Their posts (and replies to them) were deleted; remove the image files too.
  await removeQueuedImageFiles(supabase);

  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  revalidatePath(profileHref(profile.handle));
  redirect("/?account=deleted");
}

