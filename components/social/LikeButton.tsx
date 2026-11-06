"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { setLike } from "@/app/actions/social";
import { useViewerLiked } from "@/components/social/ViewerLikes";
import { useAccount } from "@/lib/use-account";

export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const router = useRouter();
  const { userId } = useAccount();
  const [, startTransition] = useTransition();
  // On cached pages the server cannot know the viewer; ViewerLikes fills it in.
  const known = useViewerLiked(postId);
  const baseLiked = known ?? liked;
  const baseCount = count + (known === true && !liked ? 1 : 0);
  const [state, setOptimistic] = useOptimistic({ liked: baseLiked, count: baseCount });

  function toggle() {
    if (!userId) {
      router.push("/login/?next=/social/");
      return;
    }
    const next = !state.liked;
    startTransition(async () => {
      setOptimistic({ liked: next, count: state.count + (next ? 1 : -1) });
      await setLike(postId, next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.liked}
      data-liked={state.liked ? "true" : "false"}
      aria-label={`${state.liked ? "Unlike" : "Like"}, ${state.count} ${state.count === 1 ? "like" : "likes"}`}
      className={`group relative z-10 inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-white ${
        state.liked ? "text-[#ff5c8a]" : "text-white/70 hover:text-[#ff5c8a]"
      }`}
    >
      <Heart aria-hidden className="heart-icon size-[18px]" fill={state.liked ? "currentColor" : "none"} strokeWidth={2} />
      <span className="tabular-nums">{state.count > 0 ? state.count : ""}</span>
    </button>
  );
}
