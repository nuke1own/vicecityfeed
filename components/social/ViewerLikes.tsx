"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";

const LikedContext = createContext<Set<string> | null>(null);

/**
 * For cached pages (public profiles) that cannot know the viewer: loads which
 * of the listed posts the signed-in viewer has liked, in one request.
 */
export function ViewerLikes({ postIds, children }: { postIds: string[]; children: ReactNode }) {
  const { userId } = useAccount();
  const [liked, setLiked] = useState<Set<string> | null>(null);
  const key = postIds.join(",");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId || !key) return;
    let cancelled = false;
    supabase
      .from("post_reactions")
      .select("post_id")
      .eq("user_id", userId)
      .eq("reaction", "like")
      .in("post_id", key.split(","))
      .then(({ data }) => {
        if (!cancelled) setLiked(new Set((data ?? []).map((row) => row.post_id as string)));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, key]);

  return <LikedContext.Provider value={liked}>{children}</LikedContext.Provider>;
}

/** Whether the viewer liked a post, if a ViewerLikes provider knows. */
export function useViewerLiked(postId: string): boolean | null {
  const set = useContext(LikedContext);
  return set ? set.has(postId) : null;
}
