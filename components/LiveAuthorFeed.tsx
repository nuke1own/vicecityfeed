"use client";

import { SectionFeed } from "@/components/SectionFeed";
import { getAuthorSlug } from "@/lib/authors";
import type { FeedArticle } from "@/lib/types";

type LiveAuthorFeedProps = {
  authorSlug: string;
  articles: FeedArticle[];
};

export function LiveAuthorFeed({ authorSlug, articles }: LiveAuthorFeedProps) {
  const live = articles;
  const filtered = live.filter(
    (article) => getAuthorSlug(article.author) === authorSlug,
  );
  return <SectionFeed articles={filtered} />;
}
