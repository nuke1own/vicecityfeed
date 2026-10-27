"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CoverArt } from "@/components/CoverArt";
import type { CoverAccent, CoverScene } from "@/lib/types";

type ArticleFigureProps = {
  accent: CoverAccent;
  scene?: CoverScene;
  title: string;
  caption: string;
  kind?: string;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ArticleFigure({
  accent,
  scene,
  title,
  caption,
  kind,
}: ArticleFigureProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const captionId = useId();

  const hide = useCallback(() => {
    setOpen(false);
    window.setTimeout(
      () => setMounted(false),
      prefersReducedMotion() ? 0 : 200,
    );
  }, []);

  function show() {
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true));
    });
  }

  useEffect(() => {
    if (!mounted) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [hide, mounted]);

  return (
    <>
      <figure className="my-10">
        <button
          type="button"
          onClick={show}
          aria-haspopup="dialog"
          data-figure-trigger
          className="block w-full overflow-hidden rounded-2xl text-left"
        >
          <CoverArt
            accent={accent}
            scene={scene}
            title={title}
            kind={kind}
            lead
            className="aspect-video h-auto w-full"
          />
        </button>
        <figcaption className="mt-3 line-clamp-1 text-sm font-medium text-white">
          {caption}
        </figcaption>
      </figure>
      {mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={captionId}
              data-lightbox
              data-open={open ? "true" : "false"}
              className={`figure-lightbox fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink px-4 py-16 ${
                open ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                type="button"
                className="absolute inset-0"
                aria-label="Close cover"
                onClick={hide}
              />
              <button
                type="button"
                onClick={hide}
                aria-label="Close"
                data-lightbox-close
                className="tap-press absolute top-4 right-4 z-10 inline-flex size-11 items-center justify-center rounded-full bg-raised text-white transition-[background-color,color] duration-200 hover:bg-vice-pink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
              >
                <X className="size-5" aria-hidden />
              </button>
              <div className="relative z-10 w-full max-w-5xl">
                <h2 id={titleId} className="sr-only">
                  {title}
                </h2>
                <CoverArt
                  accent={accent}
                  scene={scene}
                  title={title}
                  kind={kind}
                  lead
                  className="aspect-video h-auto w-full rounded-2xl"
                />
                <p
                  id={captionId}
                  className="mt-4 text-sm font-medium text-white md:text-base"
                >
                  {caption}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
