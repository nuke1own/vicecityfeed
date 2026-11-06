import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Navbar } from "@/components/Navbar";
import { SiteLogo } from "@/components/SiteLogo";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { getPublishedFeed } from "@/lib/articles-server";
import { getLogoSrc } from "@/lib/logo";

/**
 * Account pages.
 * Phones: no site header or footer, just a slim bar with the logo centred and
 * a way back, plus the tab bar. Tablet and desktop: the normal site header
 * and footer.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const articles = await getPublishedFeed();
  const logoSrc = getLogoSrc();

  return (
    <>
      <div className="account-bar sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-md md:hidden">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full px-2 text-sm font-semibold text-white hover:text-vice-pink focus-visible:outline-2 focus-visible:outline-white"
          >
            <ArrowLeft aria-hidden className="size-5" />
            <span className="max-[359px]:sr-only">Back to site</span>
          </Link>
          <div className="account-logo">
            <SiteLogo src={logoSrc} size="footer" />
          </div>
          <span aria-hidden />
        </div>
      </div>
      {/* display: contents keeps the header sticky on larger screens. */}
      <div className="hidden md:contents">
        <Navbar articles={articles} logoSrc={logoSrc} />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 pt-4 pb-10 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-12 md:px-6 md:py-10 lg:gap-20">
        <aside className="min-w-0 md:sticky md:top-48 md:self-start">
          <SettingsNav />
        </aside>
        <main id="main" className="min-w-0 space-y-7 md:space-y-10 md:pb-12">
          {children}
        </main>
      </div>

      <div className="hidden md:block">
        <Footer logoSrc={logoSrc} />
      </div>
      <div aria-hidden className="mobile-tab-spacer md:hidden" />
      <MobileTabBar />
    </>
  );
}
