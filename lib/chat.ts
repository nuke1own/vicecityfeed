/**
 * Direct-message types and helpers shared by the server and the browser.
 * No server-only imports here.
 */
import type { MessageReaction } from "./limits";

/** `key` identifies the file (its storage path), so a fresh signed link for the same file can be ignored. */
export type ChatImage = { kind: "image"; key: string; url: string; width: number | null; height: number | null; alt: string };
export type ChatVoice = { kind: "audio"; key: string; url: string; durationMs: number; peaks: number[] };
export type ChatAttachment = ChatImage | ChatVoice;

/** What a reply shows of the message it answers (null once that message is unsent). */
export type ChatReplyPreview = { id: string; senderId: string; text: string };

export type ChatReaction = { userId: string; emoji: MessageReaction };

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  replyTo: string | null;
  reply: ChatReplyPreview | null;
  attachments: ChatAttachment[];
  reactions: ChatReaction[];
};

/** Short description of a message for reply quotes and previews. */
export function messageSummary(message: { body: string; attachments: { kind: string }[] }): string {
  const text = message.body.trim();
  if (text) return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  const first = message.attachments[0];
  if (!first) return "Message";
  if (first.kind === "audio") return "🎤 Voice message";
  return message.attachments.length > 1 ? `📷 ${message.attachments.length} photos` : "📷 Photo";
}

export type TextPart = { kind: "text"; value: string } | { kind: "link"; value: string; href: string };

const LINK = /\b(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[a-z]{2,}[^\s<>"']*)/gi;

/** Splits text into plain parts and http(s) links (trailing punctuation stays text). */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    let value = match[0];
    const trailing = value.match(/[.,!?;:)\]]+$/)?.[0] ?? "";
    if (trailing) value = value.slice(0, -trailing.length);
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: "text", value: text.slice(last, start) });
    const href = value.startsWith("http") ? value : `https://${value}`;
    parts.push({ kind: "link", value, href });
    last = start + value.length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

/** True for short messages made only of emoji (shown large, without a bubble). */
export function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 24) return false;
  const stripped = trimmed.replace(/[\s‍️]/g, "");
  if (!/^\p{Extended_Pictographic}/u.test(stripped)) return false;
  const count = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed)].filter(
    (segment) => segment.segment.trim(),
  ).length;
  return count <= 3 && /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Emoji_Component}‍️\s]+$/u.test(trimmed);
}

/** Downsamples recorded loudness levels to `count` bars between 0.08 and 1. */
export function toPeaks(levels: number[], count: number): number[] {
  if (levels.length === 0) return Array.from({ length: count }, () => 0.08);
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const from = Math.floor((i / count) * levels.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) / count) * levels.length));
    const slice = levels.slice(from, to);
    out.push(Math.max(...slice));
  }
  const max = Math.max(...out, 0.0001);
  // Square root lifts quieter speech, so one loud moment does not flatten the rest.
  return out.map((value) => Math.round(Math.max(0.08, Math.min(1, Math.sqrt(value / max))) * 100) / 100);
}

/** "0:07", "1:42" */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
