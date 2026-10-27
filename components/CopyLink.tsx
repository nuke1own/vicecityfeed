"use client";

import { useState } from "react";

type CopyLinkProps = {
  url: string;
};

export function CopyLink({ url }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const value = typeof window !== "undefined" ? window.location.href : url;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      document.body.removeChild(field);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className="tap-press inline-flex min-h-9 items-center justify-center rounded-full bg-raised px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white transition-[background-color,color,box-shadow] duration-200 hover:bg-vice-pink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white sm:text-sm"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
