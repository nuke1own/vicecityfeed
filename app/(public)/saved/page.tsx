import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SavedFeed } from "@/components/SavedFeed";
import { getPublishedFeed } from "@/lib/articles-server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: "/saved/" },
  title: "Saved",
  description: "Stories you saved on Vice City Feed.",
};

export const revalidate = 60;

export default async function SavedPage() {
  const articles = await getPublishedFeed();

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-8 pb-12 sm:py-10 md:px-6 md:py-12">
      <PageHeader
        kicker="Saved"
        title="Saved"
        description="Stories you kept on this device."
      />
      <SavedFeed articles={articles} />
    </main>
  );
}
