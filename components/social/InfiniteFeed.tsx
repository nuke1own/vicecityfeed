"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { loadMorePosts } from "@/app/actions/social";
import { PostCard } from "@/components/social/PostCard";
import { PostSkeleton } from "@/components/social/FeedSkeleton";
import type { SocialPost } from "@/lib/social";

type Props = {
  feed: "all" | "following";
  tag: string | null;
  cursor: string;
  viewerId: string | null;
  /** Plain link used before JavaScript loads (and if loading fails). */
  fallbackHref: string;
};

/** Loads older posts automatically as you near the end of the timeline. */
export function InfiniteFeed({ feed, tag, cursor, viewerId, fallbackHref }: Props) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [next, setNext] = useState<string | null>(cursor);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || pending) return;
        const before = next;
        startTransition(async () => {
          try {
            const page = await loadMorePosts(feed, before, tag);
            setPosts((current) => {
              const seen = new Set(current.map((post) => post.id));
              return [...current, ...page.posts.filter((post) => !seen.has(post.id))];
            });
            setNext(page.nextCursor);
          } catch {
            setFailed(true);
          }
        });
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [next, failed, pending, feed, tag]);

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewerId={viewerId} />
      ))}
      {next ? (
        <div ref={sentinel} aria-busy={pending}>
          {pending ? (
            <>
              <span className="sr-only" role="status">Loading older posts</span>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            <div className="p-4 text-center">
              <Link href={fallbackHref} className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:border-white">
                Show older posts
              </Link>
            </div>
          )}
        </div>
      ) : posts.length > 0 ? (
        <p className="px-4 py-8 text-center text-sm text-white/60">You are all caught up.</p>
      ) : null}
    </>
  );
}
