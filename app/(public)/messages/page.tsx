import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/account/Avatar";
import { RelativeTime } from "@/components/social/RelativeTime";
import { getInbox } from "@/lib/messages";
import { getCurrentUser } from "@/lib/profiles";

export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

type MessagesPageProps = { searchParams: Promise<{ error?: string }> };

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login/?next=/messages/");
  const [{ error }, inbox] = await Promise.all([searchParams, getInbox(user.id)]);

  return (
    <main id="main" className="mx-auto w-full max-w-2xl pb-10 md:border-x md:border-white/10">
      <div className="border-b border-white/10 px-4 py-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">Messages</h1>
        <p className="text-sm text-white/70">Private conversations with other members.</p>
      </div>
      {error === "start" ? (
        <p role="alert" className="mx-4 mt-4 rounded-xl border border-[#ff8a8a]/40 bg-[#ff8a8a]/10 px-4 py-3 text-sm font-semibold text-white">
          We could not open that conversation. Please try again.
        </p>
      ) : null}
      {inbox.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <p className="text-lg font-bold text-white">No messages yet</p>
          <p className="mt-1 text-sm text-white/70">
            Open someone&apos;s profile and tap Message to start a conversation.
          </p>
          <Link href="/social/" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-vice-pink px-5 text-sm font-bold text-accent-ink hover:bg-white">
            Find people on Social
          </Link>
        </div>
      ) : (
        <ul>
          {inbox.map((entry) => (
            <li key={entry.conversationId} className="border-b border-white/10">
              <Link
                href={`/messages/${entry.conversationId}/`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
              >
                <Avatar displayName={entry.displayName} avatarUrl={entry.avatarUrl} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className={`truncate text-[15px] text-white ${entry.unread ? "font-extrabold" : "font-bold"}`}>{entry.displayName}</span>
                    <span className="truncate text-sm text-white/60">@{entry.handle}</span>
                    <span aria-hidden className="text-white/40">·</span>
                    <RelativeTime iso={entry.lastMessageAt} className="shrink-0 text-sm text-white/60" />
                  </span>
                  <span className={`block truncate text-sm ${entry.unread ? "font-semibold text-white" : "text-white/70"}`}>
                    {entry.lastBody ? `${entry.lastFromMe ? "You: " : ""}${entry.lastBody}` : "No messages yet"}
                  </span>
                </span>
                {entry.unread ? (
                  <span className="size-2.5 shrink-0 rounded-full bg-vice-pink">
                    <span className="sr-only">Unread</span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
