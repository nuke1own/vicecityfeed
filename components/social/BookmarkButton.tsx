"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { setBookmark } from "@/app/actions/social";
import { useAccount } from "@/lib/use-account";

/** Private bookmark: only the member sees what they saved (Social > Bookmarks). */
export function BookmarkButton({ postId, bookmarked }: { postId: string; bookmarked: boolean }) {
  const router = useRouter();
  const { userId } = useAccount();
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useOptimistic(bookmarked);

  return (
    <button
      type="button"
      onClick={() => {
        if (!userId) {
          router.push("/login/?next=/social/");
          return;
        }
        const next = !saved;
        startTransition(async () => {
          setSaved(next);
          await setBookmark(postId, next);
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
