import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Flame, Search } from "lucide-react";
import { PeopleList } from "@/components/social/PeopleList";
import { PostCard } from "@/components/social/PostCard";
import { getCurrentUser } from "@/lib/profiles";
import { getTrendingTags, getWhoToFollow, searchPeople, searchPosts } from "@/lib/social";

export const metadata: Metadata = { title: "Explore", robots: { index: false, follow: true } };

type SearchPageProps = { searchParams: Promise<{ q?: string; tab?: string }> };

export default async function SocialSearchPage({ searchParams }: SearchPageProps) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const query = (params.q ?? "").trim().slice(0, 60);
  const tab = params.tab === "people" ? "people" : "posts";
  const [posts, people] = query.length >= 2
    ? await Promise.all([tab === "posts" ? searchPosts(query) : Promise.resolve([]), tab === "people" ? searchPeople(query) : Promise.resolve([])])
    : [[], []];
  const tabHref = (name: string) => `/social/search/?${new URLSearchParams({ q: query, tab: name })}`;
  const tabClass = (active: boolean) =>
    `relative flex min-h-12 flex-1 items-center justify-center text-[15px] font-bold ${active ? "text-white" : "text-white/60 hover:bg-white/5"}`;

  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <h1 className="sr-only">Explore</h1>
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-2">
        <Link href="/social/" aria-label="Back to Social" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <form action="/social/search/" role="search" className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/15 bg-raised px-4 focus-within:border-vice-pink">
          <Search aria-hidden className="size-4 shrink-0 text-white/70" />
          <label htmlFor="social-q" className="sr-only">Search posts and people</label>
          <input id="social-q" name="q" type="search" defaultValue={query} placeholder="Search posts and people" autoComplete="off" enterKeyHint="search" className="min-h-11 w-full bg-transparent text-base text-white placeholder:text-white/50 focus-visible:outline-none" />
          <input type="hidden" name="tab" value={tab} />
        </form>
      </div>
      {query.length >= 2 ? (
        <>
          <nav aria-label="Result type" className="flex border-b border-white/10">
            {(["posts", "people"] as const).map((name) => (
              <Link key={name} href={tabHref(name)} aria-current={tab === name ? "page" : undefined} className={tabClass(tab === name)}>
                {name === "posts" ? "Posts" : "People"}
                {tab === name ? <span aria-hidden className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-vice-pink" /> : null}
              </Link>
            ))}
          </nav>
          {tab === "posts" ? (
            posts.length ? posts.map((post) => <PostCard key={post.id} post={post} viewerId={user?.id ?? null} />) : <p className="px-4 py-12 text-center text-sm text-white/70">No posts match “{query}”.</p>
          ) : people.length ? (
            <PeopleList people={people} />
          ) : (
            <p className="px-4 py-12 text-center text-sm text-white/70">No people match “{query}”.</p>
          )}
        </>
      ) : (
        <ExploreHome />
      )}
    </main>
  );
}

/** Explore with no search yet: trending hashtags and people to follow. */
async function ExploreHome() {
  const user = await getCurrentUser();
  const [tags, people] = await Promise.all([getTrendingTags(), getWhoToFollow(user?.id ?? null, 5)]);
  return (
    <>
      <section aria-labelledby="explore-trending" className="border-b border-white/10">
        <h2 id="explore-trending" className="flex items-center gap-2 px-4 pt-4 pb-2 text-xl font-extrabold text-white">
          <Flame aria-hidden className="size-5 text-vice-pink" /> Trending in Leonida
        </h2>
        {tags.length ? (
          <ol>
            {tags.map((tag, index) => (
              <li key={tag.tag}>
                <Link href={`/social/?tag=${tag.tag}`} className="block px-4 py-3 hover:bg-white/[0.04]">
                  <span className="block text-xs text-white/60">{index + 1} · Trending</span>
                  <span className="block text-[17px] font-bold text-white">#{tag.tag}</span>
                  <span className="block text-xs text-white/60">{tag.posts} {tag.posts === 1 ? "post" : "posts"}</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-4 pb-4 text-sm text-white/70">Nothing trending yet. Use #hashtags in your posts.</p>
        )}
      </section>
      {people.length ? (
        <section aria-labelledby="explore-people">
          <h2 id="explore-people" className="px-4 pt-4 pb-1 text-xl font-extrabold text-white">Who to follow</h2>
          <PeopleList people={people} />
          <Link href="/social/connect/" className="block px-4 py-3 text-sm font-semibold text-vice-pink hover:bg-white/[0.04]">Show more</Link>
        </section>
      ) : null}
    </>
  );
}
