"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function CopyProfileLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your profile link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-base font-semibold text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Link2 aria-hidden className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}
