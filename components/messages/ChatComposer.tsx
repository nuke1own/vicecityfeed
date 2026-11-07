"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, Mic, Pencil, SendHorizontal, Smile, Trash2, X } from "lucide-react";
import { EmojiPicker } from "@/components/messages/EmojiPicker";
import { useVoiceRecorder, voiceRecordingSupported, type VoiceClip } from "@/components/messages/useVoiceRecorder";
import { prepareImage, type PreparedImage } from "@/components/social/prepare-image";
import { formatDuration, messageSummary, type ChatMessage } from "@/lib/chat";
import { MESSAGE_IMAGE_MAX, MESSAGE_MAX_LENGTH, MESSAGE_MEDIA_BYTES, VOICE_MAX_MS, VOICE_MIN_MS } from "@/lib/limits";

export type OutgoingMessage = { body: string; images: PreparedImage[]; voice: VoiceClip | null; replyTo: ChatMessage | null };

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

function draftKey(conversationId: string) {
  return `vcf-dm-draft:${conversationId}`;
}

const toolButton =
  "tap-press grid size-10 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white";

/**
 * The message box: photos, emoji, voice messages, replies and drafts. Sending
 * is optimistic: the parent shows the message right away.
 */
export function ChatComposer({
  conversationId,
  otherName,
  viewerId,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  focusSignal,
  editing,
  onCancelEdit,
  onSaveEdit,
  onEditLast,
}: {
  conversationId: string;
  otherName: string;
  viewerId: string;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (message: OutgoingMessage) => void;
  onTyping: () => void;
  /** Changes when the parent wants the text box focused (e.g. after choosing Reply). */
  focusSignal: number;
  /** A message of yours being edited: the box holds its text until saved or cancelled. */
  editing: ChatMessage | null;
  onCancelEdit: () => void;
  onSaveEdit: (body: string) => void;
  /** Up arrow in an empty box: edit your last message. */
  onEditLast: () => void;
}) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useVoiceRecorder();
  const recording = recorder.state.status === "recording";

  // Entering edit mode puts the message's text in the box (and keeps your draft
  // to put back afterwards). Derived during render when `editing` changes.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBeforeEdit, setDraftBeforeEdit] = useState("");
  if ((editing?.id ?? null) !== editingId) {
    if (editing && !editingId) setDraftBeforeEdit(body);
    setEditingId(editing?.id ?? null);
    setBody(editing ? editing.body : draftBeforeEdit);
  }

  // Restore the draft for this conversation. Browser storage only exists after
  // hydration, so this has to run in an effect (it runs once per conversation).
  useEffect(() => {
    let draft = "";
    try {
      draft = localStorage.getItem(draftKey(conversationId)) ?? "";
    } catch {
      // Drafts are a nicety.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of browser-only state after hydration
    setCanRecord(voiceRecordingSupported());
    setBody(draft);
  }, [conversationId]);
  useEffect(() => {
    if (editingId) return;
    try {
      if (body) localStorage.setItem(draftKey(conversationId), body);
      else localStorage.removeItem(draftKey(conversationId));
    } catch {
      // Ignore storage errors.
    }
  }, [body, conversationId, editingId]);

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 152)}px`;
  }, [body, recording]);

  useEffect(() => {
    if (focusSignal) textRef.current?.focus({ preventScroll: true });
  }, [focusSignal]);


  async function addFiles(files: File[]) {
    setError(null);
    const room = MESSAGE_IMAGE_MAX - images.length;
    if (room <= 0) {
      setError(`You can send up to ${MESSAGE_IMAGE_MAX} photos at a time.`);
      return;
    }
    const prepared: PreparedImage[] = [];
    for (const file of files.slice(0, room)) {
      if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type)) {
        setError("Photos must be JPG, PNG, WebP or GIF.");
        continue;
      }
      try {
        const image = await prepareImage(file);
        if (!/^image\/(jpeg|png|webp|gif)$/.test(image.file.type)) {
          setError("That photo format is not supported here. Try a JPG or PNG.");
          continue;
        }
        if (image.file.size > MESSAGE_MEDIA_BYTES) {
          setError("Photos can be at most 5 MB each.");
          continue;
        }
        prepared.push(image);
      } catch {
        setError("That photo could not be read.");
      }
    }
    if (files.length > room) setError(`You can send up to ${MESSAGE_IMAGE_MAX} photos at a time.`);
    setImages((current) => [...current, ...prepared].slice(0, MESSAGE_IMAGE_MAX));
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }

  function insertEmoji(emoji: string) {
    const el = textRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${emoji}${body.slice(end)}`;
    if (next.length > MESSAGE_MAX_LENGTH) return;
    setBody(next);
    requestAnimationFrame(() => {
      if (!el) return;
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  }

  const canSend = editing
    ? (body.trim().length > 0 || editing.attachments.length > 0) && body.length <= MESSAGE_MAX_LENGTH
    : (body.trim().length > 0 || images.length > 0) && body.length <= MESSAGE_MAX_LENGTH;

  function send() {
    if (!canSend) return;
    if (editing) {
      onSaveEdit(body.trim());
      return;
    }
    onSend({ body: body.trim(), images, voice: null, replyTo });
    setBody("");
    setImages([]);
    setEmojiOpen(false);
    setError(null);
  }

  async function startRecording() {
    setError(null);
    recorder.clearError();
    setEmojiOpen(false);
    const done = await recorder.start();
    if (!done) return;
    const clip = await done;
    if (!clip) return;
    if (clip.durationMs < VOICE_MIN_MS) {
      setError("Hold on a little longer to record a voice message.");
      return;
    }
    onSend({ body: "", images: [], voice: clip, replyTo });
  }

  const remaining = MESSAGE_MAX_LENGTH - body.length;
  const shownError = error ?? (recorder.state.status === "error" ? recorder.state.message : null);

  return (
    <div
      className="chat-composer relative border-t border-white/10 bg-black/90 px-2 pt-2 backdrop-blur-xl"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (editing) return;
        const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
        if (files.length) {
          event.preventDefault();
          void addFiles(files);
        }
      }}
    >
      {emojiOpen ? <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} /> : null}

      {editing ? (
        <div className="chat-pop mb-2 flex items-center gap-2 rounded-2xl border-l-[3px] border-white/70 bg-white/[0.06] py-1.5 pr-1 pl-3">
          <Pencil aria-hidden className="size-4 shrink-0 text-white/80" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white">Editing message</p>
            <p className="truncate text-[13px] text-white/70">{messageSummary(editing)}</p>
          </div>
          <button type="button" onClick={onCancelEdit} aria-label="Cancel editing" className={toolButton}>
            <X aria-hidden className="size-[18px]" />
          </button>
        </div>
      ) : null}

      {replyTo && !editing ? (
        <div className="chat-pop mb-2 flex items-center gap-2 rounded-2xl border-l-[3px] border-vice-pink bg-white/[0.06] py-1.5 pr-1 pl-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white">
              Replying to {replyTo.senderId === viewerId ? "yourself" : otherName}
            </p>
            <p className="truncate text-[13px] text-white/70">{messageSummary(replyTo)}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className={toolButton}>
            <X aria-hidden className="size-[18px]" />
          </button>
        </div>
      ) : null}

      {images.length && !editing ? (
        <ul aria-label="Photos to send" className="chat-pop mb-2 flex gap-2 overflow-x-auto px-1 pt-1 pb-1">
          {images.map((image, index) => (
            <li key={image.preview} className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-raised">
              <Image src={image.preview} alt={`Photo ${index + 1} to send`} fill unoptimized sizes="72px" className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/75 text-white backdrop-blur focus-visible:outline-2 focus-visible:outline-white"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
          {images.length < MESSAGE_IMAGE_MAX ? (
            <li>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Add another photo"
                className="grid size-[4.5rem] place-items-center rounded-xl border border-dashed border-white/20 text-white/70 hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                <ImagePlus aria-hidden className="size-5" />
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {shownError ? (
        <p role="alert" className="mb-1.5 flex items-center justify-between gap-2 px-2 text-sm font-semibold text-[#ff8a8a]">
          {shownError}
          <button
            type="button"
            onClick={() => {
              setError(null);
              recorder.clearError();
            }}
            aria-label="Dismiss"
            className="grid size-7 place-items-center rounded-full text-white/70 hover:bg-white/10"
          >
            <X aria-hidden className="size-4" />
          </button>
        </p>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => void addFiles(Array.from(event.target.files ?? []))}
      />

      {recording ? (
        <div className="chat-pop flex items-center gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-live="polite">
          <button type="button" onClick={() => recorder.stop(false)} aria-label="Delete recording" className={`${toolButton} text-[#ff8a8a]`}>
            <Trash2 aria-hidden className="size-5" />
          </button>
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-raised px-3.5">
            <span aria-hidden className="recording-dot size-2.5 shrink-0 rounded-full bg-[#ff5a5a]" />
            <span className="w-10 shrink-0 text-sm font-semibold text-white tabular-nums">
              <span className="sr-only">Recording </span>
              {formatDuration(recorder.elapsed)}
            </span>
            <span aria-hidden className="flex h-6 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden">
              {recorder.levels.map((level, index) => (
                <span key={index} className="w-[3px] shrink-0 rounded-full bg-white/80" style={{ height: `${Math.max(10, level * 100)}%` }} />
              ))}
            </span>
            <span className="hidden shrink-0 text-[11px] text-white/50 tabular-nums sm:inline">
              {formatDuration(VOICE_MAX_MS - recorder.elapsed)} left
            </span>
          </div>
          <button
            type="button"
            onClick={() => recorder.stop(true)}
            aria-label="Send voice message"
            className="tap-press grid size-11 shrink-0 place-items-center rounded-full bg-vice-pink text-accent-ink shadow-[0_0_18px_rgb(var(--accent-rgb)/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <SendHorizontal aria-hidden className="size-5" />
          </button>
        </div>
      ) : (
        <form
          className="flex items-end gap-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <div className="flex shrink-0 items-center pb-0.5">
            {editing ? null : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= MESSAGE_IMAGE_MAX}
                aria-label="Add photos"
                className={toolButton}
              >
                <ImagePlus aria-hidden className="size-[22px]" />
              </button>
            )}
            <button
              type="button"
              data-emoji-toggle
              onClick={() => setEmojiOpen((open) => !open)}
              aria-label={emojiOpen ? "Close emoji" : "Add emoji"}
              aria-expanded={emojiOpen}
              className={`${toolButton} ${emojiOpen ? "bg-white/10 text-white" : ""}`}
            >
              <Smile aria-hidden className="size-[22px]" />
            </button>
          </div>
          <div className="relative min-w-0 flex-1 rounded-[1.4rem] border border-white/12 bg-raised transition-colors focus-within:border-white/30">
            <label htmlFor="message-body" className="sr-only">
              Message {otherName}
            </label>
            <textarea
              ref={textRef}
              id="message-body"
              rows={1}
              value={body}
              maxLength={MESSAGE_MAX_LENGTH}
              enterKeyHint="send"
              onChange={(event) => {
                setBody(event.target.value);
                if (event.target.value) onTyping();
              }}
              onPaste={(event) => {
                // Editing changes text only; photos are not added to an edit.
                if (editing) return;
                const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
                if (files.length) {
                  event.preventDefault();
                  void addFiles(files);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && (editing || replyTo)) {
                  event.preventDefault();
                  if (editing) onCancelEdit();
                  else onCancelReply();
                  return;
                }
                if (event.key === "ArrowUp" && !body && !editing && !images.length) {
                  event.preventDefault();
                  onEditLast();
                  return;
                }
                // Enter sends on keyboards; Shift+Enter adds a line. Phones keep Enter for new lines.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(hover: hover)").matches) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={editing ? "Edit your message" : images.length ? "Add a caption…" : "Message"}
              className="block max-h-[9.5rem] min-h-11 w-full resize-none bg-transparent px-4 py-[0.6rem] text-base leading-6 text-white placeholder:text-white/45 focus-visible:outline-none"
            />
            {remaining <= 100 ? (
              <span aria-live="polite" className={`pointer-events-none absolute right-3 bottom-1 text-[11px] font-semibold tabular-nums ${remaining < 0 ? "text-[#ff8a8a]" : "text-white/50"}`}>
                {remaining}
              </span>
            ) : null}
          </div>
          {editing ? (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Save edit"
              onPointerDown={(event) => event.preventDefault()}
              className="send-pop tap-press mb-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Check aria-hidden className="size-5" strokeWidth={2.5} />
            </button>
          ) : canSend || !canRecord ? (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              // Keep the keyboard open on phones: do not move focus off the text box.
              onPointerDown={(event) => event.preventDefault()}
              className="send-pop tap-press mb-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-vice-pink text-accent-ink transition-[opacity,transform] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <SendHorizontal aria-hidden className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              aria-label="Record a voice message"
              className={`${toolButton} mb-0.5`}
            >
              <Mic aria-hidden className="size-[22px]" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
