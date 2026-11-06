import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ModerationActions } from "@/components/moderation/ModerationActions";
import { RelativeTime } from "@/components/social/RelativeTime";
import { getReportQueue, isStaffRole } from "@/lib/moderation";
import { getCurrentProfile } from "@/lib/profiles";

export const metadata: Metadata = { title: "Moderation", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ tab?: string }> };

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  copyright: "Copyright",
  other: "Other",
};

/** Staff only: reported posts waiting for a decision, and posts already hidden. */
export default async function ModerationPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) notFound();
  const tab = (await searchParams).tab === "resolved" ? "resolved" : "open";
  const items = await getReportQueue(tab);
  const tabClass = (active: boolean) =>
    `relative flex min-h-12 flex-1 items-center justify-center text-[15px] font-bold ${active ? "text-white" : "text-white/60 hover:bg-white/5"}`;

  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 px-2 py-2">
        <Link href="/social/" aria-label="Back to Social" className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white">Moderation</h1>
          <p className="text-xs text-white/60">Reported posts. Only staff can see this page.</p>
        </div>
      </div>
      <nav aria-label="Report status" className="flex border-b border-white/10">
        {(["open", "resolved"] as const).map((name) => (
          <Link key={name} href={name === "open" ? "/social/moderation/" : "/social/moderation/?tab=resolved"} aria-current={tab === name ? "page" : undefined} className={tabClass(tab === name)}>
            {name === "open" ? "Needs review" : "Hidden"}
            {tab === name ? <span aria-hidden className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-vice-pink" /> : null}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-vice-pink/15 text-vice-pink">
            <ShieldCheck aria-hidden className="size-8" />
          </span>
          <p className="mt-4 text-xl font-extrabold text-white">{tab === "open" ? "All clear" : "Nothing hidden"}</p>
          <p className="mt-1 text-sm text-white/70">{tab === "open" ? "No reports need a decision right now." : "Hidden posts will be listed here."}</p>
        </div>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.postId} className="border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/u/${item.authorHandle}/`} className="font-bold text-white hover:underline">
                  {item.authorName}
                </Link>
                <span className="text-white/60">@{item.authorHandle}</span>
                <span aria-hidden className="text-white/40">·</span>
                <RelativeTime iso={item.postCreatedAt} className="text-white/60" />
                {item.hidden ? <span className="rounded-full bg-[#c62f35]/20 px-2 py-0.5 text-xs font-bold text-[#ff8a8a]">Hidden</span> : null}
              </div>
              <p className="mt-2 rounded-xl border border-white/10 bg-surface px-4 py-3 text-[15px] break-words whitespace-pre-wrap text-white">{item.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-white/80">
                  {item.reportCount} {item.reportCount === 1 ? "report" : "reports"}:
                </span>
                {item.reasons.map((reason) => (
                  <span key={reason} className="rounded-full border border-white/15 px-2.5 py-1 font-semibold text-white">
                    {REASON_LABEL[reason] ?? reason}
                  </span>
                ))}
                <span className="text-white/60">
                  last <RelativeTime iso={item.lastReportedAt} />
                </span>
              </div>
              <div className="mt-3">
                <ModerationActions postId={item.postId} hidden={item.hidden} resolved={tab === "resolved"} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
