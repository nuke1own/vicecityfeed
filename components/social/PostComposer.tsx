"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BarChart3, ImagePlus, Plus, X } from "lucide-react";
import { createPost, type PostFormState } from "@/app/actions/social";
import { Avatar } from "@/components/account/Avatar";
import { POLL_DAYS, POLL_OPTION_MAX, POST_IMAGE_BYTES, POST_IMAGE_MAX, POST_MAX_LENGTH } from "@/lib/community-validation";
import { prepareImage, type PreparedImage } from "@/components/social/prepare-image";
import { useAccount } from "@/lib/use-account";

const initial: PostFormState = { status: "idle" };

type PostComposerProps = {
  replyTo?: string;
  replyingTo?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Go to the timeline after posting (full-screen composer on phones). */
  redirectToSocial?: boolean;
  id?: string;
  /** Pre-filled text, e.g. "#leonida " on a hashtag page. */
  initialText?: string;
  /** Borderless row at the top of a timeline (X style) instead of a card. */
  inline?: boolean;
};

function readDraft(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return ""; // Storage blocked: drafts simply are not kept.
  }
}

/** One-tap topics under the composer. */
const TOPICS = ["#GTA6", "#Leonida", "#ViceCity", "#Trailer3", "#JasonAndLucia"];

function CharacterRing({ length }: { length: number }) {
  const left = POST_MAX_LENGTH - length;
  const ratio = Math.min(1, length / POST_MAX_LENGTH);
  const r = 9;
  const c = 2 * Math.PI * r;
  const tone = left < 0 ? "#ff5c5c" : left <= 20 ? "#fcb92c" : "var(--accent)";
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
        />
      </svg>
      {left <= 20 ? <span className={`text-sm tabular-nums ${left < 0 ? "text-[#ff8a8a]" : "text-white/80"}`}>{left}</span> : null}
    </span>
  );
}

