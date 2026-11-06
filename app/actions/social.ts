"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { communityPostSchema, reportSchema } from "@/lib/community-validation";
import { getCurrentProfile, profileHref } from "@/lib/profiles";
import { createServerSupabase } from "@/lib/supabase-server";

export type PostFormState = {
  status: "idle" | "error" | "posted";
  message?: string;
  /** Changes on every successful post so the composer can reset. */
  postedAt?: number;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function describe(error: { message?: string; code?: string } | null): string {
  const message = error?.message ?? "";
  if (message.includes("rate_limited")) return "You are posting too fast. Wait a minute and try again.";
  if (message.includes("reply_target_missing")) return "That post is no longer available.";
  return "Something went wrong. Please try again.";
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login/?next=/social/");

  const replyTo = text(formData, "replyTo") || null;
  const parsed = communityPostSchema.safeParse({ body: text(formData, "body"), replyTo });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("community_posts").insert({
    author_id: profile.id,
    body: parsed.data.body,
    reply_to: parsed.data.replyTo ?? null,
  });
  if (error) return { status: "error", message: describe(error) };

  revalidatePath("/social");
  revalidatePath(profileHref(profile.handle));
  if (parsed.data.replyTo) revalidatePath(`/social/post/${parsed.data.replyTo}`);
  if (formData.get("redirectTo") === "social") redirect("/social/");
  return { status: "posted", postedAt: Date.now() };
}

const idSchema = z.uuid();

export async function deletePost(postId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile || !idSchema.safeParse(postId).success) return { ok: false };
  const supabase = await createServerSupabase();
  // RLS allows only the author (or staff) to delete.
  const { error, count } = await supabase
    .from("community_posts")
    .delete({ count: "exact" })
    .eq("id", postId);
  if (error || !count) return { ok: false };
  revalidatePath("/social");
  revalidatePath(profileHref(profile.handle));
  return { ok: true };
}

type ReactionResult = { ok: boolean; reason?: "signed-out" };

export async function setLike(postId: string, like: boolean): Promise<ReactionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, reason: "signed-out" };
  if (!idSchema.safeParse(postId).success) return { ok: false };
  const supabase = await createServerSupabase();
  const { error } = like
    ? await supabase
        .from("post_reactions")
        .upsert(
          { post_id: postId, user_id: profile.id, reaction: "like" },
          { onConflict: "post_id,user_id,reaction", ignoreDuplicates: true },
        )
    : await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", profile.id)
        .eq("reaction", "like");
  return { ok: !error };
}

export async function setFollow(
  profileId: string,
  follow: boolean,
): Promise<{ ok: boolean; reason?: "signed-out" }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, reason: "signed-out" };
  if (!idSchema.safeParse(profileId).success || profileId === profile.id) return { ok: false };
  const supabase = await createServerSupabase();
  const { error } = follow
    ? await supabase
        .from("profile_follows")
        .upsert(
          { follower_id: profile.id, following_id: profileId },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("profile_follows")
        .delete()
        .eq("follower_id", profile.id)
        .eq("following_id", profileId);
  if (!error) revalidatePath("/social");
  return { ok: !error };
}

export async function reportPost(postId: string, reason: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  const parsed = reportSchema.safeParse({ postId, reason });
  if (!profile || !parsed.success) return { ok: false };
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("post_reports").upsert(
    { post_id: parsed.data.postId, reporter_id: profile.id, reason: parsed.data.reason },
    { onConflict: "post_id,reporter_id", ignoreDuplicates: true },
  );
  return { ok: !error };
}

export async function setBookmark(postId: string, bookmark: boolean): Promise<ReactionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, reason: "signed-out" };
  if (!idSchema.safeParse(postId).success) return { ok: false };
  const supabase = await createServerSupabase();
  const { error } = bookmark
    ? await supabase
        .from("post_reactions")
        .upsert(
          { post_id: postId, user_id: profile.id, reaction: "bookmark" },
          { onConflict: "post_id,user_id,reaction", ignoreDuplicates: true },
        )
    : await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", profile.id)
        .eq("reaction", "bookmark");
  if (!error) revalidatePath("/social/bookmarks");
  return { ok: !error };
}

export async function markNotificationsRead(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createServerSupabase();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .is("read_at", null);
}
