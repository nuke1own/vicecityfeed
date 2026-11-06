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
      <ul className="grid grid-cols-4 gap-1 rounded-2xl bg-surface p-1 md:flex md:flex-col md:bg-transparent md:p-0">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname === href.slice(0, -1);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors md:min-h-12 md:flex-row md:justify-start md:gap-3 md:px-4 md:text-base ${
                  active
                    ? "bg-raised text-white"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  aria-hidden
                  className={`size-5 shrink-0 ${active ? "text-vice-pink" : ""}`}
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
