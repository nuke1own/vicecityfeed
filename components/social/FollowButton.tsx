"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setFollow } from "@/app/actions/social";
import { getSupabase } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";

type FollowButtonProps = {
  profileId: string;
  handle: string;
  /** Known state from the server, if any. Otherwise it is looked up. */
  initialFollowing?: boolean;
  size?: "sm" | "md";
};

export function FollowButton({ profileId, handle, initialFollowing, size = "md" }: FollowButtonProps) {
  const router = useRouter();
  const { userId } = useAccount();
  const [following, setFollowing] = useState<boolean | null>(initialFollowing ?? null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialFollowing !== undefined) return;
    const supabase = getSupabase();
    if (!supabase || !userId || userId === profileId) return;
    let cancelled = false;
    supabase
      .from("profile_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("following_id", profileId)
      .then(({ count }) => {
        if (!cancelled) setFollowing((count ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, profileId, initialFollowing]);

  const base = `inline-flex items-center justify-center rounded-full font-bold transition-colors disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
    size === "sm" ? "min-h-11 min-w-[5.5rem] px-4 text-sm" : "min-h-11 min-w-28 px-5 text-sm"
  }`;

  if (userId === profileId) return null;
  if (!userId) {
    return (
      <Link href={`/login/?next=${encodeURIComponent(`/u/${handle}/`)}`} className={`${base} bg-white text-black hover:bg-vice-pink hover:text-accent-ink`}>
        Follow
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={Boolean(following)}
      aria-label={`${following ? "Unfollow" : "Follow"} @${handle}`}
      onClick={() => {
        const target = !following;
        setFollowing(target);
        startTransition(async () => {
          const result = await setFollow(profileId, target);
          if (!result.ok) setFollowing(!target);
          router.refresh();
        });
      }}
      className={`${base} ${
        following
          ? "border border-white/30 text-white hover:border-[#ff8a8a] hover:text-[#ff8a8a]"
          : "bg-white text-black hover:bg-vice-pink hover:text-accent-ink"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
