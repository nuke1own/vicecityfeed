"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AVATAR_TYPES,
  avatarFileSchema,
  fieldErrors,
  profileUpdateSchema,
} from "@/lib/community-validation";
import { sniffImageType } from "@/lib/image-sniff";
import { getCurrentProfile, isHandleTaken, profileHref } from "@/lib/profiles";
import { createServerSupabase } from "@/lib/supabase-server";

const AVATARS_BUCKET = "avatars";

export type ProfileFormState = {
  status: "idle" | "error" | "saved";
  message?: string;
  fields?: Record<string, string>;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Storage path for an avatar URL in our bucket, or null if it is not ours. */
function avatarPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login/?next=/settings/profile/");

  const parsed = profileUpdateSchema.safeParse({
    handle: text(formData, "handle"),
    displayName: text(formData, "displayName"),
    bio: text(formData, "bio"),
    removeAvatar: formData.get("removeAvatar") === "on",
  });
  if (!parsed.success) {
    return { status: "error", fields: fieldErrors(parsed.error) };
  }
  const { handle, displayName, bio, removeAvatar } = parsed.data;

  if (handle !== profile.handle && (await isHandleTaken(handle, profile.id))) {
    return { status: "error", fields: { handle: "That handle is taken." } };
  }

  const supabase = await createServerSupabase();
  let avatarUrl = profile.avatarUrl;
  const previousPath = avatarPath(profile.avatarUrl);

  const upload = formData.get("avatar");
  if (upload instanceof File && upload.size > 0) {
    const file = avatarFileSchema.safeParse(upload);
    if (!file.success) {
      return { status: "error", fields: { avatar: file.error.issues[0].message } };
    }
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) {
      return {
        status: "error",
        fields: { avatar: "That file is not a JPG, PNG or WebP image." },
      };
    }
    const path = `${profile.id}/avatar-${Date.now()}.${AVATAR_TYPES[type]}`;
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, bytes, { contentType: type, cacheControl: "31536000" });
    if (error) {
      return { status: "error", fields: { avatar: "Upload failed. Please try again." } };
    }
    avatarUrl = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl;
  } else if (removeAvatar) {
    avatarUrl = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ handle, display_name: displayName, bio, avatar_url: avatarUrl })
    .eq("id", profile.id);
  if (error) {
    const taken = error.code === "23505";
    return {
      status: "error",
      ...(taken
        ? { fields: { handle: "That handle is taken." } }
        : { message: "We could not save your profile. Please try again." }),
    };
  }

  if (previousPath && avatarUrl !== profile.avatarUrl) {
    await supabase.storage.from(AVATARS_BUCKET).remove([previousPath]);
  }

  revalidatePath(profileHref(profile.handle));
  revalidatePath(profileHref(handle));
  revalidatePath("/settings/profile/");
  return { status: "saved", message: "Profile saved." };
}
