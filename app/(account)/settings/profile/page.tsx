import type { Metadata } from "next";
import { FormMessage } from "@/components/account/Field";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { ProfileBanner } from "@/components/settings/ProfileBanner";
import { ProfileDetails } from "@/components/settings/ProfileDetails";
import { PreviewNotice, SettingsSection } from "@/components/settings/SettingsCard";
import { getSettingsAccount } from "@/lib/settings-account";

export const metadata: Metadata = {
  title: "Profile settings",
  robots: { index: false, follow: false },
};

type ProfileSettingsProps = { searchParams: Promise<{ password?: string }> };

export default async function ProfileSettingsPage({ searchParams }: ProfileSettingsProps) {
  const [{ password }, account] = await Promise.all([
    searchParams,
    getSettingsAccount("/settings/profile/"),
  ]);
  const { profile } = account;

  return (
    <>
      {account.preview ? <PreviewNotice /> : null}
      {password === "updated" ? (
        <FormMessage tone="success">Your password has been updated.</FormMessage>
      ) : null}

      <ProfileBanner
        displayName={profile.displayName}
        handle={profile.handle}
        avatarUrl={profile.avatarUrl}
        createdAt={account.createdAt}
      />

      <SettingsSection
        title="Profile Details"
        id="profile-details"
        description="Open a row to change it. Your display name, handle and bio are public."
      >
        <ProfileDetails
          email={account.email}
          displayName={profile.displayName}
          handle={profile.handle}
          bio={profile.bio}
        />
      </SettingsSection>

      <SettingsSection title="Delete Account" id="delete-account">
        <DeleteAccount handle={profile.handle} />
      </SettingsSection>
    </>
  );
}
