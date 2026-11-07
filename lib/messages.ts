import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MESSAGE_REACTIONS, type MessageReaction } from "./limits";
import { messageSummary, type ChatAttachment, type ChatMessage } from "./chat";
import { createServerSupabase } from "./supabase-server";

export type { ChatMessage } from "./chat";

export const MESSAGE_MEDIA_BUCKET = "message-media";
/** Signed links to private photos and voice messages last an hour. */
const SIGNED_URL_SECONDS = 60 * 60;

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

export type Conversation = {
  id: string;
  other: { id: string; handle: string; displayName: string; avatarUrl: string | null };
  messages: ChatMessage[];
  /** When the other member last read the conversation (for "Seen"). */
  otherLastReadAt: string | null;
  /** When the media links were signed (ms since epoch). */
  signedAt: number;
};

/** Stored shape of one attachment in messages.attachments. */
export type StoredAttachment =
  | { kind: "image"; path: string; width?: number | null; height?: number | null }
  | { kind: "audio"; path: string; duration_ms?: number; peaks?: number[] };

export type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  reply_to: string | null;
  attachments: StoredAttachment[] | null;
};

export const MESSAGE_COLUMNS = "id, body, created_at, sender_id, reply_to, attachments";

function storedAttachments(row: MessageRow): StoredAttachment[] {
  return Array.isArray(row.attachments)
    ? row.attachments.filter((item): item is StoredAttachment => Boolean(item && typeof item.path === "string"))
    : [];
}

/** Signed links for every attachment path, in one request. */
async function signPaths(supabase: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  const { data } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) out.set(entry.path, entry.signedUrl);
  }
  return out;
}

/**
 * Turns stored rows into ChatMessages: signed media links, reactions and the
 * quoted message for replies. `senderHandle` names photos for their alt text.
 */
export async function hydrateMessages(
  supabase: SupabaseClient,
  rows: MessageRow[],
  handles: Map<string, string>,
): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const missingReplies = [
    ...new Set(rows.map((row) => row.reply_to).filter((id): id is string => Boolean(id) && !byId.has(id as string))),
  ];
  const [{ data: reactionRows }, { data: replyRows }] = await Promise.all([
    supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", rows.map((row) => row.id)),
    missingReplies.length
      ? supabase.from("messages").select(MESSAGE_COLUMNS).in("id", missingReplies)
      : Promise.resolve({ data: [] as MessageRow[] }),
  ]);
  for (const row of (replyRows ?? []) as MessageRow[]) byId.set(row.id, row);

  const signed = await signPaths(
    supabase,
    rows.flatMap((row) => storedAttachments(row).map((item) => item.path)),
  );

  const reactions = new Map<string, ChatMessage["reactions"]>();
  for (const row of (reactionRows ?? []) as { message_id: string; user_id: string; emoji: string }[]) {
    if (!(MESSAGE_REACTIONS as readonly string[]).includes(row.emoji)) continue;
    const list = reactions.get(row.message_id) ?? [];
    list.push({ userId: row.user_id, emoji: row.emoji as MessageReaction });
    reactions.set(row.message_id, list);
  }

  return rows.map((row) => {
    const handle = handles.get(row.sender_id) ?? "member";
    const attachments: ChatAttachment[] = [];
    for (const item of storedAttachments(row)) {
      const url = signed.get(item.path);
      if (!url) continue;
      if (item.kind === "audio") {
        attachments.push({
          kind: "audio",
          key: item.path,
          url,
          durationMs: Number(item.duration_ms) || 0,
          peaks: Array.isArray(item.peaks) ? item.peaks.filter((n) => typeof n === "number") : [],
        });
      } else {
        attachments.push({
          kind: "image",
          key: item.path,
          url,
          width: Number(item.width) || null,
          height: Number(item.height) || null,
          alt: `Photo from @${handle}`,
        });
      }
    }
    const target = row.reply_to ? byId.get(row.reply_to) : undefined;
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      senderId: row.sender_id,
      replyTo: row.reply_to,
      reply: target
        ? {
            id: target.id,
            senderId: target.sender_id,
            text: messageSummary({ body: target.body, attachments: storedAttachments(target) }),
          }
        : null,
      attachments,
      reactions: reactions.get(row.id) ?? [],
    };
  });
}

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
    .select("user_id, last_read_at")
    .eq("conversation_id", id);
  const other = (members ?? []).find((row) => row.user_id !== viewerId) as
    | { user_id: string; last_read_at: string | null }
    | undefined;
  if (!members?.length || !other) return null;

  const [{ data: profiles }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", [other.user_id, viewerId]),
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const profile = (profiles ?? []).find((row) => row.id === other.user_id);
  if (!profile) return null;
  const handles = new Map((profiles ?? []).map((row) => [row.id as string, row.handle as string]));

  return {
    id,
    other: {
      id: profile.id,
      handle: profile.handle,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    },
    messages: await hydrateMessages(supabase, ((rows ?? []) as MessageRow[]).reverse(), handles),
    otherLastReadAt: other.last_read_at,
    signedAt: Date.now(),
  };
}
