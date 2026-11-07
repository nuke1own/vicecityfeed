import type { ReactNode } from "react";
import { InboxList } from "@/components/messages/InboxList";
import { MessagesFrame } from "@/components/messages/MessagesFrame";
import { getInbox } from "@/lib/messages";
import { getCurrentUser } from "@/lib/profiles";

export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const inbox = user ? await getInbox(user.id) : [];
  return (
    <MessagesFrame sidebar={user ? <InboxList entries={inbox} variant="sidebar" /> : null}>{children}</MessagesFrame>
  );
}
