import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { CopyProfileLink } from "@/components/settings/CopyProfileLink";
import { PreviewNotice, SettingsSection } from "@/components/settings/SettingsCard";
import {
  getFollowList,
  getProfileStats,
  profileHref,
  type FollowEntry,
} from "@/lib/profiles";
import { getSettingsAccount } from "@/lib/settings-account";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social settings",
  robots: { index: false, follow: false },
};

function PeopleList({ people, empty }: { people: FollowEntry[]; empty: string }) {
  if (people.length === 0) {
    return <p className="py-4 text-sm text-white/75 md:py-6 md:text-base md:text-white/80">{empty}</p>;
  }
  return (
    <ul>
      {people.map((person) => (
        <li key={person.handle} className="border-b border-white/10 last:border-b-0">
          <Link
            href={profileHref(person.handle)}
            className="flex items-center gap-4 py-4 hover:text-vice-pink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
          >
            <Avatar displayName={person.displayName} avatarUrl={person.avatarUrl} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-white">{person.displayName}</span>
              <span className="block truncate text-sm text-white/75">@{person.handle}</span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-white" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SocialSettingsPage() {
  const account = await getSettingsAccount("/settings/social/");
  const { profile } = account;
  const [stats, followers, following] = account.preview
    ? [{ followers: 0, following: 0, posts: 0 }, [], []]
    : await Promise.all([
        getProfileStats(profile.id),
        getFollowList(profile.id, "followers"),
        getFollowList(profile.id, "following"),
      ]);
  const publicUrl = `${SITE.url}${profileHref(profile.handle)}`;

  return (
    <>
      {account.preview ? <PreviewNotice /> : null}
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white md:text-4xl">Social</h1>
        <p className="mt-1 text-sm text-white/75 md:mt-2 md:text-base md:text-white/85">Your public profile and the people you are connected with.</p>
      </header>

      <SettingsSection title="Public profile" id="public-profile">
        <div className="flex flex-col gap-4 py-4 md:py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar displayName={profile.displayName} avatarUrl={profile.avatarUrl} size={56} />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white">{profile.displayName}</p>
              <p className="truncate text-sm text-white/75">{publicUrl.replace(/^https:\/\//, "")}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={profileHref(profile.handle)}
              className="inline-flex min-h-11 items-center rounded-full bg-vice-pink px-5 text-base font-bold text-accent-ink hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
            >
              View profile
            </Link>
            <CopyProfileLink url={publicUrl} />
          </div>
        </div>
        <dl className="grid grid-cols-3 border-t border-white/10 py-3 text-center md:py-5">
          {[
            ["Posts", stats.posts],
            ["Followers", stats.followers],
            ["Following", stats.following],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-white/75">{label}</dt>
              <dd className="mt-1 text-xl font-bold text-white tabular-nums">{Number(value).toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
      </SettingsSection>

      <SettingsSection title="Followers" id="followers">
        <PeopleList people={followers} empty="Nobody follows you yet. Following opens with the community feed." />
      </SettingsSection>

      <SettingsSection title="Following" id="following">
        <PeopleList people={following} empty="You are not following anyone yet." />
      </SettingsSection>
    </>
  );
}
