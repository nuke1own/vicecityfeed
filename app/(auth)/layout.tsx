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
        className="flex flex-1 flex-col items-center px-4 pt-[max(2rem,calc(env(safe-area-inset-top)+1rem))] pb-12 sm:pt-14"
      >
        <div className="auth-countdown mb-6">
          <ReleaseCountdown />
        </div>
        <SiteLogo src={getLogoSrc()} />
        <div className="mt-8 flex w-full max-w-[500px] flex-col gap-5">{children}</div>
      </main>
      <footer className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-xs font-semibold tracking-wide text-white/80 uppercase">
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-1">
          {footerLinks.map((link, index) => (
            <span key={link.href} className="inline-flex items-center">
              {index > 0 ? <span aria-hidden className="mx-1 text-white/40">|</span> : null}
              <Link href={link.href} className="inline-flex min-h-11 items-center px-2 text-white hover:text-vice-pink">
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
        <p className="mt-1">© {new Date().getFullYear()} {SITE.name}</p>
      </footer>
    </div>
  );
}
