"use client";

import { memo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { CornerUpLeft, RotateCw, SmilePlus } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { VoiceMessage } from "@/components/messages/VoiceMessage";
import { isEmojiOnly, linkify, type ChatImage, type ChatMessage } from "@/lib/chat";

export type BubbleStatus = "sent" | "sending" | "failed";

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

const LONG_PRESS_MS = 420;
const SWIPE_REPLY_PX = 56;

type MessageBubbleProps = {
  message: ChatMessage;
  mine: boolean;
  status: BubbleStatus;
  /** Shown under the newest of your messages: "Seen", "Sent"... */
  receipt: string | null;
  groupStart: boolean;
  groupEnd: boolean;
  otherName: string;
  otherAvatar: string | null;
  viewerId: string;
  highlighted: boolean;
  onActions: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onHeart: (message: ChatMessage) => void;
  onJump: (id: string) => void;
  onOpenImages: (images: ChatImage[], index: number) => void;
  onRetry: (message: ChatMessage) => void;
};

function Reactions({ message, mine, viewerId, onClick }: { message: ChatMessage; mine: boolean; viewerId: string; onClick: () => void }) {
  if (message.reactions.length === 0) return null;
  const counts = new Map<string, number>();
  for (const reaction of message.reactions) counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1);
  const mineToo = message.reactions.some((reaction) => reaction.userId === viewerId);
  const label = [...counts].map(([emoji, count]) => `${emoji} ${count}`).join(", ");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Reactions: ${label}. Change reaction`}
      className={`reaction-pop relative z-10 -mt-2.5 flex h-6 items-center gap-0.5 rounded-full border-2 border-black px-1.5 text-[13px] leading-none shadow-[0_2px_8px_rgb(0_0_0/0.5)] ${
        mineToo ? "bg-[#2a2a31]" : "bg-raised"
      } ${mine ? "mr-2 self-end" : "ml-2 self-start"} focus-visible:outline-2 focus-visible:outline-white`}
    >
      {[...counts.keys()].slice(0, 3).map((emoji) => (
        <span key={emoji} aria-hidden>{emoji}</span>
      ))}
      {message.reactions.length > 1 ? <span aria-hidden className="ml-0.5 text-[11px] font-bold text-white/80">{message.reactions.length}</span> : null}
    </button>
  );
}

function ImageGrid({ images, onOpen }: { images: ChatImage[]; onOpen: (index: number) => void }) {
  const count = images.length;
  const single = count === 1 ? images[0] : null;
  const ratio = single?.width && single?.height ? Math.min(Math.max(single.width / single.height, 0.6), 1.8) : 1;
  return (
    <div
      className={`grid w-64 max-w-full gap-0.5 overflow-hidden rounded-[1.15rem] ${count > 1 ? "grid-cols-2" : ""}`}
      style={single ? { aspectRatio: String(ratio) } : undefined}
    >
      {images.map((image, index) => (
        <button
          key={image.url}
          type="button"
          onClick={() => onOpen(index)}
          aria-label={count > 1 ? `View photo ${index + 1} of ${count}` : "View photo"}
          className={`relative block bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
            single ? "h-full" : count === 3 && index === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"
          }`}
        >
          <Image src={image.url} alt={image.alt} fill unoptimized sizes="256px" className="object-cover" draggable={false} />
        </button>
      ))}
    </div>
  );
}

/** One message: bubble, photos or voice, reply quote, reactions and status. */
function MessageBubbleImpl({
  message,
  mine,
  status,
  receipt,
  groupStart,
  groupEnd,
  otherName,
  otherAvatar,
  viewerId,
  highlighted,
  onActions,
  onReply,
  onHeart,
  onJump,
  onOpenImages,
  onRetry,
}: MessageBubbleProps) {
  const [dx, setDx] = useState(0);
  const press = useRef<{ x: number; y: number; at: number; swiping: boolean; cancelled: boolean; timer: number | null } | null>(null);
  const lastTap = useRef(0);
  const opened = useRef(false);

  const text = message.body.trim();
  const images = message.attachments.filter((item): item is ChatImage => item.kind === "image");
  const voice = message.attachments.find((item) => item.kind === "audio");
  const bigEmoji = !images.length && !voice && isEmojiOnly(text);
  const interactive = status === "sent";

  function openActions() {
    if (!interactive || opened.current) return;
    opened.current = true;
    navigator.vibrate?.(8);
    onActions(message);
    window.setTimeout(() => (opened.current = false), 400);
  }

  function clearPress() {
    if (press.current?.timer) window.clearTimeout(press.current.timer);
    press.current = null;
  }

  function onPointerDown(event: ReactPointerEvent) {
    if (event.pointerType !== "touch" || !interactive) return;
    if ((event.target as Element).closest("a, [role=slider]")) return;
    press.current = {
      x: event.clientX,
      y: event.clientY,
      at: Date.now(),
      swiping: false,
      cancelled: false,
      timer: window.setTimeout(() => {
        if (press.current && !press.current.swiping) {
          press.current.cancelled = true;
          openActions();
        }
      }, LONG_PRESS_MS),
    };
  }

  function onPointerMove(event: ReactPointerEvent) {
    const state = press.current;
    if (!state) return;
    const moveX = event.clientX - state.x;
    const moveY = event.clientY - state.y;
    if (!state.swiping && Math.abs(moveY) > 10 && Math.abs(moveY) > Math.abs(moveX)) {
      clearPress();
      setDx(0);
      return;
    }
    if (moveX > 8 && Math.abs(moveX) > Math.abs(moveY)) {
      if (!state.swiping && state.timer) window.clearTimeout(state.timer);
      state.swiping = true;
      // Rubber-band past the trigger point.
      const pull = moveX < SWIPE_REPLY_PX ? moveX : SWIPE_REPLY_PX + (moveX - SWIPE_REPLY_PX) * 0.25;
      if (dx < SWIPE_REPLY_PX && pull >= SWIPE_REPLY_PX) navigator.vibrate?.(6);
      setDx(Math.min(pull, 84));
    }
  }

  function onPointerUp(event: ReactPointerEvent) {
    const state = press.current;
    if (!state) return;
    const wasSwipe = state.swiping;
    const cancelled = state.cancelled;
    const quick = Date.now() - state.at < 250 && Math.abs(event.clientX - state.x) < 8;
    clearPress();
    if (wasSwipe) {
      if (dx >= SWIPE_REPLY_PX) onReply(message);
      setDx(0);
      return;
    }
    if (cancelled || !quick) return;
    if ((event.target as Element).closest("button")) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      onHeart(message);
    } else {
      lastTap.current = now;
    }
  }

  const corner = mine
    ? `${groupStart ? "" : "rounded-tr-[0.45rem]"} ${groupEnd ? "" : "rounded-br-[0.45rem]"}`
    : `${groupStart ? "" : "rounded-tl-[0.45rem]"} ${groupEnd ? "" : "rounded-bl-[0.45rem]"}`;
  const bubble = mine ? "bg-vice-pink text-accent-ink" : "bg-raised text-white";

  return (
    <div
      data-message-id={message.id}
      className={`message-row group relative flex items-end gap-2 ${mine ? "flex-row-reverse" : ""} ${groupStart ? "mt-2.5" : "mt-0.5"}`}
    >
      {/* Swipe-to-reply hint, revealed as the bubble slides right. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white"
        style={{ opacity: Math.min(1, dx / SWIPE_REPLY_PX), transform: `translateY(-50%) scale(${0.6 + Math.min(1, dx / SWIPE_REPLY_PX) * 0.4})` }}
      >
        <CornerUpLeft className="size-4" />
      </span>

      {!mine ? (
        <span className="w-7 shrink-0 self-end">
          {groupEnd ? <Avatar displayName={otherName} avatarUrl={otherAvatar} size={28} /> : null}
        </span>
      ) : null}

      <div
        className={`message-body flex max-w-[78%] min-w-0 flex-col sm:max-w-[70%] ${mine ? "items-end" : "items-start"}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          clearPress();
          setDx(0);
        }}
        onContextMenu={(event) => {
          if (!interactive) return;
          event.preventDefault();
          clearPress();
          openActions();
        }}
        onDoubleClick={(event) => {
          if (!interactive || (event.target as Element).closest("a, button, [role=slider]")) return;
          onHeart(message);
        }}
      >
        {message.replyTo ? (
          <button
            type="button"
            onClick={() => message.reply && onJump(message.reply.id)}
            disabled={!message.reply}
            className={`mb-0.5 max-w-full rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-left text-[13px] leading-snug text-white/70 enabled:hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-white ${mine ? "mr-1" : "ml-1"}`}
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/55">
              <CornerUpLeft aria-hidden className="size-3" />
              {message.reply
                ? `${mine ? "You" : otherName} replied to ${message.reply.senderId === viewerId ? (mine ? "yourself" : "you") : mine ? otherName : "themself"}`
                : "Replied to a message"}
            </span>
            <span className="line-clamp-2 break-words">{message.reply ? message.reply.text : <em>Original message was unsent</em>}</span>
          </button>
        ) : null}

        <div className={`relative flex flex-col gap-1 ${mine ? "items-end" : "items-start"} ${highlighted ? "message-flash" : ""} ${status !== "sent" ? "opacity-70" : ""}`}>
          <span className="sr-only">{mine ? "You said:" : `${otherName} said:`}</span>
          {images.length ? <ImageGrid images={images} onOpen={(index) => onOpenImages(images, index)} /> : null}
          {voice && voice.kind === "audio" ? (
            <div className={`rounded-[1.35rem] px-3 py-2 ${bubble} ${corner}`}>
              <VoiceMessage url={voice.url} durationMs={voice.durationMs} peaks={voice.peaks} mine={mine} />
            </div>
          ) : null}
          {text ? (
            bigEmoji ? (
              <p className="px-1 text-[2.75rem] leading-[1.15] select-none">{text}</p>
            ) : (
              <p
                className={`message-text rounded-[1.35rem] px-3.5 py-2 text-[15.5px] leading-[1.38] break-words whitespace-pre-wrap ${bubble} ${corner}`}
              >
                {linkify(message.body).map((part, index) =>
                  part.kind === "link" ? (
                    <a
                      key={index}
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="font-semibold underline decoration-1 underline-offset-2 break-all"
                    >
                      {part.value}
                    </a>
                  ) : (
                    <span key={index}>{part.value}</span>
                  ),
                )}
              </p>
            )
          ) : null}
        </div>

        <Reactions message={message} mine={mine} viewerId={viewerId} onClick={openActions} />

        {groupEnd || receipt || status !== "sent" ? (
          <p className={`mt-0.5 flex items-center gap-1 px-1.5 text-[11px] text-white/55 ${mine ? "justify-end" : ""}`}>
            <time dateTime={message.createdAt}>{timeFormat.format(new Date(message.createdAt))}</time>
            {status === "sending" ? <span>· Sending…</span> : null}
            {status === "failed" ? (
              <button
                type="button"
                onClick={() => onRetry(message)}
                className="inline-flex items-center gap-1 font-semibold text-[#ff8a8a] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-white"
              >
                · Not sent <RotateCw aria-hidden className="size-3" /> Retry
              </button>
            ) : null}
            {status === "sent" && receipt ? <span className="font-semibold text-white/70">· {receipt}</span> : null}
          </p>
        ) : null}
      </div>

      {/* Desktop: quick actions on hover or keyboard focus. On phones they stay
          available to screen readers; touch uses long-press and swipe. */}
      {interactive ? (
        <div
          className={`items-center gap-0.5 self-center transition-opacity max-md:sr-only md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 ${mine ? "flex-row-reverse" : ""}`}
        >
          <button
            type="button"
            onClick={() => onActions(message)}
            aria-label="React or more options"
            className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <SmilePlus aria-hidden className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => onReply(message)}
            aria-label="Reply to this message"
            className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <CornerUpLeft aria-hidden className="size-[18px]" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
