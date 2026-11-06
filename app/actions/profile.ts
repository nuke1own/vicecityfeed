"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AVATAR_TYPES,
  avatarFileSchema,
  bioSchema,
  displayNameSchema,
  emailSchema,
  handleSchema,
} from "@/lib/community-validation";
import { sniffImageType } from "@/lib/image-sniff";
import { getCurrentProfile, isHandleTaken, profileHref, type Profile } from "@/lib/profiles";
import { SESSION_ONLY_COOKIE } from "@/lib/session-cookie";
import { SITE } from "@/lib/site";
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

export async function updateAvatar(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const profile = await requireProfile();
  const upload = formData.get("avatar");
  const file = avatarFileSchema.safeParse(upload);
  if (!file.success || !(upload instanceof File)) {
    return { status: "error", message: file.error?.issues[0].message ?? "Choose an image." };
  }
  const bytes = new Uint8Array(await upload.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { status: "error", message: "That file is not a JPG, PNG or WebP image." };

  const supabase = await createServerSupabase();
  const path = `${profile.id}/avatar-${Date.now()}.${AVATAR_TYPES[type]}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, bytes, { contentType: type, cacheControl: "31536000" });
  if (uploadError) return { status: "error", message: "Upload failed. Please try again." };

  const avatarUrl = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
  if (error) {
    await supabase.storage.from(AVATARS_BUCKET).remove([path]);
    return { status: "error", message: "We could not save your photo. Please try again." };
  }

  const previous = avatarPath(profile.avatarUrl);
  if (previous) await supabase.storage.from(AVATARS_BUCKET).remove([previous]);
  refresh(profile.handle);
  return { status: "saved", message: "Photo updated." };
}

export async function removeAvatar(
  _prev: SettingsFormState,
  _formData: FormData,
): Promise<SettingsFormState> {
  void _prev;
  void _formData;
  const profile = await requireProfile();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
  if (error) return { status: "error", message: "We could not remove your photo." };
  const previous = avatarPath(profile.avatarUrl);
  if (previous) await supabase.storage.from(AVATARS_BUCKET).remove([previous]);
  refresh(profile.handle);
  return { status: "saved", message: "Photo removed." };
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

  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  revalidatePath(profileHref(profile.handle));
  redirect("/?account=deleted");
}

