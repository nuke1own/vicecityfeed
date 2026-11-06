"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { startConversation } from "@/app/actions/messages";
import { setFollow } from "@/app/actions/social";
import { outlinePillClass } from "@/components/pills";
import { getSupabase } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";

/** Edit profile for the owner; Follow and Message for everyone else. */
export function ProfileActions({ profileId, handle }: { profileId: string; handle: string }) {
  const router = useRouter();
  const { userId } = useAccount();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
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
  }, [userId, profileId]);

  if (userId === profileId) {
    return (
      <Link href="/settings/profile/" className={outlinePillClass("px-4 text-sm font-semibold")}>
        Edit profile
      </Link>
    );
  }

  const next = `/u/${handle}/`;

  if (!userId) {
    return (
      <div className="flex gap-2">
        <Link href={`/login/?next=${encodeURIComponent(next)}`} className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-black hover:bg-vice-pink hover:text-accent-ink">
          Follow
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <form action={startConversation.bind(null, profileId)}>
        <button type="submit" aria-label={`Message @${handle}`} className={outlinePillClass("size-11")}>
          <Mail aria-hidden className="size-5" />
        </button>
      </form>
      <button
        type="button"
        disabled={pending || following === null}
        aria-pressed={Boolean(following)}
        onClick={() => {
          const target = !following;
          setFollowing(target);
          startTransition(async () => {
            const result = await setFollow(profileId, target);
            if (!result.ok) setFollowing(!target);
            router.refresh();
          });
        }}
        className={`inline-flex min-h-11 min-w-28 items-center justify-center rounded-full px-5 text-sm font-bold transition-colors disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          following
            ? "border border-white/30 text-white hover:border-[#ff8a8a] hover:text-[#ff8a8a]"
            : "bg-white text-black hover:bg-vice-pink hover:text-accent-ink"
        }`}
      >
        {following === null ? "Follow" : following ? "Following" : "Follow"}
      </button>
    </div>
  );
}
