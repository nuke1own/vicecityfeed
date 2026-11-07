"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, Bell, BellOff, Trash2, UserRound } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";

type Confirm = "block" | "delete" | null;

/**
 * Conversation options (the ⋯ in the chat header): profile, mute, block and
 * delete chat. Block and delete ask for a second tap, with what they do.
 */
export function ChatOptions({
  other,
  muted,
  iBlocked,
  onMute,
  onBlock,
  onDelete,
  onClose,
}: {
  other: { handle: string; displayName: string; avatarUrl: string | null };
  muted: boolean;
  iBlocked: boolean;
  onMute: () => void;
  onBlock: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  const row =
    "tap-press flex min-h-[3.25rem] w-full items-center gap-3.5 px-5 text-left text-[15px] font-semibold transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:outline-none";

  return (
    <dialog
      ref={ref}
      aria-label="Conversation options"
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
      <div
        ref={panelRef}
        tabIndex={-1}
        className="message-sheet-panel rounded-t-[1.75rem] border border-white/10 bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-none sm:rounded-3xl sm:pb-2"
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/25 sm:hidden" />
        <div className="flex items-center gap-3 px-5 pt-4 pb-3">
          <Avatar displayName={other.displayName} avatarUrl={other.avatarUrl} size={44} />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-white">{other.displayName}</p>
            <p className="truncate text-sm text-white/60">@{other.handle}</p>
          </div>
        </div>

        {confirm ? (
          <div className="px-5 pb-2" aria-live="polite">
            <p className="text-[15px] font-bold text-white">
              {confirm === "block" ? `Block @${other.handle}?` : "Delete this chat?"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/70">
              {confirm === "block"
                ? "They won't be able to message you or see when you're active. They won't be told you blocked them."
                : `The messages disappear for you only. ${other.displayName} keeps their copy, and the chat comes back if either of you sends a new message.`}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="tap-press min-h-11 flex-1 rounded-full bg-white/[0.08] text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm === "block" ? onBlock : onDelete}
                className="tap-press min-h-11 flex-1 rounded-full bg-[#ff5a5a] text-sm font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {confirm === "block" ? "Block" : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <Link href={`/u/${other.handle}/`} className={row}>
              <UserRound aria-hidden className="size-5 text-white/80" />
              View profile
            </Link>
            <button type="button" onClick={onMute} className={row}>
              {muted ? <Bell aria-hidden className="size-5 text-white/80" /> : <BellOff aria-hidden className="size-5 text-white/80" />}
              {muted ? "Unmute messages" : "Mute messages"}
            </button>
            <button
              type="button"
              onClick={() => (iBlocked ? onBlock() : setConfirm("block"))}
              className={`${row} text-[#ff8a8a]`}
            >
              <Ban aria-hidden className="size-5" />
              {iBlocked ? `Unblock @${other.handle}` : `Block @${other.handle}`}
            </button>
            <button type="button" onClick={() => setConfirm("delete")} className={`${row} text-[#ff8a8a]`}>
              <Trash2 aria-hidden className="size-5" />
              Delete chat
            </button>
            <div className="px-3 pt-1 sm:hidden">
              <button
                type="button"
                onClick={onClose}
                className="tap-press min-h-12 w-full rounded-2xl bg-white/[0.08] text-[15px] font-bold text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
