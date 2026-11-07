import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChatScreen } from "@/components/messages/ChatScreen";
import { getConversation } from "@/lib/messages";
import { getCurrentProfile } from "@/lib/profiles";

export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };

type ConversationPageProps = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login/?next=${encodeURIComponent(`/social/messages/${id}/`)}`);
  const conversation = await getConversation(id, profile.id);
  if (!conversation) notFound();

  return (
    <main id="main" className="chat-main mx-auto flex w-full max-w-2xl flex-col md:border-x md:border-white/10">
      <ChatScreen
        conversationId={conversation.id}
        viewer={{ id: profile.id, handle: profile.handle }}
        other={conversation.other}
        messages={conversation.messages}
        otherLastReadAt={conversation.otherLastReadAt}
        signedAt={conversation.signedAt}
        viewerLastReadAt={conversation.viewerLastReadAt}
        hasMore={conversation.hasMore}
        muted={conversation.muted}
        iBlocked={conversation.iBlocked}
        blockedMe={conversation.blockedMe}
      />
    </main>
  );
}
