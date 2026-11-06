import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser, type Profile } from "./profiles";

export type SettingsAccount = {
  profile: Profile;
  email: string;
  /** When the auth account was created. */
  createdAt: string;
  /** Demo data for browser tests; writes are disabled. */
  preview: boolean;
};

const PREVIEW_ACCOUNT: SettingsAccount = {
  profile: {
    id: "00000000-0000-4000-8000-000000000000",
    handle: "lucia_vc",
    displayName: "Lucia",
    bio: "Counting down to Leonida.",
    avatarUrl: null,
    role: "member",
    createdAt: "2026-01-15T12:00:00.000Z",
  },
  email: "lucia@example.com",
  createdAt: "2026-01-15T12:00:00.000Z",
  preview: true,
};

/**
 * The signed-in member's account for /settings pages. Redirects to sign-in
 * when signed out. VCF_UI_PREVIEW=1 (server-only, test runs only) serves
 * demo data instead, so the signed-in UI can be tested without Supabase.
 */
export const getSettingsAccount = cache(async (next: string): Promise<SettingsAccount> => {
  const user = await getCurrentUser();
  if (!user) {
    if (process.env.VCF_UI_PREVIEW === "1") return PREVIEW_ACCOUNT;
    redirect(`/login/?next=${encodeURIComponent(next)}`);
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login/?error=profile");
  return {
    profile,
    email: user.email ?? "",
    createdAt: user.created_at ?? profile.createdAt,
    preview: false,
  };
});
