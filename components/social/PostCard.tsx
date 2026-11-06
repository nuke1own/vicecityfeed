import Link from "next/link";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { BookmarkButton } from "@/components/social/BookmarkButton";
import { LikeButton } from "@/components/social/LikeButton";
import { PollView } from "@/components/social/PollView";
import { PostImages } from "@/components/social/PostImages";
import { PostMenu } from "@/components/social/PostMenu";
import { RelativeTime } from "@/components/social/RelativeTime";
import { RichText } from "@/components/social/RichText";
import { ShareButton } from "@/components/social/ShareButton";
import type { SocialPost } from "@/lib/social";

type PostCardProps = {
  post: SocialPost;
  /** Larger text for the post at the top of a thread. */
  focus?: boolean;
  /** Signed-in member id if the page knows it (makes the options menu correct instantly). */
  viewerId?: string | null;
};

/** One post in a timeline or thread. The whole card opens the thread. */
export function PostCard({ post, focus = false, viewerId }: PostCardProps) {
  const href = `/social/post/${post.id}/`;
  const profile = `/u/${post.handle}/`;

  return (
    <article
      className="relative flex gap-3 border-b border-white/10 px-4 pt-3.5 pb-2 transition-colors hover:bg-white/[0.03] sm:px-5"
      aria-labelledby={`post-${post.id}-author`}
    >
      {!focus ? (
        <Link href={href} className="absolute inset-0 z-0 rounded-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white" aria-label={`Open post by @${post.handle}`} />
      ) : null}
      <Link href={profile} className="relative z-10 shrink-0 self-start rounded-full focus-visible:outline-2 focus-visible:outline-white" tabIndex={-1} aria-hidden>
        <Avatar displayName={post.displayName} avatarUrl={post.avatarUrl} size={44} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="pr-9">
          <p id={`post-${post.id}-author`} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[15px] leading-snug">
            <Link href={profile} className="relative z-10 inline-flex max-w-full items-center gap-1 truncate font-bold text-white hover:underline">
              <span className="truncate">{post.displayName}</span>
              {post.isStaff ? <BadgeCheck aria-label="Vice City Feed staff" className="size-4 shrink-0 text-vice-pink" /> : null}
            </Link>
            <span className="truncate text-white/60">@{post.handle}</span>
            <span aria-hidden className="text-white/40">·</span>
            <RelativeTime iso={post.createdAt} className="text-white/60" />
          </p>
        </div>
        {/* Corner placement keeps the 44px menu button from stretching the name row. */}
        <div className="absolute top-1.5 right-2 sm:right-3">
          <PostMenu postId={post.id} authorId={post.authorId} handle={post.handle} viewerId={viewerId} />
        </div>
        <p className={`mt-0.5 break-words whitespace-pre-wrap text-white ${focus ? "text-xl leading-relaxed" : "text-[15px] leading-normal"}`}>
          <RichText text={post.body} />
        </p>
        <PostImages images={post.images} />
        {post.poll ? <PollView postId={post.id} poll={post.poll} isAuthor={viewerId === post.authorId} /> : null}
        <div className="-ml-2 mt-1.5 flex items-center gap-4 sm:gap-8">
          <Link
            href={href}
            aria-label={`Reply, ${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"}`}
            className="relative z-10 inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-2 text-sm text-white/70 hover:text-vice-pink focus-visible:outline-2 focus-visible:outline-white"
          >
            <MessageCircle aria-hidden className="size-[18px]" />
            <span className="tabular-nums">{post.replyCount > 0 ? post.replyCount : ""}</span>
          </Link>
          <LikeButton postId={post.id} liked={post.liked} count={post.likeCount} />
          <div className="-mr-2 ml-auto flex items-center">
            <BookmarkButton postId={post.id} bookmarked={Boolean(post.bookmarked)} />
            <ShareButton postId={post.id} text={post.body} />
          </div>
        </div>
      </div>
    </article>
  );
}
