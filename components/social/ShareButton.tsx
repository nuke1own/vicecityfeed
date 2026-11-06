"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";

/** Native share sheet on phones (iOS, Android); copies the link elsewhere. */
export function ShareButton({ postId, text }: { postId: string; text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function share() {
    const url = `${window.location.origin}/social/post/${postId}/`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Vice City Feed", text: text.slice(0, 120), url });
        return;
      } catch {
        // Cancelled: nothing to do.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <span className="relative z-10">
      <button
        type="button"
        onClick={() => void share()}
        aria-label="Share post"
        className="inline-flex size-11 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/5 hover:text-vice-pink focus-visible:outline-2 focus-visible:outline-white"
      >
        <Share aria-hidden className="size-[18px]" />
      </button>
      {copied ? (
        <span role="status" className="absolute right-0 bottom-11 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-black shadow-lg">
          Link copied
        </span>
      ) : null}
    </span>
  );
}
