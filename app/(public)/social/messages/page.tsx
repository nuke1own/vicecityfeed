import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { InboxList } from "@/components/messages/InboxList";
import { NewMessageButton } from "@/components/messages/NewMessageButton";
import { getInbox } from "@/lib/messages";
import { getCurrentUser } from "@/lib/profiles";

export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

type MessagesPageProps = { searchParams: Promise<{ error?: string }> };

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login/?next=/social/messages/");
  const [{ error }, inbox] = await Promise.all([searchParams, getInbox(user.id)]);

  return (
    <main id="main" className="messages-pane mx-auto flex w-full max-w-2xl lg:max-w-[calc(22rem+42rem)]">
      <section aria-label="Your conversations" className="flex w-full min-w-0 flex-col pb-6 md:border-x md:border-white/10 lg:w-[22rem] lg:shrink-0 lg:border-r-0 lg:pb-0">
        {error === "start" ? (
          <p role="alert" className="mx-4 mt-4 rounded-xl border border-[#ff8a8a]/40 bg-[#ff8a8a]/10 px-4 py-3 text-sm font-semibold text-white">
            We could not open that conversation. Please try again.
          </p>
        ) : null}
        <InboxList entries={inbox} variant="page" />
      </section>
      {/* Desktop: the space where a conversation opens. */}
      <div className="hidden flex-1 flex-col items-center justify-center border-x border-white/10 px-8 text-center lg:flex">
        <span className="grid size-16 place-items-center rounded-full bg-white/[0.06]">
          <MessagesSquare aria-hidden className="size-7 text-white/80" />
        </span>
        <p className="mt-4 text-xl font-extrabold text-white">Your messages</p>
        <p className="mt-1 max-w-xs text-sm text-white/65">Pick a conversation, or start a new one with anyone on Vice City Feed.</p>
        <NewMessageButton />
      </div>
    </main>
  );
}
