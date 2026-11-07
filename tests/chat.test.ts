import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration, isEmojiOnly, linkify, messageSummary, toPeaks } from "../lib/chat";
import { sniffAudioType } from "../lib/media-sniff";

test("links in messages are found, with trailing punctuation left as text", () => {
  assert.deepEqual(linkify("see https://vicecityfeed.com/social, ok"), [
    { kind: "text", value: "see " },
    { kind: "link", value: "https://vicecityfeed.com/social", href: "https://vicecityfeed.com/social" },
    { kind: "text", value: ", ok" },
  ]);
  assert.deepEqual(linkify("www.rockstargames.com/VI!"), [
    { kind: "link", value: "www.rockstargames.com/VI", href: "https://www.rockstargames.com/VI" },
    { kind: "text", value: "!" },
  ]);
  assert.deepEqual(linkify("javascript:alert(1)"), [{ kind: "text", value: "javascript:alert(1)" }]);
  assert.deepEqual(linkify("no links here"), [{ kind: "text", value: "no links here" }]);
});

test("short emoji-only messages are detected", () => {
  for (const yes of ["🔥", "🔥🔥🔥", "❤️", "👍🏽", "👨‍👩‍👧"]) assert.equal(isEmojiOnly(yes), true, yes);
  for (const no of ["🔥🔥🔥🔥", "lol 🔥", "123", "", "#1"]) assert.equal(isEmojiOnly(no), false, no);
});

test("previews describe photos and voice messages", () => {
  assert.equal(messageSummary({ body: "  hi  ", attachments: [] }), "hi");
  assert.equal(messageSummary({ body: "", attachments: [{ kind: "audio" }] }), "🎤 Voice message");
  assert.equal(messageSummary({ body: "", attachments: [{ kind: "image" }, { kind: "image" }] }), "📷 2 photos");
  assert.equal(messageSummary({ body: "x".repeat(200), attachments: [] }).length, 118);
});

test("voice waveforms have the requested bars, scaled to 0.08-1", () => {
  const peaks = toPeaks([0, 0.1, 0.5, 1, 0.2, 0.05], 4);
  assert.equal(peaks.length, 4);
  assert.ok(peaks.every((value) => value >= 0.08 && value <= 1));
  assert.equal(Math.max(...peaks), 1);
  assert.deepEqual(toPeaks([], 3), [0.08, 0.08, 0.08]);
  assert.equal(formatDuration(65_000), "1:05");
  assert.equal(formatDuration(400), "0:00");
});

test("voice recordings are recognised by their bytes", () => {
  const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
  assert.deepEqual(sniffAudioType(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0])), { type: "audio/webm", ext: "webm" });
  assert.deepEqual(sniffAudioType(new Uint8Array([0, 0, 0, 0x18, ...ascii("ftypM4A "), 0])), { type: "audio/mp4", ext: "m4a" });
  assert.deepEqual(sniffAudioType(new Uint8Array(ascii("OggS\0\0"))), { type: "audio/ogg", ext: "ogg" });
  assert.equal(sniffAudioType(new Uint8Array(ascii("<script>alert(1)</script>"))), null);
});

test("direct message input: text optional, reply ids and reactions checked", async () => {
  const { chatMessageSchema, messageReactionSchema, voiceMetaSchema } = await import("../lib/community-validation");
  const id = "8b7c1b7e-2f7e-4c8a-9a51-3f2a1d6c9e10";
  assert.equal(chatMessageSchema.parse({ conversationId: id, body: "  yo  ", replyTo: null }).body, "yo");
  assert.equal(chatMessageSchema.safeParse({ conversationId: id, body: "", replyTo: null }).success, true);
  assert.equal(chatMessageSchema.safeParse({ conversationId: id, body: "x".repeat(1001), replyTo: null }).success, false);
  assert.equal(chatMessageSchema.safeParse({ conversationId: id, body: "hi", replyTo: "nope" }).success, false);
  assert.equal(messageReactionSchema.safeParse({ messageId: id, emoji: "🔥" }).success, true);
  assert.equal(messageReactionSchema.safeParse({ messageId: id, emoji: null }).success, true);
  assert.equal(messageReactionSchema.safeParse({ messageId: id, emoji: "💩" }).success, false);
  assert.equal(voiceMetaSchema.safeParse({ durationMs: "4200", peaks: [0.1, 1] }).success, true);
  assert.equal(voiceMetaSchema.safeParse({ durationMs: 200, peaks: [] }).success, false);
  assert.equal(voiceMetaSchema.safeParse({ durationMs: 200_000, peaks: [] }).success, false);
  assert.equal(voiceMetaSchema.safeParse({ durationMs: 3000, peaks: Array(41).fill(0.5) }).success, false);
});
