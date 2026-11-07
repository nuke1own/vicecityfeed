import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MESSAGE_PAGE_SIZE, MESSAGE_REACTIONS, type MessageReaction } from "./limits";
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
  /** Your last message has been read by them. */
  lastSeen: boolean;
  unread: boolean;
  unreadCount: number;
  muted: boolean;
  /** A block stands between you (either way). */
  blocked: boolean;
};

export type Conversation = {
  id: string;
  other: { id: string; handle: string; displayName: string; avatarUrl: string | null };
  messages: ChatMessage[];
  /** When the other member last read the conversation (for "Seen"). */
  otherLastReadAt: string | null;
  /** When you last read it, before opening it now (for the "New messages" line). */
  viewerLastReadAt: string | null;
  /** Older messages exist beyond this page. */
  hasMore: boolean;
  muted: boolean;
  /** You blocked them / they blocked you. */
  iBlocked: boolean;
  blockedMe: boolean;
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
  edited_at?: string | null;
};

export const MESSAGE_COLUMNS = "id, body, created_at, sender_id, reply_to, attachments, edited_at";

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
      editedAt: row.edited_at ?? null,
    };
  });
}

/** Handles of a conversation's members, for photo alt text. */
async function memberHandles(supabase: SupabaseClient, conversationId: string): Promise<Map<string, string>> {
  const { data: members } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId);
  const ids = (members ?? []).map((row) => row.user_id as string);
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, handle").in("id", ids);
  return new Map((data ?? []).map((row) => [row.id as string, row.handle as string]));
}

/** One page of messages sent before `before` (oldest first), and whether more exist. */
export async function getEarlierMessages(
  conversationId: string,
  before: string,
  viewerId: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean; signedAt: number }> {
  const supabase = await createServerSupabase();
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("cleared_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", viewerId)
    .maybeSingle();
  let query = supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .lt("created_at", before);
  // "Delete chat" hides everything up to that moment, for you only.
  if (mine?.cleared_at) query = query.gt("created_at", mine.cleared_at);
  const { data } = await query.order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1);
  const rows = (data ?? []) as MessageRow[];
  const page = rows.slice(0, MESSAGE_PAGE_SIZE).reverse();
  return {
    messages: await hydrateMessages(supabase, page, await memberHandles(supabase, conversationId)),
    hasMore: rows.length > MESSAGE_PAGE_SIZE,
    signedAt: Date.now(),
  };
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
  last_created_at?: string | null;
  other_last_read_at?: string | null;
  unread: boolean;
  unread_count?: number | null;
  muted?: boolean | null;
  blocked?: boolean | null;
};

/** The viewer's conversations (cached per request: the layout and page share it). */
export const getInbox = cache(async function getInbox(viewerId: string): Promise<InboxEntry[]> {
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
    lastSeen: Boolean(
      row.last_sender_id === viewerId &&
        row.last_created_at &&
        row.other_last_read_at &&
        row.other_last_read_at >= row.last_created_at,
    ),
    unread: row.unread,
    unreadCount: Math.max(row.unread ? 1 : 0, Number(row.unread_count) || 0),
    muted: Boolean(row.muted),
    blocked: Boolean(row.blocked),
  }));
});

/** A conversation the viewer belongs to (RLS returns nothing otherwise). */
export async function getConversation(id: string, viewerId: string): Promise<Conversation | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createServerSupabase();
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id, last_read_at, muted, cleared_at")
    .eq("conversation_id", id);
  const other = (members ?? []).find((row) => row.user_id !== viewerId) as
    | { user_id: string; last_read_at: string | null }
    | undefined;
  const mine = (members ?? []).find((row) => row.user_id === viewerId) as
    | { last_read_at: string | null; muted: boolean | null; cleared_at: string | null }
    | undefined;
  let messageQuery = supabase.from("messages").select(MESSAGE_COLUMNS).eq("conversation_id", id);
  if (mine?.cleared_at) messageQuery = messageQuery.gt("created_at", mine.cleared_at);
  if (!members?.length || !other) return null;

  const [{ data: profiles }, { data: rows }, { data: blocks }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", [other.user_id, viewerId]),
    messageQuery.order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1),
    supabase.rpc("block_status", { p_other: other.user_id }),
  ]);
  const block = (Array.isArray(blocks) ? blocks[0] : blocks) as { i_blocked?: boolean; blocked_me?: boolean } | null;
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
    messages: await hydrateMessages(supabase, ((rows ?? []) as MessageRow[]).slice(0, MESSAGE_PAGE_SIZE).reverse(), handles),
    otherLastReadAt: other.last_read_at,
    viewerLastReadAt: mine?.last_read_at ?? null,
    hasMore: (rows ?? []).length > MESSAGE_PAGE_SIZE,
    muted: Boolean(mine?.muted),
    iBlocked: Boolean(block?.i_blocked),
    blockedMe: Boolean(block?.blocked_me),
    signedAt: Date.now(),
  };
}
