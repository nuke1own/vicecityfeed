"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Palette, ShieldCheck, UserRound, UsersRound } from "lucide-react";

const ITEMS = [
  { href: "/settings/profile/", label: "Profile", Icon: UserRound },
  { href: "/settings/security/", label: "Security", Icon: ShieldCheck },
  { href: "/settings/social/", label: "Social", Icon: UsersRound },
  { href: "/settings/preferences/", label: "Preferences", Icon: Palette },
];

/** Settings tabs: one compact row on phones, a sidebar list from md up. */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account settings">
      <ul className="grid grid-cols-4 gap-1 rounded-2xl bg-surface p-1 md:flex md:flex-col md:gap-1.5 md:bg-transparent md:p-0">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname === href.slice(0, -1);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors md:min-h-16 md:flex-row md:justify-start md:gap-3.5 md:rounded-lg md:px-5 md:text-lg ${
                  active
                    ? "bg-raised text-white"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  aria-hidden
                  className={`size-5 shrink-0 md:size-6 ${active ? "text-vice-pink" : ""}`}
                  strokeWidth={1.75}
                />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
