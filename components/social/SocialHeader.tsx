import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";
import { AVATARS, avatarSrc } from "@/lib/avatars";
import Image from "next/image";

type SocialHeaderProps = {
  feed: "all" | "following";
  signedIn: boolean;
  memberCount: number;
  tag?: string | null;
};

/** Social hero with the community size, then the For you / Following tabs. */
export function SocialHeader({ feed, signedIn, memberCount, tag }: SocialHeaderProps) {
  if (tag) {
    return (
      <div className="flex items-center gap-3 border-b border-white/10 px-2 py-2">
        <Link href="/social/" aria-label="Back to Social" className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1 truncate text-xl font-extrabold text-white">
            <Hash aria-hidden className="size-5 text-vice-pink" />
            {tag}
          </h1>
          <p className="text-xs text-white/60">Posts with #{tag}</p>
        </div>
      </div>
    );
  }

  const tab = (active: boolean) =>
    `relative flex min-h-12 flex-1 items-center justify-center text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
      active ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
    }`;
  const bar = <span aria-hidden className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-vice-pink" />;

  return (
    <div className="border-b border-white/10">
      <div className="social-hero relative overflow-hidden px-4 pt-5 pb-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">Social</h1>
        <p className="mt-1 max-w-md text-sm text-white/80">
          The GTA VI community. Theories, clips, hype and hot takes from Leonida.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex -space-x-2" aria-hidden>
            {AVATARS.slice(0, 5).map((avatar) => (
              <Image
                key={avatar.id}
                src={avatarSrc(avatar.id)}
                alt=""
                width={28}
                height={28}
                className="size-7 rounded-full object-cover ring-2 ring-black"
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-white">
            {memberCount > 0 ? `${memberCount.toLocaleString("en-US")} ${memberCount === 1 ? "member" : "members"}` : "Be one of the first members"}
          </p>
        </div>
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
