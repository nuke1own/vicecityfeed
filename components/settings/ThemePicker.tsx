"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Check } from "lucide-react";
import { saveThemePreference } from "@/app/actions/preferences";
import {
  applyTheme,
  currentTheme,
  DEFAULT_THEME,
  isThemeId,
  THEMES,
  type ThemeId,
} from "@/lib/themes";

function subscribe(onChange: () => void) {
  window.addEventListener("vcf-theme-change", onChange);
  return () => window.removeEventListener("vcf-theme-change", onChange);
}

const STATUS_TEXT = {
  account: "Saved to your account. It will follow you to other devices.",
  device: "Saved on this device. Sign in to keep it on every device.",
  error: "Applied here, but we could not save it to your account. Try again.",
} as const;

export function ThemePicker() {
  const selected = useSyncExternalStore(subscribe, currentTheme, () => DEFAULT_THEME);
  const [status, setStatus] = useState<keyof typeof STATUS_TEXT | null>(null);
  const [saving, startSaving] = useTransition();

  function choose(id: ThemeId) {
    applyTheme(id);
    startSaving(async () => {
      const result = await saveThemePreference(id);
      setStatus(result.saved);
    });
  }

  return (
    <div className="py-4 md:py-7">
      <fieldset>
        <legend className="sr-only">Color theme</legend>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {THEMES.map((theme) => {
            const active = theme.id === selected;
            return (
              <label
                key={theme.id}
                className={`relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 bg-surface px-3 py-2.5 md:min-h-[4.5rem] md:gap-4 md:px-4 md:py-3 transition-[border-color,transform] duration-150 active:scale-[0.99] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white ${
                  active ? "[border-color:var(--swatch)] shadow-[0_0_0_1px_var(--swatch)]" : "border-transparent hover:border-white/20"
                }`}
                style={{ ["--swatch" as string]: theme.accent }}
              >
                <input
                  type="radio"
                  name="theme"
                  value={theme.id}
                  checked={active}
                  onChange={(event) => {
                    if (isThemeId(event.target.value)) choose(event.target.value);
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="inline-flex size-8 shrink-0 md:size-10 items-center justify-center rounded-full shadow-[0_0_14px_var(--swatch)]"
                  style={{ background: theme.accent, color: theme.ink }}
                >
                  {active ? <Check className="size-4" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-tight font-bold text-white md:text-base">
                    {theme.name}
                    {theme.id === DEFAULT_THEME ? (
                      <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-white/85">
                        Default
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 hidden text-sm text-white/75 md:block">{theme.note}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-3 min-h-5 text-sm text-white/75" role="status" aria-live="polite">
        {saving ? "Saving…" : status ? STATUS_TEXT[status] : "Changes apply instantly across the site."}
      </p>
    </div>
  );
}
