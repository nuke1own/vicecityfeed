import Link from "next/link";
import { BadgeCheck, Flame, Newspaper } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import type { SuggestedMember, TrendingTag } from "@/lib/social";
import type { FeedArticle } from "@/lib/types";

const card = "overflow-hidden rounded-2xl border border-white/10 bg-surface";
const cardTitle = "flex items-center gap-2 px-4 pt-4 pb-2 text-lg font-extrabold text-white";

export function TrendingCard({ tags }: { tags: TrendingTag[] }) {
  return (
    <section aria-labelledby="trending-title" className={card}>
      <h2 id="trending-title" className={cardTitle}>
        <Flame aria-hidden className="size-5 text-vice-pink" /> Trending in Leonida
      </h2>
      {tags.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-white/70">Use #hashtags in your posts and they will trend here.</p>
      ) : (
        <ol>
          {tags.map((tag, index) => (
            <li key={tag.tag}>
              <Link href={`/social/?tag=${tag.tag}`} className="block px-4 py-2.5 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white">
                <span className="block text-xs text-white/60">{index + 1} · Trending</span>
                <span className="block font-bold text-white">#{tag.tag}</span>
                <span className="block text-xs text-white/60">
                  {tag.posts} {tag.posts === 1 ? "post" : "posts"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function WhoToFollowCard({ members }: { members: SuggestedMember[] }) {
  if (members.length === 0) return null;
  return (
    <section aria-labelledby="follow-title" className={card}>
      <h2 id="follow-title" className={cardTitle}>Who to follow</h2>
      <ul className="pb-2">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
            <Link href={`/u/${member.handle}/`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg hover:opacity-90">
              <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} size={44} />
              <span className="min-w-0">
                <span className="flex items-center gap-1 truncate font-bold text-white">
                  <span className="truncate">{member.displayName}</span>
                  {member.isStaff ? <BadgeCheck aria-label="Vice City Feed staff" className="size-4 shrink-0 text-vice-pink" /> : null}
                </span>
                <span className="block truncate text-sm text-white/60">@{member.handle}</span>
              </span>
            </Link>
            <FollowButton profileId={member.id} handle={member.handle} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LatestArticlesCard({ articles }: { articles: FeedArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="latest-articles-title" className={card}>
      <h2 id="latest-articles-title" className={cardTitle}>
        <Newspaper aria-hidden className="size-5 text-vice-pink" /> From Articles
      </h2>
      <ul className="pb-2">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/posts/${article.slug}/`} className="block px-4 py-2.5 hover:bg-white/[0.04]">
              <span className="block text-xs font-semibold tracking-wide text-vice-pink uppercase">{article.category}</span>
              <span className="line-clamp-2 font-bold text-white">{article.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/" className="block border-t border-white/10 px-4 py-3 text-sm font-semibold text-vice-pink hover:bg-white/[0.04]">
        All articles
      </Link>
    </section>
  );
}

/** Phones: trending hashtags as a swipeable row of chips. */
export function TrendingChips({ tags, active }: { tags: TrendingTag[]; active?: string | null }) {
  if (tags.length === 0) return null;
  return (
    <nav aria-label="Trending hashtags" className="no-scrollbar flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3 lg:hidden">
      {tags.map((tag) => (
        <Link
          key={tag.tag}
          href={`/social/?tag=${tag.tag}`}
          aria-current={active === tag.tag ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${
            active === tag.tag ? "border-vice-pink bg-vice-pink text-accent-ink" : "border-white/15 text-white hover:border-white/40"
          }`}
        >
          #{tag.tag}
        </Link>
      ))}
    </nav>
  );
}

/** Phones: who to follow as a swipeable row of cards inside the timeline. */
export function WhoToFollowStrip({ members }: { members: SuggestedMember[] }) {
  if (members.length === 0) return null;
  return (
    <section aria-labelledby="follow-strip-title" className="border-b border-white/10 py-4 lg:hidden">
      <h2 id="follow-strip-title" className="px-4 text-lg font-extrabold text-white">Who to follow</h2>
      <ul className="no-scrollbar mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4">
        {members.map((member) => (
          <li key={member.id} className="flex w-40 shrink-0 snap-start flex-col items-center rounded-2xl border border-white/10 bg-surface p-4 text-center">
            <Link href={`/u/${member.handle}/`} className="flex flex-col items-center">
              <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} size={64} />
              <span className="mt-2 w-full truncate font-bold text-white">{member.displayName}</span>
              <span className="w-full truncate text-sm text-white/60">@{member.handle}</span>
            </Link>
            <div className="mt-3">
              <FollowButton profileId={member.id} handle={member.handle} size="sm" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
