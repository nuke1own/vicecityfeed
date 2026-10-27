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
        className={`rounded-sm text-sm font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white ${
          saved ? "text-vice-pink" : "text-white hover:text-vice-pink"
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
