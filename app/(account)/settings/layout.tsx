import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteLogo } from "@/components/SiteLogo";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { getLogoSrc } from "@/lib/logo";

/**
 * Account pages: no site header or footer. A slim bar with the logo in the
 * centre and a way back to the site, then the settings tabs and content.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="account-bar sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-3 md:h-[4.5rem] md:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full px-2 text-sm font-semibold text-white hover:text-vice-pink focus-visible:outline-2 focus-visible:outline-white"
          >
            <ArrowLeft aria-hidden className="size-5" />
            <span className="max-[359px]:sr-only">Back to site</span>
          </Link>
          <div className="account-logo">
            <SiteLogo src={getLogoSrc()} size="footer" />
          </div>
          <span aria-hidden />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 pt-4 pb-10 md:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] md:gap-10 md:px-6 md:pt-8">
        <aside className="min-w-0 md:sticky md:top-24 md:self-start">
          <SettingsNav />
        </aside>
        <main id="main" className="min-w-0 space-y-7">
          {children}
        </main>
      </div>

      <div aria-hidden className="mobile-tab-spacer md:hidden" />
      <MobileTabBar />
    </>
  );
}
