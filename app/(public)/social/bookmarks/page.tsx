import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bookmark } from "lucide-react";
import { PostCard } from "@/components/social/PostCard";
import { getCurrentUser } from "@/lib/profiles";
import { getBookmarks } from "@/lib/social";

export const metadata: Metadata = { title: "Bookmarks", robots: { index: false, follow: false } };

export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/?next=/social/bookmarks/");
  const posts = await getBookmarks(user.id);

  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 px-2 py-2">
        <Link href="/social/" aria-label="Back to Social" className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white">Bookmarks</h1>
          <p className="text-xs text-white/60">Only you can see these.</p>
        </div>
      </div>
      {posts.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-vice-pink/15 text-vice-pink">
            <Bookmark aria-hidden className="size-8" />
          </span>
          <p className="mt-4 text-xl font-extrabold text-white">Save posts for later</p>
          <p className="mt-1 max-w-sm text-sm text-white/70">Tap the bookmark on any post to keep it here.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} viewerId={user.id} />)
      )}
    </main>
  );
}
