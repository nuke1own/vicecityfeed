import type { Metadata } from "next";
import Link from "next/link";
import { Feather } from "lucide-react";
import { PostCard } from "@/components/social/PostCard";
import { PostComposer } from "@/components/social/PostComposer";
import { SocialHeader } from "@/components/social/SocialHeader";
import { getCurrentUser } from "@/lib/profiles";
import { getTimeline } from "@/lib/social";

export const metadata: Metadata = {
  title: "Social",
  description: "Posts from the Vice City Feed community about GTA VI.",
  alternates: { canonical: "/social/" },
};

type SocialPageProps = { searchParams: Promise<{ feed?: string; before?: string }> };

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const feed = params.feed === "following" && user ? "following" : "all";
  const before = params.before && !Number.isNaN(Date.parse(params.before)) ? params.before : null;
  const { posts, nextCursor } = await getTimeline({ feed, before, viewerId: user?.id ?? null });

  const olderHref = nextCursor
    ? `/social/?${new URLSearchParams({ ...(feed === "following" ? { feed } : {}), before: nextCursor })}`
    : null;

  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <SocialHeader feed={feed} signedIn={Boolean(user)} />
      {!before ? (
        <div className="hidden border-b border-white/10 p-3 md:block">
          <PostComposer />
        </div>
      ) : null}
      {!before && !user ? (
        <div className="border-b border-white/10 p-3 md:hidden">
          <PostComposer />
        </div>
      ) : null}

      {posts.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <p className="text-lg font-bold text-white">
            {feed === "following" ? "Nothing from people you follow yet" : "No posts yet"}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {feed === "following"
              ? "Follow people from their profiles to see their posts here."
              : "Be the first to post about GTA VI."}
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
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
          href="/social/compose/"
          aria-label="Write a post"
          className="compose-fab fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-vice-pink text-accent-ink shadow-[0_8px_24px_rgb(0_0_0/0.5),0_0_18px_rgb(var(--accent-rgb)/0.45)] active:scale-95 md:hidden"
        >
          <Feather aria-hidden className="size-6" />
        </Link>
      ) : null}
    </main>
  );
}
