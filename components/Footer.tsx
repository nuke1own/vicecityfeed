import Link from "next/link";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { SiteLogo } from "@/components/SiteLogo";
import { SocialGlyph } from "@/components/SocialGlyph";
import { outlinePillClass } from "@/components/pills";
import { LOGO_PNG } from "@/lib/logo-paths";
import { FOOTER_SITEMAP, isLiveSocialHref, SITE, SOCIAL_LINKS } from "@/lib/site";

type FooterProps = {
  logoSrc?: string;
};

export function Footer({ logoSrc = LOGO_PNG }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-14 bg-ink pb-[env(safe-area-inset-bottom)] sm:mt-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:gap-10 sm:py-12 md:grid-cols-[minmax(0,1.15fr)_auto_minmax(0,1fr)] md:items-start md:gap-12 md:px-6">
        <div className="max-w-sm">
          <SiteLogo src={logoSrc} size="footer" />
          <p className="mt-4 text-sm leading-relaxed text-white">
            Independent editorial coverage of Leonida. Not affiliated with
            Rockstar Games or Take-Two Interactive.
          </p>
          <ul className="mt-6 flex gap-2">
            {SOCIAL_LINKS.map((link) => {
              const isRss = link.href.endsWith("/rss.xml") || link.label === "RSS";
              const live = isRss || isLiveSocialHref(link.href);
              if (isRss) {
                return (
                  <li key={link.label}>
                    <a
                      href="/rss.xml"
                      className={outlinePillClass("size-11")}
                      aria-label={link.label}
                    >
                      <SocialGlyph label={link.label} />
                    </a>
                  </li>
                );
              }
              if (!live) {
                return (
                  <li key={link.label}>
                    <span
                      className={outlinePillClass("size-11 cursor-default")}
                      aria-label={`${link.label}, soon`}
                      title={`${link.label} soon`}
                    >
                      <SocialGlyph label={link.label} />
                    </span>
                  </li>
                );
              }
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={outlinePillClass("size-11")}
                    {...(link.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    aria-label={link.label}
                  >
                    <SocialGlyph label={link.label} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <nav aria-label="Sitemap" className="text-sm">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white uppercase">
            Site
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {FOOTER_SITEMAP.map((item) => (
              <li key={item.href}>
                {item.href.endsWith("/rss.xml") ? (
                  <a href="/rss.xml" className="link-draw text-white">
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className="link-draw text-white">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <NewsletterCTA />
      </div>
      <div>
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs leading-relaxed text-white md:px-6">
          © {year} {SITE.name} · {SITE.domain} · All original editorial
          copyright {SITE.name}. Grand Theft Auto and Vice City are trademarks
          of their owners.
        </p>
      </div>
    </footer>
  );
}
