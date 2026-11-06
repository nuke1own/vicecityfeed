"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserRound, UsersRound } from "lucide-react";

const ITEMS = [
  { href: "/settings/profile/", label: "Profile", Icon: UserRound },
  { href: "/settings/security/", label: "Security", Icon: ShieldCheck },
  { href: "/settings/social/", label: "Social", Icon: UsersRound },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account settings">
      <ul className="grid grid-cols-3 gap-1.5 md:flex md:flex-col">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname === href.slice(0, -1);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-[15px] font-semibold md:justify-start md:gap-3.5 transition-colors md:min-h-16 md:px-5 md:text-lg ${
                  active
                    ? "bg-raised text-white"
                    : "text-white/85 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  aria-hidden
                  className={`size-5 md:size-6 ${active ? "text-vice-pink" : ""}`}
                  strokeWidth={1.75}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
