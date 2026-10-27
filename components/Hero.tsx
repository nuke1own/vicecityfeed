import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { ctaPillClass } from "@/components/pills";
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
      <span className="reveal rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
        {CATEGORY_SHORT[article.category]}
      </span>
      <TitleTag
        id={headingId}
        className="reveal reveal-delay font-display max-w-3xl text-[1.65rem] leading-[1.05] font-extrabold tracking-tight text-balance break-words text-white sm:text-3xl md:text-5xl md:leading-[1.02] lg:text-7xl"
      >
        {article.title}
      </TitleTag>
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
        className="group relative mx-auto max-w-7xl overflow-hidden rounded-2xl"
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
            <div className="pointer-events-none absolute inset-0 hidden bg-linear-to-t from-black via-black/55 to-transparent md:block" />
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
