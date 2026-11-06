import type { Metadata } from "next";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { signOut, signOutEverywhere } from "@/app/actions/auth";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { PreviewNotice, SettingsSection } from "@/components/settings/SettingsCard";
import { getSettingsAccount } from "@/lib/settings-account";

export const metadata: Metadata = {
  title: "Security settings",
  robots: { index: false, follow: false },
};

const actionButtonClass =
  "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/25 px-5 text-base font-semibold text-white transition-colors hover:border-vice-pink hover:bg-vice-pink hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white";

export default async function SecuritySettingsPage() {
  const account = await getSettingsAccount("/settings/security/");

  return (
    <>
      {account.preview ? <PreviewNotice /> : null}
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Security</h1>
        <p className="mt-2 text-base text-white/85">
          Signed in as <span className="font-semibold text-white">{account.email}</span>
        </p>
      </header>

      <SettingsSection title="Password" id="password">
        <PasswordChangeForm />
      </SettingsSection>

      <SettingsSection title="Sessions" id="sessions">
        <ul>
          <li className="flex flex-col gap-4 border-b border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-white">This device</p>
              <p className="mt-1 text-sm text-white/75">Sign out of Vice City Feed in this browser.</p>
            </div>
            <form action={signOut}>
              <button type="submit" className={actionButtonClass}>
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </form>
          </li>
          <li className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-white">All devices</p>
              <p className="mt-1 text-sm text-white/75">
                Sign out everywhere, including phones and other browsers. Use this if you think
                someone else has your password.
              </p>
            </div>
            <form action={signOutEverywhere}>
              <button type="submit" className={actionButtonClass}>
                <MonitorSmartphone aria-hidden className="size-4" />
                Sign out everywhere
              </button>
            </form>
          </li>
        </ul>
      </SettingsSection>
    </>
  );
}
