import "server-only";
import { cache } from "react";
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
  bookmarked: boolean;
  images: PostImage[];
  poll: PostPoll | null;
};

export type PostImage = { url: string; alt: string; width: number | null; height: number | null };

export type PostPoll = {
  options: string[];
  endsAt: string;
  /** Votes per option, same order as options. */
  counts: number[];
  /** The viewer's choice, if they voted. */
  myVote: number | null;
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
  bookmarked?: boolean;
  images?: PostImage[] | null;
  poll?: { options: string[]; endsAt: string; counts: number[] | null; myVote: number | null } | null;
};

export const PAGE_SIZE = 20;

/** Demo posts for browser tests only (VCF_UI_PREVIEW=1 and Supabase unreachable). */
const previewData = (): SocialPost[] => [
  {
    id: "00000000-0000-4000-8000-000000000001",
    body: "Counting down to Leonida. Who else is taking the week off? #GTA6",
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
    bookmarked: false,
    images: [],
    poll: {
      options: ["Jason", "Lucia", "Both, obviously"],
      endsAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      counts: [14, 22, 31],
      myVote: null,
    },
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    body: "New trailer breakdown is up in Articles. The Keys look unreal. @lucia_vc #Trailer3",
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
    bookmarked: true,
    images: [
      { url: "/avatars/jason-and-lucia.webp", alt: "Jason and Lucia at sunset", width: 512, height: 512 },
      { url: "/avatars/lucia.webp", alt: "Lucia in Vice City", width: 512, height: 512 },
    ],
    poll: null,
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
    bookmarked: Boolean(row.bookmarked),
    images: Array.isArray(row.images) ? row.images : [],
    poll: row.poll
      ? {
          options: row.poll.options,
          endsAt: row.poll.endsAt,
          counts: row.poll.options.map((_, index) => Number(row.poll?.counts?.[index] ?? 0)),
          myVote: typeof row.poll.myVote === "number" ? row.poll.myVote : null,
        }
      : null,
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
  /** Lowercase hashtag without "#", already validated. */
  tag?: string | null;
}): Promise<PostPage> {
  const supabase = await createServerSupabase();
  let query = supabase.from("post_feed").select("*").is("reply_to", null);
  if (options.tag) query = query.ilike("body", `%#${options.tag.replace(/_/g, "\\_")}%`);

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
  const preview = error && options.feed === "all" && !options.before && !options.tag ? previewPosts() : null;
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

export const HASHTAG_PATTERN = /^[a-z0-9_]{2,30}$/;

export type TrendingTag = { tag: string; posts: number };

export const getTrendingTags = cache(async function getTrendingTags(): Promise<TrendingTag[]> {
  const { data, error } = await getAnonServerSupabase().rpc("trending_hashtags", { p_days: 7, p_limit: 8 });
  if (error) {
    return process.env.VCF_UI_PREVIEW === "1"
      ? [
          { tag: "gta6", posts: 24 },
          { tag: "leonida", posts: 11 },
          { tag: "trailer3", posts: 7 },
          { tag: "vicecity", posts: 5 },
        ]
      : [];
  }
  return ((data ?? []) as { tag: string; posts: number | string }[]).map((row) => ({
    tag: row.tag,
    posts: Number(row.posts) || 0,
  }));
});

export type SuggestedMember = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  isStaff: boolean;
};

/** Newest members the viewer does not follow yet (staff first). */
export const getWhoToFollow = cache(async function getWhoToFollow(viewerId: string | null, limit = 4): Promise<SuggestedMember[]> {
  const supabase = await createServerSupabase();
  let exclude: string[] = [];
  if (viewerId) {
    const { data: follows } = await supabase
      .from("profile_follows")
      .select("following_id")
      .eq("follower_id", viewerId);
    exclude = [viewerId, ...(follows ?? []).map((row) => row.following_id as string)];
  }
  let query = supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, bio, role")
    .order("created_at", { ascending: false })
    .limit(limit + 8);
  if (exclude.length) query = query.not("id", "in", `(${exclude.join(",")})`);
  const { data, error } = await query;
  if (error) {
    return process.env.VCF_UI_PREVIEW === "1"
      ? [
          { id: "00000000-0000-4000-8000-0000000000b1", handle: "cal_h", displayName: "Cal", avatarUrl: "/avatars/cal-hampton.webp", bio: "Conspiracy desk.", isStaff: false },
          { id: "00000000-0000-4000-8000-0000000000b2", handle: "boobie", displayName: "Boobie", avatarUrl: "/avatars/boobie-ike.webp", bio: "Vice City nights.", isStaff: false },
          { id: "00000000-0000-4000-8000-0000000000b3", handle: "desk", displayName: "Vice City Feed Desk", avatarUrl: "/avatars/jason-and-lucia.webp", bio: "Official news.", isStaff: true },
        ]
      : [];
  }
  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      handle: row.handle as string,
      displayName: row.display_name as string,
      avatarUrl: row.avatar_url as string | null,
      bio: (row.bio as string | null) ?? "",
      isStaff: row.role === "editor" || row.role === "admin",
    }))
    .sort((a, b) => Number(b.isStaff) - Number(a.isStaff))
    .slice(0, limit);
});

