"use client";

import Link from "next/link";
import { SectionFeed } from "@/components/SectionFeed";
import { ctaPillClass } from "@/components/pills";
import { useHasHydrated, useSavedStories } from "@/lib/saved";
import type { FeedArticle } from "@/lib/types";

type SavedFeedProps = {
  articles: FeedArticle[];
};

export function SavedFeed({ articles }: SavedFeedProps) {
  const { slugs } = useSavedStories();
  const ready = useHasHydrated();
  const live = articles;

  const saved = slugs
    .map((slug) => live.find((article) => article.slug === slug))
    .filter((article): article is FeedArticle => Boolean(article));

  if (!ready) {
    return <p className="sr-only">Loading saved stories</p>;
  }

  if (saved.length === 0) {
    return (
      <div className="min-h-[40vh] py-6" data-saved-empty="true">
        <p className="text-lg font-bold text-white">Nothing saved yet</p>
        <Link href="/" className={ctaPillClass("white", "mt-5")}>
          Back home
        </Link>
      </div>
    );
  }

  return <SectionFeed articles={saved} />;
}
