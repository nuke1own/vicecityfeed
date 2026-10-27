"use client";

import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { useLatestInProgress } from "@/lib/reading";
import type { ArticleMeta } from "@/lib/types";

type ContinueReadingProps = {
  articles: ArticleMeta[];
};

export function ContinueReading({ articles }: ContinueReadingProps) {
  const latest = useLatestInProgress();
  if (!latest) return null;
  const article = articles.find((item) => item.slug === latest.slug);
  if (!article) return null;

  return (
    <aside
      data-continue-reading={article.slug}
      data-continue-percent={latest.percent}
      className="mx-auto max-w-7xl px-4 pt-3 pb-1 md:px-6"
    >
      <Link
        href={`/posts/${article.slug}`}
        className="tap-press flex items-center gap-3 rounded-2xl bg-surface p-2.5 text-white transition-colors hover:bg-raised sm:bg-transparent sm:p-0 sm:hover:bg-transparent"
      >
        <div className="relative aspect-video w-[4.5rem] shrink-0 overflow-hidden rounded-lg md:w-24">
            <StoryCover
              article={article}
              share={false}
              className="h-full w-full"
            />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white uppercase">
            Continue
          </p>
          <p className="font-display mt-1 truncate text-sm font-extrabold tracking-tight text-white md:text-base">
            {article.title}
          </p>
          <p className="mt-0.5 text-xs font-medium tabular-nums text-white">
            {latest.percent}% read
          </p>
        </div>
      </Link>
    </aside>
  );
}
