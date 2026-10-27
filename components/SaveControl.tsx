"use client";

import type { MouseEvent } from "react";
import { Bookmark } from "lucide-react";
import { useSavedStories } from "@/lib/saved";

type SaveControlProps = {
  slug: string;
  variant?: "card" | "inline";
};

export function SaveControl({ slug, variant = "card" }: SaveControlProps) {
  const { has, toggle } = useSavedStories();
  const saved = has(slug);

  function onToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    toggle(slug);
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        data-save-slug={slug}
        data-saved={saved ? "true" : "false"}
        className={`tap-press inline-flex min-h-9 items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white sm:text-sm ${
          saved
            ? "bg-vice-pink text-white shadow-[0_0_12px_rgb(255_30_142/0.5)]"
            : "bg-raised text-white hover:bg-vice-pink hover:text-white"
        }`}
      >
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save story"}
      data-save-slug={slug}
      data-saved={saved ? "true" : "false"}
      className={`tap-press absolute top-3 right-3 z-10 inline-flex size-10 items-center justify-center rounded-full transition-[background-color,color,transform,box-shadow] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white ${
        saved
          ? "bg-vice-pink text-white shadow-[0_0_16px_rgb(255_30_142/0.45)]"
          : "bg-black/75 text-white hover:bg-vice-pink hover:text-white"
      }`}
    >
      <Bookmark
        className="size-4"
        fill={saved ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
