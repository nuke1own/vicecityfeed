import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { ProfileForm } from "@/components/account/ProfileForm";
import { outlinePillClass } from "@/components/pills";
import { getCurrentProfile, getCurrentUser, profileHref } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/?next=/settings/profile/");
  const profile = await getCurrentProfile();

  return (
    <main id="main" className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-[2rem] leading-[1.06] font-extrabold tracking-tight text-white sm:text-4xl">
        Edit profile
      </h1>
      {profile ? (
        <>
          <p className="mt-3 text-base text-white/85">
            This is how people see you around Vice City Feed.{" "}
            <Link
              href={profileHref(profile.handle)}
              className="font-semibold text-white underline underline-offset-4"
            >
              View your profile
            </Link>
          </p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
            <ProfileForm
              handle={profile.handle}
              displayName={profile.displayName}
              bio={profile.bio}
              avatarUrl={profile.avatarUrl}
            />
          </div>
        </>
      ) : (
        <p className="mt-6 text-base text-white" role="alert">
          Your profile is still being set up. Refresh in a moment.
        </p>
      )}
      <form action={signOut} className="mt-8">
        <button type="submit" className={outlinePillClass("px-5 text-sm font-semibold")}>
          Sign out
        </button>
      </form>
    </main>
  );
}
