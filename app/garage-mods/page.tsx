import type { Metadata } from "next";
import { LiveSectionFeed } from "@/components/LiveSectionFeed";
import { PageHeader } from "@/components/PageHeader";
import { getFeedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Garage & Mods",
  description:
    "GTA 6 vehicle customization, weapons benches, marina garages, and the PC mod scene after launch.",
};

export default function GarageModsPage() {
  const articles = getFeedArticles();

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-6">
      <PageHeader
        kicker="Vehicles"
        title="Garage & Mods"
        description="Vehicle, class, and the one number that matters on the bench."
      />
      <LiveSectionFeed articles={articles} page="vehicles" />
    </main>
  );
}
