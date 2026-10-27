"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { EmptyStories } from "@/components/EmptyStories";
import { ctaPillClass } from "@/components/pills";
import { filterArticlesByCategory } from "@/lib/filters";
import type { CategorySlug, FeedArticle } from "@/lib/types";

const VALID: CategorySlug[] = [
  "all",
  "leaks-news",
  "map-lore",
  "vehicles-guns",
  "guides",
  "media",
  "hardware",
];

type WireFeedProps = {
  articles: FeedArticle[];
  initialCategory?: CategorySlug;
  syncWithUrl?: boolean;
  heading?: string;
  headingId?: string;
  shareLeadCover?: boolean;
};

function categoryFromParam(value: string | null): CategorySlug | null {
  if (value && VALID.includes(value as CategorySlug)) {
    return value as CategorySlug;
  }
  return null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function storyCountLabel(count: number) {
  return `${count} ${count === 1 ? "story" : "stories"}`;
}

function WireFeedInner({
  articles,
  initialCategory = "all",
  syncWithUrl = false,
  heading,
  headingId = "wire-heading",
  shareLeadCover = true,
}: WireFeedProps) {
  const searchParams = useSearchParams();
  const fromUrl = syncWithUrl ? categoryFromParam(searchParams.get("cat")) : null;
  const [category, setCategory] = useState<CategorySlug>(
    fromUrl ?? initialCategory,
  );
  const filtered = useMemo(
    () => filterArticlesByCategory(articles, category),
    [articles, category],
  );
  const [phase, setPhase] = useState<"in" | "out">("in");
  const fadeRef = useRef<number>(0);

  function selectCategory(next: CategorySlug) {
    if (next === category) return;
    if (prefersReducedMotion()) {
      setCategory(next);
      return;
    }
    setPhase("out");
    window.clearTimeout(fadeRef.current);
    fadeRef.current = window.setTimeout(() => {
      setCategory(next);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("in"));
      });
    }, 200);
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-8">
      {heading ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id={headingId}
            className="reveal font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl"
          >
            {heading}
          </h2>
          <p
            className="text-sm font-medium text-white"
            aria-live="polite"
            data-story-count={filtered.length}
          >
            {storyCountLabel(filtered.length)}
          </p>
        </div>
      ) : null}
      <CategoryFilter active={category} onSelect={selectCategory} />
      {filtered.length === 0 ? (
        <div className="py-6">
          <EmptyStories />
          {articles.length > 0 && category !== "all" ? (
            <button
              type="button"
              className={ctaPillClass("white", "mt-5")}
              onClick={() => selectCategory("all")}
            >
              Back to All
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className="feed-fade reveal-stagger grid items-start gap-x-6 gap-y-7 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4"
          data-phase={phase}
        >
          {filtered.map((article, index) => (
            <div
              key={article.slug}
              className={index === 0 ? "sm:col-span-2" : undefined}
            >
              <ArticleCard
                article={article}
                featured={index === 0}
                readingTimeMinutes={article.readingTimeMinutes}
                shareCover={index === 0 ? shareLeadCover : true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WireFeed(props: WireFeedProps) {
  return (
    <Suspense fallback={<p className="text-sm text-white">Loading stories…</p>}>
      <WireFeedInner {...props} />
    </Suspense>
  );
}
