import "server-only";
import { createServerSupabase } from "./supabase-server";

export type InboxEntry = {
  conversationId: string;
  lastMessageAt: string;
  otherId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  lastBody: string | null;
  lastFromMe: boolean;
  unread: boolean;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
};

export type Conversation = {
  id: string;
  other: { id: string; handle: string; displayName: string; avatarUrl: string | null };
  messages: ChatMessage[];
};

type InboxRow = {
  conversation_id: string;
  last_message_at: string;
  other_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  last_body: string | null;
  last_sender_id: string | null;
  unread: boolean;
};

export async function getInbox(viewerId: string): Promise<InboxEntry[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("get_inbox");
  return ((data ?? []) as InboxRow[]).map((row) => ({
    conversationId: row.conversation_id,
    lastMessageAt: row.last_message_at,
    otherId: row.other_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    lastBody: row.last_body,
    lastFromMe: row.last_sender_id === viewerId,
    unread: row.unread,
  }));
}

/** A conversation the viewer belongs to (RLS returns nothing otherwise). */
export async function getConversation(id: string, viewerId: string): Promise<Conversation | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createServerSupabase();
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", id);
  const otherId = (members ?? []).map((row) => row.user_id as string).find((uid) => uid !== viewerId);
  if (!members?.length || !otherId) return null;

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select("id, body, created_at, sender_id")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (!profile) return null;

  return {
    id,
    other: {
      id: profile.id,
      handle: profile.handle,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    },
    messages: (rows ?? [])
      .map((row) => ({
        id: row.id as string,
        body: row.body as string,
        createdAt: row.created_at as string,
        senderId: row.sender_id as string,
      }))
      .reverse(),
  };
}
