"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { markConversationRead, sendMessage, type MessageFormState } from "@/app/actions/messages";
import { MESSAGE_MAX_LENGTH } from "@/lib/community-validation";
import type { ChatMessage } from "@/lib/messages";
import { getSupabase } from "@/lib/supabase";

const initial: MessageFormState = { status: "idle" };
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

type ChatThreadProps = {
  conversationId: string;
  viewerId: string;
  otherName: string;
  messages: ChatMessage[];
};

/** Message list plus composer. New messages arrive live (Realtime) with a polling fallback. */
export function ChatThread({ conversationId, viewerId, otherName, messages }: ChatThreadProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(sendMessage, initial);
  const [body, setBody] = useState("");
  const [seen, setSeen] = useState(state);
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (state !== seen) {
    setSeen(state);
    if (state.status === "sent") setBody("");
  }

  // Keep the newest message in view and mark the conversation read.
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    void markConversationRead(conversationId);
  }, [lastId, conversationId]);

  // Live updates: Supabase Realtime, plus a slow poll in case the socket drops.
  useEffect(() => {
    const supabase = getSupabase();
    const refresh = () => router.refresh();
    const channel = supabase
      ?.channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        refresh,
      )
      .subscribe();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [conversationId, router]);

  return (
    <>
      <ol className="flex flex-1 flex-col gap-1.5 px-3 py-4" aria-label={`Messages with ${otherName}`}>
        {messages.length === 0 ? (
          <li className="py-10 text-center text-sm text-white/70">Say hi to {otherName}.</li>
        ) : null}
        {messages.map((message, index) => {
          const mine = message.senderId === viewerId;
          const day = dayFormat.format(new Date(message.createdAt));
          const previous = messages[index - 1];
          const showDay = !previous || dayFormat.format(new Date(previous.createdAt)) !== day;
          return (
            <li key={message.id} className="flex flex-col">
              {showDay ? (
                <span className="my-3 self-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{day}</span>
              ) : null}
              <div className={`flex max-w-[82%] flex-col ${mine ? "self-end items-end" : "self-start items-start"}`}>
                <p
                  className={`rounded-3xl px-4 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap ${
                    mine ? "rounded-br-md bg-vice-pink text-accent-ink" : "rounded-bl-md bg-raised text-white"
                  }`}
                >
                  <span className="sr-only">{mine ? "You: " : `${otherName}: `}</span>
                  {message.body}
                </p>
                <time dateTime={message.createdAt} className="mt-0.5 px-1 text-[11px] text-white/60">
                  {timeFormat.format(new Date(message.createdAt))}
                </time>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      <form
        ref={formRef}
        action={action}
        className="chat-composer sticky z-30 border-t border-white/10 bg-black/95 px-3 py-2 backdrop-blur-md"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        {state.status === "error" && state.message ? (
          <p role="alert" className="mb-1.5 px-1 text-sm font-semibold text-[#ff8a8a]">
            {state.message}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <label htmlFor="message-body" className="sr-only">
            Message {otherName}
          </label>
          <textarea
            id="message-body"
            name="body"
            rows={1}
            value={body}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends on keyboards; Shift+Enter adds a line. Phones keep Enter for new lines.
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(hover: hover)").matches) {
                event.preventDefault();
                if (body.trim()) formRef.current?.requestSubmit();
              }
            }}
            placeholder="Start a message"
            className="max-h-36 min-h-11 flex-1 resize-none rounded-3xl border border-white/15 bg-raised px-4 py-2.5 text-base text-white placeholder:text-white/50 focus-visible:border-vice-pink focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={pending || body.trim().length === 0}
            aria-label="Send message"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-vice-pink text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <SendHorizontal aria-hidden className="size-5" />
          </button>
        </div>
      </form>
    </>
  );
}
