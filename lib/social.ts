import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, getAnonServerSupabase } from "./supabase-server";

export type SocialPost = {
  id: string;
  body: string;
  createdAt: string;
  replyTo: string | null;
  authorId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  isStaff: boolean;
  likeCount: number;
  replyCount: number;
  liked: boolean;
};

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  reply_to: string | null;
  author_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  like_count: number | string;
  reply_count: number | string;
  liked: boolean;
};

export const PAGE_SIZE = 20;

/** Demo posts for browser tests only (VCF_UI_PREVIEW=1 and Supabase unreachable). */
const previewData = (): SocialPost[] => [
  {
    id: "00000000-0000-4000-8000-000000000001",
    body: "Counting down to Leonida. Who else is taking the week off?",
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    replyTo: null,
    authorId: "00000000-0000-4000-8000-0000000000a1",
    handle: "lucia_vc",
    displayName: "Lucia",
    avatarUrl: "/avatars/lucia.webp",
    isStaff: false,
    likeCount: 12,
    replyCount: 3,
    liked: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    body: "New trailer breakdown is up in Articles. The Keys look unreal.",
    createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    replyTo: null,
    authorId: "00000000-0000-4000-8000-0000000000a2",
    handle: "desk",
    displayName: "Vice City Feed Desk",
    avatarUrl: "/avatars/jason-and-lucia.webp",
    isStaff: true,
    likeCount: 48,
    replyCount: 0,
    liked: true,
  },
];

function previewPosts(): SocialPost[] | null {
  return process.env.VCF_UI_PREVIEW === "1" ? previewData() : null;
}

function toPost(row: PostRow): SocialPost {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    replyTo: row.reply_to,
    authorId: row.author_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isStaff: row.role === "editor" || row.role === "admin",
    likeCount: Number(row.like_count) || 0,
    replyCount: Number(row.reply_count) || 0,
    liked: Boolean(row.liked),
  };
}

export type PostPage = { posts: SocialPost[]; nextCursor: string | null };

function page(rows: PostRow[] | null): PostPage {
  const posts = (rows ?? []).map(toPost);
  return {
    posts,
    nextCursor: posts.length === PAGE_SIZE ? posts[posts.length - 1].createdAt : null,
  };
}

/** Top-level posts, newest first. "following" = people the viewer follows, plus themselves. */
export async function getTimeline(options: {
  feed: "all" | "following";
  before?: string | null;
  viewerId?: string | null;
}): Promise<PostPage> {
  const supabase = await createServerSupabase();
  let query = supabase.from("post_feed").select("*").is("reply_to", null);

  if (options.feed === "following") {
    if (!options.viewerId) return { posts: [], nextCursor: null };
    const { data: follows } = await supabase
      .from("profile_follows")
      .select("following_id")
      .eq("follower_id", options.viewerId);
    const ids = [options.viewerId, ...(follows ?? []).map((row) => row.following_id as string)];
    query = query.in("author_id", ids);
  }
  if (options.before) query = query.lt("created_at", options.before);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(PAGE_SIZE);
  const preview = error && options.feed === "all" && !options.before ? previewPosts() : null;
  if (preview) return { posts: preview, nextCursor: null };
  return page(data as PostRow[] | null);
}

export async function getPost(id: string): Promise<SocialPost | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("post_feed").select("*").eq("id", id).maybeSingle();
  if (error) return previewPosts()?.find((post) => post.id === id) ?? null;
  return data ? toPost(data as PostRow) : null;
}

export async function getReplies(postId: string): Promise<SocialPost[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("post_feed")
    .select("*")
    .eq("reply_to", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  return ((data ?? []) as PostRow[]).map(toPost);
}

/** A member's own top-level posts, for their public profile (cacheable: anon client). */
export async function getAuthorPosts(
  authorId: string,
  client: SupabaseClient = getAnonServerSupabase(),
): Promise<SocialPost[]> {
  const { data } = await client
    .from("post_feed")
    .select("*")
    .eq("author_id", authorId)
    .is("reply_to", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  return ((data ?? []) as PostRow[]).map(toPost);
}
