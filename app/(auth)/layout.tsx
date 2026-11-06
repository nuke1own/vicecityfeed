import type { ReactNode } from "react";
import Link from "next/link";
import { ReleaseCountdown } from "@/components/ReleaseCountdown";
import { SiteLogo } from "@/components/SiteLogo";
import { getLogoSrc } from "@/lib/logo";
import { SITE } from "@/lib/site";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/editorial-guidelines/", label: "Editorial guidelines" },
  { href: "/rss.xml", label: "RSS feed" },
];

/** Standalone account pages: logo, card, footer. No site header or nav. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-backdrop flex min-h-dvh flex-col">
      <main
        id="main"
        className="flex flex-1 flex-col items-center px-4 pt-8 pb-12 sm:pt-14"
      >
        <div className="auth-countdown mb-6">
          <ReleaseCountdown />
        </div>
        <SiteLogo src={getLogoSrc()} />
        <div className="mt-8 flex w-full max-w-[500px] flex-col gap-5">{children}</div>
      </main>
      <footer className="px-4 pb-8 text-center text-[11px] font-semibold tracking-wide text-white/80 uppercase">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        {footerLinks.map((link) => (
          <span key={link.href}>
            <span aria-hidden className="mx-2">|</span>
            <Link href={link.href} className="text-white hover:text-vice-pink">
              {link.label}
            </Link>
          </span>
        ))}
      </footer>
    </div>
  );
}
