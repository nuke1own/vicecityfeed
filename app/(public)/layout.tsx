import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getPublishedFeed } from "@/lib/articles-server";
import { getLogoSrc } from "@/lib/logo";

export const revalidate = 60;

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const articles = await getPublishedFeed();
  const logoSrc = getLogoSrc();
  return (
    <>
      <Navbar articles={articles} logoSrc={logoSrc} />
      <div className="flex-1 min-w-0">{children}</div>
      <Footer logoSrc={logoSrc} />
    </>
  );
}
