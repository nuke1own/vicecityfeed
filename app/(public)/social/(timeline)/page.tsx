import type { Metadata } from "next";
import { Suspense } from "react";
import { SidebarSkeleton } from "@/components/social/FeedSkeleton";
import Link from "next/link";
import { Feather, MessageCircleHeart } from "lucide-react";
import { PostCard } from "@/components/social/PostCard";
import { PostComposer } from "@/components/social/PostComposer";
import { SocialHeader } from "@/components/social/SocialHeader";
import { NewPostsBanner } from "@/components/social/NewPostsBanner";
import {
  LatestArticlesCard,
  QuestionCard,
  TopCreatorsCard,
  TrendingCard,
  TrendingChips,
  WhoToFollowCard,
  WhoToFollowStrip,
} from "@/components/social/SocialSidebar";
import { getPublishedFeed } from "@/lib/articles-server";
import { getCurrentUser } from "@/lib/profiles";
import {
  getMemberCount,
  getTimeline,
  getTopCreators,
  questionOfTheDay,
  getTrendingTags,
  getWhoToFollow,
  HASHTAG_PATTERN,
} from "@/lib/social";

type SocialPageProps = { searchParams: Promise<{ feed?: string; before?: string; tag?: string }> };

export async function generateMetadata({ searchParams }: SocialPageProps): Promise<Metadata> {
  const { tag } = await searchParams;
  const clean = tag?.toLowerCase();
  if (clean && HASHTAG_PATTERN.test(clean)) {
    return { title: `#${clean} on Social`, alternates: { canonical: `/social/?tag=${clean}` } };
  }
  return {
    title: "Social",
    description: "Posts from the Vice City Feed community about GTA VI.",
    alternates: { canonical: "/social/" },
  };
}

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const rawTag = params.tag?.toLowerCase() ?? null;
  const tag = rawTag && HASHTAG_PATTERN.test(rawTag) ? rawTag : null;
  const feed = !tag && params.feed === "following" && user ? "following" : "all";
  const before = params.before && !Number.isNaN(Date.parse(params.before)) ? params.before : null;

  const [{ posts, nextCursor }, trending, suggestions, memberCount] = await Promise.all([
    getTimeline({ feed, before, viewerId: user?.id ?? null, tag }),
    getTrendingTags(),
    getWhoToFollow(user?.id ?? null),
    getMemberCount(),
  ]);
  const question = questionOfTheDay();

  const olderParams = new URLSearchParams({
    ...(feed === "following" ? { feed } : {}),
    ...(tag ? { tag } : {}),
    ...(nextCursor ? { before: nextCursor } : {}),
  });
  const olderHref = nextCursor ? `/social/?${olderParams}` : null;
  const firstPage = !before;

  return (
    <div className="flex w-full min-w-0 justify-center gap-6">
      <main id="main" className="w-full max-w-2xl min-w-0 pb-10 md:border-x md:border-white/10">
        <SocialHeader feed={feed} signedIn={Boolean(user)} memberCount={memberCount} tag={tag} />
        {firstPage ? <TrendingChips tags={trending} active={tag} /> : null}
        {firstPage && !tag && feed === "all" ? <QuestionCard question={question} compact /> : null}
        {firstPage && !tag && feed === "all" ? <NewPostsBanner /> : null}

        {firstPage ? (
          <div className={`border-b border-white/10 p-3 ${user ? "hidden md:block" : ""}`}>
            <PostComposer initialText={tag ? `#${tag} ` : ""} />
          </div>
        ) : null}

        {posts.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-vice-pink/15 text-vice-pink">
              <MessageCircleHeart aria-hidden className="size-8" />
            </span>
            <p className="mt-4 text-xl font-extrabold text-white">
              {tag ? `No posts with #${tag} yet` : feed === "following" ? "Your Following feed is empty" : "Start the conversation"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-white/70">
              {tag
                ? "Be the first to post about it."
                : feed === "following"
                  ? "Follow people and their posts will show up here."
                  : "Share a theory, a clip or your hype for GTA VI. Everyone starts somewhere."}
            </p>
            {user ? (
              <Link href="/social/compose/" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-vice-pink px-6 text-sm font-bold text-accent-ink hover:bg-white md:hidden">
                Write a post
              </Link>
            ) : null}
          </div>
        ) : (
          <div>
            {posts.map((post, index) => (
              <div key={post.id}>
                <PostCard post={post} />
                {firstPage && !tag && index === 2 ? <WhoToFollowStrip members={suggestions} /> : null}
              </div>
            ))}
            {firstPage && !tag && posts.length < 3 ? <WhoToFollowStrip members={suggestions} /> : null}
          </div>
        )}

        {olderHref ? (
          <div className="p-4 text-center">
            <Link href={olderHref} className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:border-white">
              Show older posts
            </Link>
          </div>
        ) : null}

        {user ? (
          <Link
            href={tag ? `/social/compose/?tag=${tag}` : "/social/compose/"}
            aria-label="Write a post"
            className="compose-fab fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-vice-pink text-accent-ink shadow-[0_8px_24px_rgb(0_0_0/0.5),0_0_18px_rgb(var(--accent-rgb)/0.45)] active:scale-95 md:hidden"
          >
            <Feather aria-hidden className="size-6" />
          </Link>
        ) : null}
      </main>

      <aside aria-label="Social sidebar" className="hidden w-80 shrink-0 py-4 lg:block">
        <div className="sticky top-44 space-y-4">
          <Suspense fallback={<SidebarSkeleton />}>
            <TimelineSidebar viewerId={user?.id ?? null} question={question} />
          </Suspense>
        </div>
      </aside>
    </div>
  );
}

/** Desktop sidebar, streamed after the timeline so posts show first. */
async function TimelineSidebar({ viewerId, question }: { viewerId: string | null; question: string }) {
  const [trending, suggestions, creators, articles] = await Promise.all([
    getTrendingTags(),
    getWhoToFollow(viewerId),
    getTopCreators(),
    getPublishedFeed(),
  ]);
  return (
    <>
      <QuestionCard question={question} />
      <TrendingCard tags={trending} />
      <WhoToFollowCard members={suggestions} />
      <TopCreatorsCard creators={creators} />
      <LatestArticlesCard articles={articles.slice(0, 3)} />
    </>
  );
}
