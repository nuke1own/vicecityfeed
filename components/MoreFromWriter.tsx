import { ArticleCard } from "@/components/ArticleCard";
import type { FeedArticle } from "@/lib/types";

type MoreFromWriterProps = {
  name: string;
  articles: FeedArticle[];
};

export function MoreFromWriter({ name, articles }: MoreFromWriterProps) {
  const stories = articles.slice(0, 2);
  if (stories.length === 0) return null;

  return (
    <section
      aria-labelledby="writer-heading"
      data-more-from={name}
      className="mx-auto mt-14 max-w-7xl sm:mt-20"
    >
      <h2
        id="writer-heading"
        className="font-display mb-6 text-2xl font-extrabold tracking-tight text-white sm:mb-8 md:text-3xl"
      >
        More from {name}
      </h2>
      <div className="grid items-start gap-6 sm:grid-cols-2 sm:gap-8">
        {stories.map((article) => (
          <ArticleCard
            key={article.slug}
            article={article}
            readingTimeMinutes={article.readingTimeMinutes}
          />
        ))}
      </div>
    </section>
  );
}
