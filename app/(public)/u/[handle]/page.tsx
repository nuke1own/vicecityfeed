import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/account/Avatar";
import { OwnProfileActions } from "@/components/account/OwnProfileActions";
import {
  getProfileByHandle,
  getProfileStats,
  profileHref,
  type ProfileRole,
} from "@/lib/profiles";
import { SITE } from "@/lib/site";

type ProfilePageProps = { params: Promise<{ handle: string }> };

// Profiles render on first visit, then are cached; edits revalidate them.
export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

const ROLE_LABEL: Partial<Record<ProfileRole, string>> = {
  moderator: "Moderator",
  editor: "Vice City Feed staff",
  admin: "Vice City Feed staff",
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();
  const title = `${profile.displayName} (@${profile.handle})`;
  const description = profile.bio || `${profile.displayName} on ${SITE.name}.`;
  return {
    title,
    description,
    alternates: { canonical: profileHref(profile.handle) },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `${SITE.url}${profileHref(profile.handle)}`,
      ...(profile.avatarUrl
        ? { images: [{ url: profile.avatarUrl, alt: `${profile.displayName}'s avatar` }] }
        : {}),
    },
    twitter: { card: "summary", title, description },
  };
}

const joinedFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <li>
      <span className="font-bold text-white tabular-nums">{value.toLocaleString("en-US")}</span>{" "}
      <span className="text-white/75">{label}</span>
    </li>
  );
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const stats = await getProfileStats(profile.id);
  const roleLabel = ROLE_LABEL[profile.role];

  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <section
        aria-labelledby="profile-name"
        className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <Avatar
            displayName={profile.displayName}
            avatarUrl={profile.avatarUrl}
            size={96}
            className="ring-2 ring-vice-pink ring-offset-2 ring-offset-surface"
          />
          <OwnProfileActions profileId={profile.id} />
        </div>
        <h1
          id="profile-name"
          className="font-display mt-5 text-2xl leading-tight font-extrabold tracking-tight break-words text-white sm:text-3xl"
        >
          {profile.displayName}
        </h1>
        <p className="mt-1 text-base text-white/75">@{profile.handle}</p>
        {roleLabel ? (
          <p className="mt-3 inline-flex rounded-full bg-vice-pink px-2.5 py-1 text-xs font-bold text-black">
            {roleLabel}
          </p>
        ) : null}
        {profile.bio ? (
          <p className="mt-4 text-base leading-relaxed whitespace-pre-line break-words text-white">
            {profile.bio}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-white/75">
          Joined{" "}
          <time dateTime={profile.createdAt}>{joinedFormat.format(new Date(profile.createdAt))}</time>
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Stat value={stats.posts} label={stats.posts === 1 ? "post" : "posts"} />
          <Stat value={stats.following} label="following" />
          <Stat value={stats.followers} label={stats.followers === 1 ? "follower" : "followers"} />
        </ul>
      </section>

      <section aria-labelledby="profile-posts" className="mt-8">
        <h2 id="profile-posts" className="text-lg font-bold text-white">
          Posts
        </h2>
        <p className="mt-3 rounded-2xl border border-white/10 bg-surface p-5 text-base text-white/85">
          {stats.posts > 0
            ? "Posts will show here once the community feed launches."
            : `@${profile.handle} has not posted yet.`}
        </p>
      </section>
    </main>
  );
}
