import "server-only";
import { cache } from "react";
import { createServerSupabase, getAnonServerSupabase } from "./supabase-server";

export type ProfileRole = "member" | "moderator" | "editor" | "admin";

export type Profile = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  role: ProfileRole;
  createdAt: string;
};

export type ProfileStats = {
  followers: number;
  following: number;
  posts: number;
};

type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  created_at: string;
};

const PROFILE_COLUMNS = "id, handle, display_name, bio, avatar_url, role, created_at";

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio ?? "",
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
  };
}

/** The signed-in user (verified with Supabase Auth), or null. */
export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  return data ? toProfile(data as ProfileRow) : null;
});

/** Public profile lookup. Uses the anon client so profile pages stay cacheable. */
export const getProfileByHandle = cache(
  async (handle: string): Promise<Profile | null> => {
    const normalized = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalized)) return null;
    const supabase = getAnonServerSupabase();
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("handle", normalized)
      .maybeSingle();
    return data ? toProfile(data as ProfileRow) : null;
  },
);

/** Public profile counts. Uses the anon client so profile pages stay cacheable. */
export async function getProfileStats(profileId: string): Promise<ProfileStats> {
  const supabase = getAnonServerSupabase();
  const count = async (
    table: string,
    column: string,
    extra?: { column: string; value: boolean },
  ) => {
    let query = supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, profileId);
    if (extra) query = query.eq(extra.column, extra.value);
    const { count: total } = await query;
    return total ?? 0;
  };
  const [followers, following, posts] = await Promise.all([
    count("profile_follows", "following_id"),
    count("profile_follows", "follower_id"),
    count("community_posts", "author_id", { column: "hidden", value: false }),
  ]);
  return { followers, following, posts };
}

export async function isHandleTaken(
  handle: string,
  exceptProfileId?: string,
): Promise<boolean> {
  const supabase = await createServerSupabase();
  let query = supabase.from("profiles").select("id").eq("handle", handle.toLowerCase());
  if (exceptProfileId) query = query.neq("id", exceptProfileId);
  const { data } = await query.limit(1);
  return Boolean(data && data.length > 0);
}

export function profileHref(handle: string): string {
  return `/u/${handle}/`;
}
