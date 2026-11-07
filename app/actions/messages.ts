"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  chatMessageSchema,
  messageReactionSchema,
  voiceMetaSchema,
} from "@/lib/community-validation";
import type { ChatMessage } from "@/lib/chat";
import { sniffImageType } from "@/lib/image-sniff";
import { MESSAGE_IMAGE_MAX, MESSAGE_MEDIA_BYTES, POST_IMAGE_TYPES } from "@/lib/limits";
import { sniffAudioType } from "@/lib/media-sniff";
import {
  hydrateMessages,
  MESSAGE_COLUMNS,
  MESSAGE_MEDIA_BUCKET,
  type MessageRow,
  type StoredAttachment,
} from "@/lib/messages";
import { getCurrentProfile } from "@/lib/profiles";
import { removeQueuedImageFiles } from "@/lib/storage-cleanup";
import { createServerSupabase } from "@/lib/supabase-server";

/** Opens (or creates) the one-to-one conversation with another member. */
export async function startConversation(otherId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login/?next=/social/messages/");
  if (!z.uuid().safeParse(otherId).success || otherId === profile.id) redirect("/social/messages/");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("start_conversation", { p_other: otherId });
  if (error || typeof data !== "string") redirect("/social/messages/?error=start");
  redirect(`/social/messages/${data}/`);
}

export type SendMessageResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string; signedOut?: boolean };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

type StoredMeta =
  | { kind: "image"; width: number | null; height: number | null }
  | { kind: "audio"; duration_ms: number; peaks: number[] };
type Upload = { bytes: Uint8Array; type: string; ext: string; stored: StoredMeta };

/** Reads and checks attached photos or a voice message from the form. */
async function readUploads(formData: FormData): Promise<Upload[] | string> {
  const images = formData.getAll("image").filter((file): file is File => file instanceof File && file.size > 0);
  const voice = formData.get("voice");
  const hasVoice = voice instanceof File && voice.size > 0;
  if (images.length > MESSAGE_IMAGE_MAX) return `You can send up to ${MESSAGE_IMAGE_MAX} photos at a time.`;
  if (hasVoice && images.length) return "Send the voice message on its own.";

  const uploads: Upload[] = [];
  const widths = formData.getAll("imageWidth");
  const heights = formData.getAll("imageHeight");
  for (const [index, file] of images.entries()) {
    if (file.size > MESSAGE_MEDIA_BYTES) return "Photos can be at most 5 MB each.";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) return "Photos must be JPG, PNG, WebP or GIF.";
    const width = Math.round(Number(widths[index])) || null;
    const height = Math.round(Number(heights[index])) || null;
    uploads.push({
      bytes,
      type,
      ext: POST_IMAGE_TYPES[type],
      stored: {
        kind: "image",
        width: width && width > 0 && width <= 10000 ? width : null,
        height: height && height > 0 && height <= 10000 ? height : null,
      },
    });
  }

  if (hasVoice) {
    if (voice.size > MESSAGE_MEDIA_BYTES) return "That voice message is too long.";
    const bytes = new Uint8Array(await voice.arrayBuffer());
    const sniffed = sniffAudioType(bytes);
    if (!sniffed) return "That voice message could not be read.";
    let peaks: unknown = [];
    try {
      peaks = JSON.parse(text(formData, "voicePeaks") || "[]");
    } catch {
      peaks = [];
    }
    const meta = voiceMetaSchema.safeParse({ durationMs: text(formData, "voiceDuration"), peaks });
    if (!meta.success) return meta.error.issues[0].message;
    uploads.push({
      bytes,
      type: sniffed.type,
      ext: sniffed.ext,
      stored: { kind: "audio", duration_ms: meta.data.durationMs, peaks: meta.data.peaks },
    });
  }
  return uploads;
}

function describeSendError(message: string): string {
  if (message.includes("rate_limited")) return "You are sending messages too fast. Wait a moment.";
  if (message.includes("reply_target_missing")) return "The message you replied to was unsent.";
  if (message.includes("invalid_attachment")) return "That attachment could not be sent.";
  return "Your message was not sent. Please try again.";
}

/** Sends a message with optional photos or a voice message, and an optional reply target. */
export async function sendChatMessage(formData: FormData): Promise<SendMessageResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to send messages.", signedOut: true };
  const parsed = chatMessageSchema.safeParse({
    conversationId: text(formData, "conversationId"),
    body: text(formData, "body"),
    replyTo: text(formData, "replyTo") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { conversationId, body, replyTo } = parsed.data;

  const uploads = await readUploads(formData);
  if (typeof uploads === "string") return { ok: false, error: uploads };
  if (!body && uploads.length === 0) return { ok: false, error: "Write a message first." };

  const supabase = await createServerSupabase();
  const bucket = supabase.storage.from(MESSAGE_MEDIA_BUCKET);
  const stored: StoredAttachment[] = [];
  const paths: string[] = [];
  for (const upload of uploads) {
    // Files go in the conversation's folder; storage only accepts members.
    const path = `${conversationId}/${crypto.randomUUID()}.${upload.ext}`;
    const { error } = await bucket.upload(path, upload.bytes, { contentType: upload.type, upsert: false });
    if (error) {
      if (paths.length) await bucket.remove(paths);
      return { ok: false, error: "Your attachment could not be uploaded. Please try again." };
    }
    paths.push(path);
    stored.push({ ...upload.stored, path });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: profile.id, body, reply_to: replyTo, attachments: stored })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !data) {
    if (paths.length) await bucket.remove(paths);
    return { ok: false, error: describeSendError(error?.message ?? "") };
  }

  const [message] = await hydrateMessages(supabase, [data as MessageRow], new Map([[profile.id, profile.handle]]));
  revalidatePath("/social/messages");
  return { ok: true, message };
}

/** Sets (or with null, removes) the viewer's reaction on a message. */
export async function reactToMessage(messageId: string, emoji: string | null): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  const parsed = messageReactionSchema.safeParse({ messageId, emoji });
  if (!profile || !parsed.success) return { ok: false };
  const supabase = await createServerSupabase();
  const reactions = supabase.from("message_reactions");
  const { error } = parsed.data.emoji
    ? await reactions.upsert(
        { message_id: parsed.data.messageId, user_id: profile.id, emoji: parsed.data.emoji, created_at: new Date().toISOString() },
        { onConflict: "message_id,user_id" },
      )
    : await reactions.delete().eq("message_id", parsed.data.messageId).eq("user_id", profile.id);
  return { ok: !error };
}

/** Unsends one of the viewer's messages, with its photos or voice message. */
export async function unsendMessage(messageId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile || !z.uuid().safeParse(messageId).success) return { ok: false };
  const supabase = await createServerSupabase();
  // RLS lets senders delete only their own messages.
  const { error, count } = await supabase
    .from("messages")
    .delete({ count: "exact" })
    .eq("id", messageId)
    .eq("sender_id", profile.id);
  if (error || !count) return { ok: false };
  // The database queued the message's files; remove them from Storage now.
  await removeQueuedImageFiles(supabase);
  revalidatePath("/social/messages");
  return { ok: true };
}

/** Marks a conversation read for the viewer (unread badge, inbox dot and "Seen"). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !z.uuid().safeParse(conversationId).success) return;
  const supabase = await createServerSupabase();
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", profile.id);
}
