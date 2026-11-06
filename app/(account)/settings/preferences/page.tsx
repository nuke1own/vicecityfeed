import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/SettingsCard";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { ThemePreview } from "@/components/settings/ThemePreview";

export const metadata: Metadata = {
  title: "Preferences",
  robots: { index: false, follow: false },
  alternates: { canonical: "/settings/preferences/" },
};

/** Works signed in or out: the theme is stored on the device, and on the account when signed in. */
export default function PreferencesPage() {
  return (
    <>
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white md:text-4xl">
          Preferences
        </h1>
        <p className="mt-1 text-sm text-white/75 md:mt-2 md:text-base md:text-white/85">Make Vice City Feed look the way you like.</p>
      </header>

      <SettingsSection
        title="Color theme"
        id="color-theme"
        description="Pick the accent used for buttons, links and highlights across the site."
      >
        <ThemePicker />
      </SettingsSection>

      <SettingsSection title="Preview" id="theme-preview">
        <ThemePreview />
      </SettingsSection>
    </>
  );
}
