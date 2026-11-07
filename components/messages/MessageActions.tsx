"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, CornerUpLeft, Trash2 } from "lucide-react";
import { messageSummary, type ChatMessage } from "@/lib/chat";
import { MESSAGE_REACTIONS, type MessageReaction } from "@/lib/limits";

const fullTime = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Long-press (phones) or "More" (desktop) actions for one message: a
 * reaction bar plus Reply, Copy and Unsend. A bottom sheet on phones and a
 * small card on larger screens.
 */
export function MessageActions({
  message,
  mine,
  senderName,
  myReaction,
  onReact,
  onReply,
  onCopy,
  onUnsend,
  onClose,
}: {
  message: ChatMessage;
  mine: boolean;
  senderName: string;
  myReaction: MessageReaction | null;
  onReact: (emoji: MessageReaction | null) => void;
  onReply: () => void;
  onCopy: () => void;
  onUnsend: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Unsend asks for a second tap, so a slip of the thumb does not delete anything.
  const [confirming, setConfirming] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Focus the sheet itself (not the first emoji), so nothing looks pre-selected;
    // Tab still moves straight to the reactions and actions.
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  const row =
    "tap-press flex min-h-[3.25rem] w-full items-center gap-3.5 px-5 text-left text-[15px] font-semibold transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:outline-none";

  return (
    <dialog
      ref={ref}
      aria-label="Message options"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="message-sheet m-0 mt-auto w-full max-w-none bg-transparent p-0 text-white backdrop:bg-black/60 backdrop:backdrop-blur-[2px] sm:m-auto sm:w-[22rem]"
    >
      <div ref={panelRef} tabIndex={-1} className="message-sheet-panel rounded-t-[1.75rem] outline-none border border-white/10 bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgb(0_0_0/0.55)] sm:rounded-3xl sm:pb-2">
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/25 sm:hidden" />
        <p className="truncate px-5 pt-3 text-sm text-white/70">
          <span className="font-semibold text-white">{mine ? "You" : senderName}:</span> {messageSummary(message)}
        </p>
        <p className="px-5 text-xs text-white/50">{fullTime.format(new Date(message.createdAt))}</p>

        <div role="group" aria-label="React" className="mx-3 mt-3 flex items-center justify-between rounded-full bg-white/[0.06] p-1.5">
          {MESSAGE_REACTIONS.map((emoji) => {
            const selected = myReaction === emoji;
            return (
              <button
                key={emoji}
                type="button"
                aria-pressed={selected}
                aria-label={selected ? `Remove ${emoji} reaction` : `React with ${emoji}`}
                onClick={() => onReact(selected ? null : emoji)}
                className={`tap-press grid size-11 place-items-center rounded-full text-[1.6rem] leading-none transition-transform active:scale-90 focus-visible:outline-2 focus-visible:outline-white ${
                  selected ? "scale-110 bg-white/15" : "hover:scale-110 hover:bg-white/10"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        <div className="mt-2 overflow-hidden">
          <button type="button" onClick={onReply} className={row}>
            <CornerUpLeft aria-hidden className="size-5 text-white/80" />
            Reply
          </button>
          {message.body.trim() ? (
            <button type="button" onClick={onCopy} className={row}>
              <Copy aria-hidden className="size-5 text-white/80" />
              Copy text
            </button>
          ) : null}
          {mine ? (
            <button
              type="button"
              onClick={() => (confirming ? onUnsend() : setConfirming(true))}
              className={`${row} text-[#ff8a8a] ${confirming ? "bg-[#ff8a8a]/10" : ""}`}
            >
              <Trash2 aria-hidden className="size-5" />
              <span aria-live="polite">{confirming ? "Tap again to unsend for everyone" : "Unsend"}</span>
            </button>
          ) : null}
        </div>
        <div className="px-3 pt-1 sm:hidden">
          <button
            type="button"
            onClick={onClose}
            className="tap-press min-h-12 w-full rounded-2xl bg-white/[0.08] text-[15px] font-bold text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
