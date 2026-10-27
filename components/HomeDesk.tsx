"use client";

import { ContinueReading } from "@/components/ContinueReading";
import { EmptyFeed } from "@/components/EmptyStories";
import { Hero } from "@/components/Hero";
import { WireFeed } from "@/components/WireFeed";
import { articleOnPage } from "@/lib/publish-pages";
import { usePublishedArticles } from "@/lib/use-published-articles";
import type { ArticleMeta, FeedArticle } from "@/lib/types";

type HomeDeskProps = {
  lead?: ArticleMeta;
  articles: FeedArticle[];
};

export function HomeDesk({ lead, articles }: HomeDeskProps) {
  const live = usePublishedArticles(articles).filter((article) =>
    articleOnPage(article, "feed"),
  );
  const liveLead =
    live.find((article) => article.heroRank === 1) ??
    live.find((article) => article.featured) ??
    live[0] ??
    (lead && articleOnPage(lead, "feed") ? lead : undefined);

  if (!liveLead) {
    return (
      <section
        id="desk"
        aria-labelledby="hero-heading"
        className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16"
      >
        <EmptyFeed />
      </section>
    );
  }

  return (
    <>
      <ContinueReading articles={live} />
      <Hero article={liveLead} />
      <section
        id="desk"
        aria-label="Stories"
        className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-6"
      >
        <WireFeed
          articles={live}
          syncWithUrl
          shareLeadCover={false}
        />
      </section>
    </>
  );
}
