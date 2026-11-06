"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { setBookmark } from "@/app/actions/social";

/** Private bookmark: only the member sees what they saved (Social > Bookmarks). */
export function BookmarkButton({ postId, bookmarked }: { postId: string; bookmarked: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useOptimistic(bookmarked);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !saved;
        startTransition(async () => {
          setSaved(next);
          const result = await setBookmark(postId, next);
          if (result.reason === "signed-out") {
            router.push(`/login/?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }
          router.refresh();
        });
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove bookmark" : "Bookmark"}
      className={`relative z-10 inline-flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-white ${
        saved ? "text-vice-pink" : "text-white/70 hover:bg-white/5 hover:text-vice-pink"
      }`}
    >
      <Bookmark aria-hidden className="size-[18px]" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
