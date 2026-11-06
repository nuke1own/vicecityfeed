"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { LOGO_PNG } from "@/lib/logo-paths";
import { sectionHome, samePath } from "@/lib/sections";
import { SITE } from "@/lib/site";

type SiteLogoProps = {
  src?: string;
  size?: "header" | "footer";
};

/**
 * The logo goes to the home of the current area: Articles normally, Social
 * on Social pages, Album on the Album page. On that home page itself it
 * reloads the page's data and scrolls to the top instead of navigating.
 */
export function SiteLogo({ src = LOGO_PNG, size = "header" }: SiteLogoProps) {
  const pathname = usePathname();
  const router = useRouter();
  const home = sectionHome(pathname);

  return (
    <Link
      href={home}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        if (samePath(pathname, home)) {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          router.refresh();
        }
      }}
      aria-label={home === "/" ? SITE.name : `${SITE.name}: reload ${home === "/social/" ? "Social" : "Album"}`}
      data-logo-home={home}
      className="site-logo-link inline-flex shrink-0 items-center"
    >
      <BrandMark src={src} size={size} className="site-logo-mark" />
    </Link>
  );
}
