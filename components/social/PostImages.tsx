"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PostImage } from "@/lib/social";

const iconButton =
  "grid size-11 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Full-screen viewer for a post's images, shown on this site (not the raw file URL). */
function ImageViewer({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: PostImage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const image = images[index];
  const many = images.length > 1;

  const go = useCallback(
    (step: number) => onIndex((index + step + images.length) % images.length),
    [index, images.length, onIndex],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // Keep the page behind still while the viewer is open.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={many ? `Image ${index + 1} of ${images.length}` : "Image"}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (!many) return;
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
      onClick={(event) => {
        // Clicking anywhere except the image or a control closes it, like X.
        const target = event.target as HTMLElement;
        if (!target.closest("img, button")) onClose();
      }}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        const end = event.changedTouches[0]?.clientX;
        touchX.current = null;
        if (!many || start === null || end === undefined || Math.abs(end - start) < 50) return;
        go(end < start ? 1 : -1);
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-x-3 top-[max(3.5rem,calc(env(safe-area-inset-top)+3.5rem))] bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:inset-x-20">
          <Image
            key={image.url}
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            quality={90}
            priority
            className="object-contain"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close image"
          autoFocus
          className={`${iconButton} absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3`}
        >
          <X aria-hidden className="size-6" />
        </button>

        {many ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className={`${iconButton} absolute top-1/2 left-3 hidden -translate-y-1/2 sm:grid`}
            >
              <ChevronLeft aria-hidden className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className={`${iconButton} absolute top-1/2 right-3 hidden -translate-y-1/2 sm:grid`}
            >
              <ChevronRight aria-hidden className="size-6" />
            </button>
            <p
              aria-live="polite"
              className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-sm font-semibold text-white/85"
            >
              {index + 1} / {images.length}
            </p>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

/** X-style image grid: 1 large, 2 side by side, 3 as one tall + two, 4 as a 2x2. */
export function PostImages({ images }: { images: PostImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastOpened = useRef(0);
  if (images.length === 0) return null;
  const shown = images.slice(0, 4);
  const count = shown.length;
  const single = count === 1 ? shown[0] : null;
  const ratio = single?.width && single?.height ? Math.min(Math.max(single.width / single.height, 0.75), 1.9) : 16 / 9;

  return (
    <>
      <div
        ref={gridRef}
        className={`relative z-10 mt-2.5 grid gap-0.5 overflow-hidden rounded-2xl border border-white/10 ${
          count === 1 ? "" : "grid-cols-2"
        } ${count >= 3 ? "grid-rows-2" : ""}`}
        style={{ aspectRatio: count === 1 ? String(ratio) : "16 / 9" }}
      >
        {shown.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => {
              lastOpened.current = index;
              setOpen(index);
            }}
            aria-label={count > 1 ? `View image ${index + 1} of ${count}` : "View image"}
            className={`relative block min-h-0 cursor-zoom-in bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
              count === 3 && index === 0 ? "row-span-2" : ""
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 768px) 560px, 92vw"
              className="object-cover transition-opacity duration-200 hover:opacity-90"
            />
          </button>
        ))}
      </div>
      {open !== null ? (
        <ImageViewer
          images={shown}
          index={open}
          onIndex={setOpen}
          onClose={() => {
            setOpen(null);
            // Put focus back on the image that opened the viewer, once the
            // modal is gone and the page is no longer inert.
            requestAnimationFrame(() =>
              gridRef.current?.querySelectorAll("button")[lastOpened.current]?.focus(),
            );
          }}
        />
      ) : null}
    </>
  );
}
