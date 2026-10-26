"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { LOGO_PNG } from "@/lib/logo-paths";
import { SITE } from "@/lib/site";

type SiteLogoProps = {
  src?: string;
  size?: "header" | "footer";
};

export function SiteLogo({ src = LOGO_PNG, size = "header" }: SiteLogoProps) {
  return (
    <Link
      href="/"
      scroll={true}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label={SITE.name}
      className="site-logo-link inline-flex shrink-0 items-center"
    >
      <BrandMark src={src} size={size} className="site-logo-mark" />
    </Link>
  );
}