export const getMemberCount = cache(async function getMemberCount(): Promise<number> {
  const { count } = await getAnonServerSupabase()
    .from("profiles")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
});

/** Escape LIKE wildcards in user search text. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function getBookmarks(viewerId: string): Promise<SocialPost[]> {
  const supabase = await createServerSupabase();
  const { data: rows } = await supabase
    .from("post_reactions")
    .select("post_id")
    .eq("user_id", viewerId)
    .eq("reaction", "bookmark")
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (rows ?? []).map((row) => row.post_id as string);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("post_feed").select("*").in("id", ids);
  const byId = new Map(((data ?? []) as PostRow[]).map((row) => [row.id, toPost(row)]));
  return ids.map((id) => byId.get(id)).filter((post): post is SocialPost => Boolean(post));
}

export async function searchPosts(query: string): Promise<SocialPost[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("post_feed")
    .select("*")
    .ilike("body", likePattern(query))
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) {
    return (previewPosts() ?? []).filter((post) => post.body.toLowerCase().includes(query.toLowerCase()));
  }
  return ((data ?? []) as PostRow[]).map(toPost);
}

/**
 * PostgREST `or=(...)` filters use commas, brackets and quotes as syntax, so
 * those characters in a search (e.g. "Smith, John") would split it into extra
 * filters. Treat them as spaces.
 */
function orFilterText(text: string): string {
  return text.replace(/[,()"\\]/g, " ").replace(/\s+/g, " ").trim();
}

export async function searchPeople(query: string): Promise<SuggestedMember[]> {
  const safe = orFilterText(query);
  if (!safe) return [];
  const supabase = await createServerSupabase();
  const pattern = likePattern(safe);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, bio, role")
    .or(`handle.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(20);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id as string,
    handle: row.handle as string,
    displayName: row.display_name as string,
    avatarUrl: row.avatar_url as string | null,
    bio: (row.bio as string | null) ?? "",
    isStaff: row.role === "editor" || row.role === "admin",
  }));
}

export type TopCreator = SuggestedMember & { posts: number; likes: number };

export const getTopCreators = cache(async function getTopCreators(): Promise<TopCreator[]> {
  const { data, error } = await getAnonServerSupabase().rpc("top_creators", { p_days: 7, p_limit: 5 });
  if (error) {
    return process.env.VCF_UI_PREVIEW === "1"
      ? [
          { id: "00000000-0000-4000-8000-0000000000a1", handle: "lucia_vc", displayName: "Lucia", avatarUrl: "/avatars/lucia.webp", bio: "", isStaff: false, posts: 14, likes: 210 },
          { id: "00000000-0000-4000-8000-0000000000b2", handle: "boobie", displayName: "Boobie", avatarUrl: "/avatars/boobie-ike.webp", bio: "", isStaff: false, posts: 9, likes: 96 },
        ]
      : [];
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    handle: row.handle as string,
    displayName: row.display_name as string,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    bio: "",
    isStaff: row.role === "editor" || row.role === "admin",
    posts: Number(row.posts) || 0,
    likes: Number(row.likes) || 0,
  }));
});

/** A different GTA VI question each day, for the "Question of the day" card. */
const QUESTIONS = [
  "Jason or Lucia: who are you playing first?",
  "What is the first thing you will do in Vice City?",
  "Which Leonida area do you want to explore most?",
  "What car are you stealing first?",
  "Which radio station genre do you need in GTA VI?",
  "What feature from older GTA games must come back?",
  "Day one: story mode or exploring?",
  "Best GTA VI trailer moment so far?",
  "Which side activity are you most hyped for?",
  "Beach house, penthouse or swamp shack?",
];

export function questionOfTheDay(date = new Date()): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return QUESTIONS[day % QUESTIONS.length];
}
