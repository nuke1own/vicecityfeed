import type { Metadata } from "next";
import { LiveSectionFeed } from "@/components/LiveSectionFeed";
import { PageHeader } from "@/components/PageHeader";
import { getFeedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "The Map",
  description:
    "Leonida map lore: Vice City districts, the Keys, Grassrivers, and how GTA 6's state actually plays.",
};

export default function TheMapPage() {
  const articles = getFeedArticles();

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-6">
      <PageHeader
        kicker="GTA VI"
        title="The Map"
        description="Named places, the region they sit in, and the story that opens the door."
      />
      <LiveSectionFeed articles={articles} page="gta-vi" />
    </main>
  );
}
