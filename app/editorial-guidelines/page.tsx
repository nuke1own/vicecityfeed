import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Editorial Guidelines",
  description: `How ${SITE.name} sources GTA 6 leaks, labels rumor, and treats player spoilers.`,
};

export default function EditorialGuidelinesPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-6 sm:py-10 md:px-6">
      <PageHeader
        kicker="Standards"
        title="Editorial Guidelines"
        description="Vice City Feed is an independent desk. These rules are the product."
      />
      <article className="prose-vcf">
        <h2 id="affiliation">Affiliation</h2>
        <p>
          We are not affiliated with Rockstar Games, Take-Two Interactive, or
          any official Grand Theft Auto channel. Trademarks belong to their
          owners. Coverage is commentary, criticism, and player reporting.
        </p>
        <h2 id="leaks">Leaks and rumors</h2>
        <p>
          Trailer analysis is labeled as analysis. Unverified dumps are not
          republished. We do not pay for stolen assets or personal data. If a
          claim cannot be sourced, it stays off the site or sits in the rumor
          bin with that label.
        </p>
        <h2 id="spoilers">Spoilers</h2>
        <p>
          Reviews and character studies may spoil story beats. In-article
          spoilers use a reveal control. Headlines should not blow a twist when
          a warning will do.
        </p>
        <h2 id="corrections">Corrections</h2>
        <p>
          If we get map facts, leak status, or attribution wrong, we update the
          piece and note the change. Email the desk via the newsletter form
          with &quot;Correction&quot; in the body.
        </p>
        <h2 id="community">Community</h2>
        <p>
          Discord and X are distribution, not sourcing. A viral clip is not a
          citation. Be kind in the comments you control; we will not host
          harassment.
        </p>
      </article>
    </main>
  );
}
