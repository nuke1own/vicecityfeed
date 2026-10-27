import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { SaveControl } from "@/components/SaveControl";
import { ReadingMark } from "@/components/ReadingMark";
import { authorHref } from "@/lib/authors";
import { formatRelativeTime } from "@/lib/format";
import type { ArticleMeta } from "@/lib/types";

type AdjacentStoriesProps = {
  previous?: ArticleMeta;
  next?: ArticleMeta;
};

function AdjacentCard({
  label,
  article,
  align = "start",
}: {
  label: "Previous" | "Next";
  article: ArticleMeta;
  align?: "start" | "end";
}) {
  return (
    <article
      data-card-surface
      className={`group rounded-2xl bg-surface p-4 md:p-5 ${align === "end" ? "sm:justify-self-end sm:text-right" : ""}`}
    >
      <p className="text-[10px] font-semibold tracking-[0.16em] text-white uppercase">
        {label}
      </p>
      <div className="relative mt-3">
        <Link href={`/posts/${article.slug}`} className="block">
          <div className="aspect-video overflow-hidden rounded-xl">
            <StoryCover
              article={article}
              className="h-full w-full origin-center transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>
        </Link>
        <SaveControl slug={article.slug} />
      </div>
      <Link href={`/posts/${article.slug}`} className="block">
        <h3 className="font-display mt-4 text-balance break-words text-lg font-extrabold tracking-tight text-white md:text-xl">
          {article.title}
        </h3>
        {article.excerpt.trim() &&
        article.excerpt.trim().toLowerCase() !== article.title.toLowerCase() ? (
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-white">
            {article.excerpt}
          </p>
        ) : null}
      </Link>
      <p className="mt-2 text-xs font-medium tracking-wide text-white">
        <time dateTime={article.publishedAt} data-relative-time>
          {formatRelativeTime(article.publishedAt)}
        </time>
        {" · "}
        <Link
          href={authorHref(article.author)}
          data-author-slug={article.author.handle}
          className="text-white"
        >
          {article.author.name}
        </Link>
        <ReadingMark slug={article.slug} />
      </p>
    </article>
  );
}

export function AdjacentStories({ previous, next }: AdjacentStoriesProps) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Previous and next stories"
      className="mx-auto mt-14 max-w-7xl sm:mt-20"
    >
      <div className="grid items-start gap-6 sm:grid-cols-2 sm:gap-10">
        {previous ? (
          <AdjacentCard label="Previous" article={previous} />
        ) : (
          <div className="hidden sm:block" />
        )}
        {next ? (
          <AdjacentCard label="Next" article={next} align="end" />
        ) : null}
      </div>
    </nav>
  );
}