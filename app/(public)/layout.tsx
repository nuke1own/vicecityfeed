import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getArticleMeta } from "@/lib/articles";
import { getLogoSrc } from "@/lib/logo";
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <><Navbar articles={getArticleMeta()} logoSrc={getLogoSrc()} /><div className="flex-1 min-w-0">{children}</div><Footer logoSrc={getLogoSrc()} /></>;
}