export function PostComposer({
  replyTo,
  replyingTo,
  placeholder = "What's happening in Leonida?",
  autoFocus = false,
  redirectToSocial = false,
  id = "compose",
  initialText = "",
  inline = false,
}: PostComposerProps) {
  const { userId, profile } = useAccount();
  const [state, action, pending] = useActionState(createPost, initial);
  const draftKey = `vcf-draft:${replyTo ?? "new"}`;
  // Restore an unsent draft (only when nothing was pre-filled). The text box
  // renders only in the browser (after sign-in is known), so this is safe.
  const [body, setBody] = useState(() => initialText || readDraft(draftKey));
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<(PreparedImage & { alt: string })[]>([]);
  const [poll, setPoll] = useState<{ options: string[]; days: number } | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  async function addFiles(list: FileList | null) {
    setAttachError(null);
    const files = Array.from(list ?? []).slice(0, POST_IMAGE_MAX - images.length);
    const prepared: (PreparedImage & { alt: string })[] = [];
    for (const file of files) {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        setAttachError("Images must be JPG, PNG, WebP or GIF.");
        continue;
      }
      try {
        const image = await prepareImage(file);
        if (image.file.size > POST_IMAGE_BYTES) {
          setAttachError("Images can be at most 5 MB each.");
          continue;
        }
        prepared.push({ ...image, alt: "" });
      } catch {
        setAttachError("That image could not be read.");
      }
    }
    setImages((current) => [...current, ...prepared].slice(0, POST_IMAGE_MAX));
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearAttachments() {
    for (const image of images) URL.revokeObjectURL(image.preview);
    setImages([]);
    setPoll(null);
    setAttachError(null);
  }

  // Files and poll choices live in state; add them to the form on submit.
  function submit(formData: FormData) {
    for (const image of images) {
      formData.append("image", image.file);
      formData.append("imageAlt", image.alt);
      formData.append("imageWidth", String(image.width));
      formData.append("imageHeight", String(image.height));
    }
    if (poll) {
      // Optional 3rd/4th choices left empty are dropped.
      for (const option of poll.options.filter((o, i) => i < 2 || o.trim())) formData.append("pollOption", option);
      formData.append("pollDays", String(poll.days));
    }
    action(formData);
  }

  // Keep the draft as you type; clear it once empty.
  useEffect(() => {
    try {
      if (body.trim()) localStorage.setItem(draftKey, body);
      else localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage errors.
    }
  }, [body, draftKey]);
  const [seen, setSeen] = useState(state);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Clear after a successful post.
  if (state !== seen) {
    setSeen(state);
    if (state.status === "posted") {
      setBody("");
      clearAttachments();
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Ignore storage errors.
      }
    }
  }

  // Grow with the text, like X.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [body]);

  if (!userId) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface px-4 py-4">
        <p className="text-sm text-white/85">
          {replyTo ? "Sign in to reply." : "Join Vice City Feed to post and talk GTA VI."}
        </p>
        <div className="flex gap-2">
          <Link href="/login/?next=/social/" className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-sm font-semibold text-white hover:border-white">
            Sign in
          </Link>
          <Link href="/signup/" className="inline-flex min-h-11 items-center rounded-full bg-vice-pink px-4 text-sm font-bold text-accent-ink hover:bg-white">
            Join
          </Link>
        </div>
      </div>
    );
  }

  const trimmed = body.trim().length;
  const tooLong = body.length > POST_MAX_LENGTH;
  const label = replyTo ? "Post your reply" : "Write a post";

  return (
    <form
      ref={formRef}
      action={submit}
      id={id}
      className={inline ? "flex gap-3 px-4 pt-4 pb-3 sm:px-5" : "flex gap-3 rounded-2xl border border-white/10 bg-surface px-4 py-3"}
    >
      {replyTo ? <input type="hidden" name="replyTo" value={replyTo} /> : null}
      {redirectToSocial ? <input type="hidden" name="redirectTo" value="social" /> : null}
      <Avatar displayName={profile?.displayName ?? "You"} avatarUrl={profile?.avatarUrl ?? null} size={40} className="mt-1" />
      <div className="min-w-0 flex-1">
        {replyingTo ? (
          <p className="mb-1 text-sm text-white/70">
            Replying to <span className="text-vice-pink">@{replyingTo}</span>
          </p>
        ) : null}
        <label htmlFor={`${id}-body`} className="sr-only">
          {label}
        </label>
        <textarea
          ref={textRef}
          id={`${id}-body`}
          name="body"
          rows={1}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            // Ctrl/Cmd + Enter posts, like X.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              if (body.trim() && body.length <= POST_MAX_LENGTH && !pending) formRef.current?.requestSubmit();
            }
          }}
          placeholder={replyTo ? "Post your reply" : placeholder}
          autoFocus={autoFocus}
          className="block min-h-11 w-full resize-none bg-transparent pt-2 pb-1 text-xl leading-snug text-white placeholder:text-white/50 focus-visible:outline-none"
          aria-describedby={state.status === "error" ? `${id}-error` : undefined}
        />
        {state.status === "error" && state.message ? (
          <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-[#ff8a8a]">
            {state.message}
          </p>
        ) : null}
        {images.length ? (
          <ul className={`mt-2 grid gap-2 ${images.length > 1 ? "grid-cols-2" : ""}`} aria-label="Attached images">
            {images.map((image, index) => (
              <li key={image.preview} className="overflow-hidden rounded-2xl border border-white/10 bg-raised">
                <div className="relative aspect-video">
                  <Image src={image.preview} alt={image.alt || `Attached image ${index + 1}`} fill unoptimized sizes="300px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(image.preview);
                      setImages((current) => current.filter((_, i) => i !== index));
                    }}
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute top-1.5 right-1.5 inline-flex size-9 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
                <label className="block px-2 py-1.5">
                  <span className="sr-only">Describe image {index + 1}</span>
                  <input
                    value={image.alt}
                    maxLength={420}
                    onChange={(event) => {
                      const alt = event.target.value;
                      setImages((current) => current.map((item, i) => (i === index ? { ...item, alt } : item)));
                    }}
                    placeholder="Describe this image (for screen readers)"
                    className="min-h-9 w-full bg-transparent text-sm text-white placeholder:text-white/45 focus-visible:outline-none"
                  />
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        {poll ? (
          <fieldset className="mt-3 rounded-2xl border border-white/15 p-3">
            <legend className="px-1 text-sm font-semibold text-white">Poll</legend>
            <div className="space-y-2">
              {poll.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <label className="flex-1">
                    <span className="sr-only">Choice {index + 1}</span>
                    <input
                      value={option}
                      maxLength={POLL_OPTION_MAX}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPoll((current) => current && { ...current, options: current.options.map((o, i) => (i === index ? value : o)) });
                      }}
                      placeholder={`Choice ${index + 1}${index > 1 ? " (optional)" : ""}`}
                      className="min-h-11 w-full rounded-xl border border-white/15 bg-raised px-3 text-base text-white placeholder:text-white/45 focus-visible:border-vice-pink focus-visible:outline-none"
                    />
                  </label>
                  {index > 1 ? (
                    <button
                      type="button"
                      onClick={() => setPoll((current) => current && { ...current, options: current.options.filter((_, i) => i !== index) })}
                      aria-label={`Remove choice ${index + 1}`}
                      className="inline-flex size-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {poll.options.length < 4 ? (
                <button
                  type="button"
                  onClick={() => setPoll((current) => current && { ...current, options: [...current.options, ""] })}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-vice-pink hover:bg-white/5"
                >
                  <Plus aria-hidden className="size-4" /> Add a choice
                </button>
              ) : (
                <span />
              )}
              <label className="flex items-center gap-2 text-sm text-white/80">
                Poll length
                <select
                  value={poll.days}
                  onChange={(event) => setPoll((current) => current && { ...current, days: Number(event.target.value) })}
                  className="min-h-11 rounded-xl border border-white/15 bg-raised px-3 text-base text-white"
                >
                  {POLL_DAYS.map((days) => (
                    <option key={days} value={days}>
                      {days} {days === 1 ? "day" : "days"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" onClick={() => setPoll(null)} className="mt-2 min-h-11 w-full rounded-full text-sm font-semibold text-[#ff8a8a] hover:bg-white/5">
              Remove poll
            </button>
          </fieldset>
        ) : null}
        {attachError ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-[#ff8a8a]">
            {attachError}
          </p>
        ) : null}
        {!replyTo ? (
          <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Add a topic">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  setBody((current) => (current.toLowerCase().includes(topic.toLowerCase()) ? current : `${current.trimEnd()} ${topic} `.trimStart()));
                  textRef.current?.focus();
                }}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-3.5 text-xs font-semibold text-vice-pink hover:border-vice-pink"
              >
                {topic}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-end gap-3 border-t border-white/10 pt-3">
          <div className="-ml-2 mr-auto flex items-center">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => void addFiles(event.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={Boolean(poll) || images.length >= POST_IMAGE_MAX}
              aria-label="Add images"
              title="Add images"
              className="inline-flex size-11 items-center justify-center rounded-full text-vice-pink hover:bg-white/10 disabled:opacity-40"
            >
              <ImagePlus aria-hidden className="size-5" />
            </button>
            {!replyTo ? (
              <button
                type="button"
                onClick={() => setPoll({ options: ["", ""], days: 1 })}
                disabled={Boolean(poll) || images.length > 0}
                aria-label="Add a poll"
                title="Add a poll"
                className="inline-flex size-11 items-center justify-center rounded-full text-vice-pink hover:bg-white/10 disabled:opacity-40"
              >
                <BarChart3 aria-hidden className="size-5" />
              </button>
            ) : null}
          </div>
          <CharacterRing length={body.length} />
          <span className="sr-only" aria-live="polite">
            {tooLong ? `${body.length - POST_MAX_LENGTH} characters over the limit` : ""}
          </span>
          <button
            type="submit"
            disabled={pending || trimmed === 0 || tooLong}
            className="inline-flex min-h-11 items-center rounded-full bg-vice-pink px-5 text-sm font-bold text-accent-ink transition-opacity hover:bg-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {pending ? "Posting…" : replyTo ? "Reply" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
