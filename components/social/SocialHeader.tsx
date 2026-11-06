import Link from "next/link";

type SocialHeaderProps = { feed: "all" | "following"; signedIn: boolean };

/** Title plus the For you / Following tabs, sticky under the site header. */
export function SocialHeader({ feed, signedIn }: SocialHeaderProps) {
  const tab = (active: boolean) =>
    `relative flex min-h-12 flex-1 items-center justify-center text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
      active ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
    }`;
  const bar = <span aria-hidden className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-vice-pink" />;

  return (
    <div className="border-b border-white/10">
      <div className="px-4 pt-4 pb-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">Social</h1>
        <p className="text-sm text-white/70">Talk GTA VI with the Vice City Feed community.</p>
      </div>
      <nav aria-label="Timeline" className="flex">
        <Link href="/social/" aria-current={feed === "all" ? "page" : undefined} className={tab(feed === "all")}>
          For you
          {feed === "all" ? bar : null}
        </Link>
        <Link
          href={signedIn ? "/social/?feed=following" : "/login/?next=/social/?feed=following"}
          aria-current={feed === "following" ? "page" : undefined}
          className={tab(feed === "following")}
        >
          Following
          {feed === "following" ? bar : null}
        </Link>
      </nav>
    </div>
  );
}
