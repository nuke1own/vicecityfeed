import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/social/PostCard";
import { PostComposer } from "@/components/social/PostComposer";
import { getPost, getReplies } from "@/lib/social";

type PostPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const title = `${post.displayName} on Vice City Feed`;
  return {
    title,
    description: post.body.slice(0, 160),
    alternates: { canonical: `/social/post/${post.id}/` },
    openGraph: { type: "article", title, description: post.body.slice(0, 200) },
    twitter: { card: "summary", title, description: post.body.slice(0, 200) },
  };
}

export default async function SocialPostPage({ params }: PostPageProps) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const [replies, parent] = await Promise.all([
    getReplies(post.id),
    post.replyTo ? getPost(post.replyTo) : Promise.resolve(null),
  ]);

  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 px-2 py-1.5">
        <Link href={parent ? `/social/post/${parent.id}/` : "/social/"} aria-label="Back" className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="text-lg font-bold text-white">Post</h1>
      </div>
      {parent ? <PostCard post={parent} /> : null}
      <PostCard post={post} focus />
      <div className="border-b border-white/10 p-3">
        <PostComposer replyTo={post.id} replyingTo={post.handle} id="reply" />
      </div>
      <section aria-label="Replies">
        {replies.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-white/70">No replies yet.</p>
        ) : (
          replies.map((reply) => <PostCard key={reply.id} post={reply} />)
        )}
      </section>
    </main>
  );
}
