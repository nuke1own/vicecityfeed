import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { ChatThread } from "@/components/messages/ChatThread";
import { getConversation } from "@/lib/messages";
import { getCurrentUser } from "@/lib/profiles";

export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };

type ConversationPageProps = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login/?next=/social/messages/${id}/`);
  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();
  const { other } = conversation;

  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col md:border-x md:border-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 px-2 py-1.5">
        <Link href="/social/messages/" aria-label="Back to messages" className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <Link href={`/u/${other.handle}/`} className="flex min-w-0 items-center gap-2.5 rounded-full pr-3 hover:bg-white/5">
          <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={36} />
          <span className="min-w-0">
            <h1 className="truncate text-base leading-tight font-bold text-white">{other.displayName}</h1>
            <span className="block truncate text-xs text-white/60">@{other.handle}</span>
          </span>
        </Link>
      </div>
      <ChatThread
        conversationId={conversation.id}
        viewerId={user.id}
        otherName={other.displayName}
        messages={conversation.messages}
      />
    </main>
  );
}
