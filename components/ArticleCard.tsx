import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { SaveControl } from "@/components/SaveControl";
import { ReadingMark } from "@/components/ReadingMark";
import { formatReadTime, formatRelativeTime } from "@/lib/format";
import { authorHref } from "@/lib/authors";
import { CATEGORY_SHORT } from "@/lib/site";
import type { ArticleMeta } from "@/lib/types";

type ArticleCardProps = {
  article: ArticleMeta;
  featured?: boolean;
  readingTimeMinutes?: number;
  shareCover?: boolean;
};

export function ArticleCard({
  article,
  featured = false,
  readingTimeMinutes,
  shareCover = true,
}: ArticleCardProps) {
  const href = `/posts/${article.slug}`;
  const category = CATEGORY_SHORT[article.category];

  return (
    <article
      data-card-surface
      className="story-card group rounded-2xl bg-surface p-3.5 transition-[transform,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 active:translate-y-0 sm:p-4 md:p-5"
    >
      <div className="relative">
        <Link href={href} className="block">
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <StoryCover
              article={article}
              share={shareCover}
              className="h-full w-full origin-center transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="absolute top-3 left-3 rounded-full border border-white/15 bg-black/75 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm transition-colors duration-300 ease-out group-hover:bg-vice-pink group-hover:text-black">
              {category}
            </span>
            {article.breaking ? (
              <span className="absolute right-3 bottom-3 rounded-full bg-vice-pink px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-black uppercase">
                Live
              </span>
            ) : null}
          </div>
        </Link>
        <SaveControl slug={article.slug} />
      </div>
      <Link href={href} className="mt-3.5 block sm:mt-4">
        <h3
          className={`font-display link-draw text-balance break-words font-extrabold tracking-tight text-white ${
            featured ? "text-xl leading-snug md:text-2xl" : "text-base leading-snug md:text-lg"
          }`}
        >
          {article.title}
        </h3>
        {article.excerpt.trim() &&
        article.excerpt.trim().toLowerCase() !== article.title.toLowerCase() ? (
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-white">
            {article.excerpt}
          </p>
        ) : null}
      </Link>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium tracking-wide text-white/70">
        <time dateTime={article.publishedAt} data-relative-time>
          {formatRelativeTime(article.publishedAt)}
        </time>
        <span aria-hidden className="text-vice-pink">/</span>
        <Link
          href={authorHref(article.author)}
          data-author-slug={article.author.handle}
          className="link-draw text-white"
        >
          {article.author.name}
        </Link>
        {readingTimeMinutes ? (
          <>
            {" · "}
            {formatReadTime(readingTimeMinutes)}
          </>
        ) : null}
        <ReadingMark slug={article.slug} />
      </p>
    </article>
  );
}
