import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { ctaPillClass } from "@/components/pills";
import { formatRelativeTime } from "@/lib/format";
import { articleCta, CATEGORY_SHORT } from "@/lib/site";
import type { ArticleMeta } from "@/lib/types";

type HeroProps = {
  article: ArticleMeta;
};

function HeroMeta({
  article,
  TitleTag,
  headingId,
  className,
}: {
  article: ArticleMeta;
  TitleTag: "h1" | "p";
  headingId?: string;
  className: string;
}) {
  const cta = articleCta(article.tags, article.slug);
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="reveal rounded-full bg-vice-pink px-2.5 py-1 text-[11px] font-bold tracking-[0.14em] text-accent-ink uppercase">
          {article.breaking ? "Breaking" : "Lead story"}
        </span>
        <span className="reveal rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
          {CATEGORY_SHORT[article.category]}
        </span>
      </div>
      <TitleTag
        id={headingId}
        className="reveal reveal-delay font-display max-w-3xl text-[1.65rem] leading-[1.05] font-extrabold tracking-tight text-balance break-words text-white sm:text-3xl md:text-5xl md:leading-[1.02] lg:text-7xl"
      >
        {article.title}
      </TitleTag>
      <p className="reveal reveal-delay max-w-2xl text-sm font-medium leading-snug text-white/85 sm:text-base">
        {article.excerpt}
      </p>
      <p className="reveal reveal-delay text-[11px] font-semibold tracking-[0.14em] text-white/65 uppercase">
        {formatRelativeTime(article.publishedAt)} <span aria-hidden>·</span> Vice City Feed Desk
      </p>
      <span className={`${ctaPillClass("white")} reveal reveal-delay`}>{cta}</span>
    </div>
  );
}

export function Hero({ article }: HeroProps) {
  const href = `/posts/${article.slug}`;

  return (
    <section aria-labelledby="hero-heading" className="px-4 pt-4 md:px-6">
      <article
        data-hero-cinematic
        className="hero-shell group relative mx-auto max-w-7xl overflow-hidden rounded-2xl"
      >
        <Link href={href} className="block">
          <div className="relative aspect-16/10 overflow-hidden md:aspect-auto md:min-h-[40rem] lg:min-h-[48rem]">
            <div className="hero-settle absolute inset-0">
              <StoryCover
                article={article}
                lead
                className="h-full w-full origin-center transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
            <HeroMeta
              article={article}
              TitleTag="p"
              className="relative z-10 hidden flex-col items-start gap-4 md:absolute md:inset-x-0 md:bottom-0 md:flex md:p-8 lg:p-10"
            />
          </div>
          <HeroMeta
            article={article}
            TitleTag="h1"
            headingId="hero-heading"
            className="relative z-10 flex flex-col items-start gap-3 bg-surface px-4 py-4 sm:px-5 sm:py-5 md:sr-only"
          />
        </Link>
      </article>
    </section>
  );
}
