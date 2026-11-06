"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Flag, Link2, Trash2 } from "lucide-react";
import { deletePost, reportPost } from "@/app/actions/social";
import { useAccount } from "@/lib/use-account";

type PostMenuProps = {
  postId: string;
  authorId: string;
  handle: string;
  /** Signed-in member id when the page already knows it (null = signed out, undefined = unknown). */
  viewerId?: string | null;
};

export function PostMenu({ postId, authorId, handle, viewerId }: PostMenuProps) {
  const router = useRouter();
  const account = useAccount();
  // Prefer what the server knew; otherwise wait for the session to load.
  const known = viewerId !== undefined;
  const userId = known ? viewerId : account.userId;
  const ready = known || account.ready;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const isOwn = userId === authorId;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 2500);
    return () => window.clearTimeout(id);
  }, [note]);

  const item =
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60";

  return (
    <div ref={rootRef} className={`relative ${open || note ? "z-50" : "z-10"}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`More options for @${handle}'s post`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex size-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        <Ellipsis aria-hidden className="size-5" />
      </button>
      {open ? (
        <div role="menu" aria-label="Post options" className="absolute top-11 right-0 z-50 w-56 rounded-xl border border-white/10 bg-raised p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.6)]">
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={async () => {
              const url = `${window.location.origin}/social/post/${postId}/`;
              try {
                await navigator.clipboard.writeText(url);
                setNote("Link copied");
              } catch {
                window.prompt("Copy this link:", url);
              }
              setOpen(false);
            }}
          >
            <Link2 aria-hidden className="size-4" /> Copy link
          </button>
          {!ready ? (
            <p role="menuitem" aria-disabled="true" className="flex min-h-11 items-center px-3 text-sm text-white/60">
              Loading…
            </p>
          ) : isOwn ? (
            <button
              role="menuitem"
              type="button"
              disabled={pending}
              className={`${item} text-[#ff8a8a]`}
              onClick={() => {
                if (!window.confirm("Delete this post? This cannot be undone.")) return;
                startTransition(async () => {
                  const result = await deletePost(postId);
                  setOpen(false);
                  if (result.ok) {
                    if (window.location.pathname.startsWith(`/social/post/${postId}`)) router.push("/social/");
                    else router.refresh();
                  } else setNote("Could not delete the post");
                });
              }}
            >
              <Trash2 aria-hidden className="size-4" /> Delete post
            </button>
          ) : userId ? (
            ["spam", "harassment", "misinformation"].map((reason) => (
              <button
                key={reason}
                role="menuitem"
                type="button"
                disabled={pending}
                className={item}
                onClick={() =>
                  startTransition(async () => {
                    const result = await reportPost(postId, reason);
                    setOpen(false);
                    setNote(result.ok ? "Thanks. Our team will review it." : "Could not send the report");
                  })
                }
              >
                <Flag aria-hidden className="size-4" /> Report as {reason}
              </button>
            ))
          ) : null}
        </div>
      ) : null}
      {note ? (
        <p role="status" className="absolute top-11 right-0 z-30 rounded-lg bg-white px-3 py-2 text-sm font-semibold whitespace-nowrap text-black">
          {note}
        </p>
      ) : null}
    </div>
  );
}
