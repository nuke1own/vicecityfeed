"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  communityPostSchema,
  pollSchema,
  pollVoteSchema,
  POST_IMAGE_BYTES,
  POST_IMAGE_MAX,
  POST_IMAGE_TYPES,
  postImageMetaSchema,
  reportSchema,
} from "@/lib/community-validation";
import { sniffImageType } from "@/lib/image-sniff";
import { getCurrentProfile, getCurrentUser, profileHref } from "@/lib/profiles";
import { getTimeline } from "@/lib/social";
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

const POST_IMAGES_BUCKET = "post-images";

type ImageUpload = { bytes: Uint8Array; type: keyof typeof POST_IMAGE_TYPES; alt: string; width: number | null; height: number | null };

/** Validates attached images: real type from the bytes, size, count and descriptions. */
async function readImages(formData: FormData, handle: string): Promise<ImageUpload[] | string> {
  const files = formData.getAll("image").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length > POST_IMAGE_MAX) return `Posts can have at most ${POST_IMAGE_MAX} images.`;
  const alts = formData.getAll("imageAlt");
  const widths = formData.getAll("imageWidth");
  const heights = formData.getAll("imageHeight");
  const uploads: ImageUpload[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > POST_IMAGE_BYTES) return "Images can be at most 5 MB each.";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) return "Images must be JPG, PNG, WebP or GIF.";
    const meta = postImageMetaSchema.safeParse({
      alt: typeof alts[index] === "string" ? alts[index] : "",
      width: Number(widths[index]) || null,
      height: Number(heights[index]) || null,
    });
    if (!meta.success) return meta.error.issues[0].message;
    uploads.push({ bytes, type, alt: meta.data.alt || `Image shared by @${handle}`, width: meta.data.width, height: meta.data.height });
  }
  return uploads;
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

  // Optional poll (top-level posts only) or images, never both.
  const pollOptions = formData.getAll("pollOption").filter((value): value is string => typeof value === "string");
  const poll = pollOptions.length && !replyTo ? pollSchema.safeParse({ options: pollOptions, days: text(formData, "pollDays") }) : null;
  if (poll && !poll.success) return { status: "error", message: poll.error.issues[0].message };
  const images = await readImages(formData, profile.handle);
  if (typeof images === "string") return { status: "error", message: images };
  if (poll?.success && images.length) return { status: "error", message: "A post can have images or a poll, not both." };

  const supabase = await createServerSupabase();

  // Upload images first, into the member's own folder in our storage.
  const uploaded: { path: string; url: string; image: ImageUpload }[] = [];
  for (const image of images) {
    const path = `${profile.id}/${crypto.randomUUID()}.${POST_IMAGE_TYPES[image.type]}`;
    const { error } = await supabase.storage
      .from(POST_IMAGES_BUCKET)
      .upload(path, image.bytes, { contentType: image.type, cacheControl: "31536000" });
    if (error) {
      if (uploaded.length) await supabase.storage.from(POST_IMAGES_BUCKET).remove(uploaded.map((u) => u.path));
      return { status: "error", message: "An image did not upload. Please try again." };
    }
    uploaded.push({ path, url: supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl, image });
  }

  const { data: created, error } = await supabase
    .from("community_posts")
    .insert({ author_id: profile.id, body: parsed.data.body, reply_to: parsed.data.replyTo ?? null })
    .select("id")
    .single();

  async function rollback(message: string): Promise<PostFormState> {
    if (created?.id) await supabase.from("community_posts").delete().eq("id", created.id);
    if (uploaded.length) await supabase.storage.from(POST_IMAGES_BUCKET).remove(uploaded.map((u) => u.path));
    return { status: "error", message };
  }

  if (error || !created) return rollback(describe(error));

  if (uploaded.length) {
    const { error: imageError } = await supabase.from("post_images").insert(
      uploaded.map((u, position) => ({
        post_id: created.id,
        url: u.url,
        alt: u.image.alt,
        width: u.image.width,
        height: u.image.height,
        position,
      })),
    );
    if (imageError) return rollback("Your images could not be saved. Please try again.");
  }

  if (poll?.success) {
    const endsAt = new Date(Date.now() + poll.data.days * 86_400_000).toISOString();
    const { error: pollError } = await supabase
      .from("polls")
      .insert({ post_id: created.id, options: poll.data.options, ends_at: endsAt });
    if (pollError) return rollback("Your poll could not be saved. Please try again.");
  }

  revalidatePath("/social");
  revalidatePath(profileHref(profile.handle));
  if (parsed.data.replyTo) revalidatePath(`/social/post/${parsed.data.replyTo}`);
  if (formData.get("redirectTo") === "social") redirect("/social/");
  return { status: "posted", postedAt: Date.now() };
}

export async function votePoll(
  postId: string,
  option: number,
): Promise<{ ok: boolean; reason?: "signed-out" | "closed" }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, reason: "signed-out" };
  const parsed = pollVoteSchema.safeParse({ postId, option });
  if (!parsed.success) return { ok: false };
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("poll_votes")
    .insert({ post_id: parsed.data.postId, user_id: profile.id, option_index: parsed.data.option });
  if (error) return { ok: false, reason: error.message.includes("poll_closed") ? "closed" : undefined };
  revalidatePath(`/social/post/${parsed.data.postId}`);
  return { ok: true };
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

const pageInput = z.object({
  feed: z.enum(["all", "following"]),
  before: z.iso.datetime({ offset: true }),
  tag: z.string().regex(/^[a-z0-9_]{2,30}$/).nullable(),
});

/** Next page of the timeline for endless scrolling. */
export async function loadMorePosts(feed: string, before: string, tag: string | null) {
  const parsed = pageInput.safeParse({ feed, before, tag });
  if (!parsed.success) return { posts: [], nextCursor: null };
  const user = await getCurrentUser();
  return getTimeline({
    feed: parsed.data.feed === "following" && user ? "following" : "all",
    before: parsed.data.before,
    tag: parsed.data.tag,
    viewerId: user?.id ?? null,
  });
}
