"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPost, type PostFormState } from "@/app/actions/social";
import { Avatar } from "@/components/account/Avatar";
import { POST_MAX_LENGTH } from "@/lib/community-validation";
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
};

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
}: PostComposerProps) {
  const { userId, profile } = useAccount();
  const [state, action, pending] = useActionState(createPost, initial);
  const [body, setBody] = useState("");
  const [seen, setSeen] = useState(state);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Clear after a successful post.
  if (state !== seen) {
    setSeen(state);
    if (state.status === "posted") setBody("");
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
    <form action={action} className="flex gap-3 rounded-2xl border border-white/10 bg-surface px-4 py-3" id={id}>
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
          rows={2}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={replyTo ? "Post your reply" : placeholder}
          autoFocus={autoFocus}
          className="block min-h-[3.25rem] w-full resize-none bg-transparent py-2 text-lg leading-snug text-white placeholder:text-white/50 focus-visible:outline-none"
          aria-describedby={state.status === "error" ? `${id}-error` : undefined}
        />
        {state.status === "error" && state.message ? (
          <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-[#ff8a8a]">
            {state.message}
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-end gap-3 border-t border-white/10 pt-2">
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
