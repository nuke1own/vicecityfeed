"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import type { PostImage } from "@/lib/social";

const MAX_ZOOM = 4;

const iconButton =
  "grid size-11 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Full-screen viewer for a post's images, shown on this site (not the raw file URL). */
export function ImageViewer({
  images,
  index,
  onIndex,
  onClose,
  unoptimized = false,
}: {
  images: PostImage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** Private images (signed links) are shown as-is, never cached by the image optimiser. */
  unoptimized?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const image = images[index];
  const many = images.length > 1;

  // Zoom: pinch, double-tap/double-click, Ctrl/trackpad scroll, +/- keys.
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const [shownIndex, setShownIndex] = useState(index);
  if (shownIndex !== index) {
    setShownIndex(index);
    setZoom({ scale: 1, x: 0, y: 0 });
  }
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const lastPointer = useRef("mouse");
  // Follow the fingers exactly while touching; ease when letting go.
  const [touching, setTouching] = useState(false);
  const zoomed = zoom.scale > 1.01;

  const clamp = useCallback((scale: number, x: number, y: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    const s = Math.min(MAX_ZOOM, Math.max(1, scale));
    if (!rect || s <= 1) return { scale: 1, x: 0, y: 0 };
    const maxX = ((s - 1) * rect.width) / 2;
    const maxY = ((s - 1) * rect.height) / 2;
    return { scale: s, x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }, []);

  /** Zooms to `scale` keeping the point under (clientX, clientY) in place. */
  const zoomAt = useCallback(
    (scale: number, clientX?: number, clientY?: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      setZoom((current) => {
        if (!rect || clientX === undefined || clientY === undefined) return clamp(scale, current.x, current.y);
        const cx = clientX - (rect.left + rect.width / 2);
        const cy = clientY - (rect.top + rect.height / 2);
        const ratio = Math.min(MAX_ZOOM, Math.max(1, scale)) / current.scale;
        return clamp(scale, cx - (cx - current.x) * ratio, cy - (cy - current.y) * ratio);
      });
    },
    [clamp],
  );

  const go = useCallback(
    (step: number) => onIndex((index + step + images.length) % images.length),
    [index, images.length, onIndex],
  );

  // Ctrl + wheel (and trackpad pinch, which browsers send as Ctrl + wheel).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => {
        const rect = stage.getBoundingClientRect();
        const next = current.scale * Math.exp(-event.deltaY * 0.01);
        const cx = event.clientX - (rect.left + rect.width / 2);
        const cy = event.clientY - (rect.top + rect.height / 2);
        const ratio = Math.min(MAX_ZOOM, Math.max(1, next)) / current.scale;
        return clamp(next, cx - (cx - current.x) * ratio, cy - (cy - current.y) * ratio);
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [clamp]);

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
        if (event.key === "+" || event.key === "=") zoomAt(zoom.scale * 1.5);
        if (event.key === "-") zoomAt(zoom.scale / 1.5);
        if (event.key === "0") setZoom({ scale: 1, x: 0, y: 0 });
        if (!many || zoomed) return;
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
      onClick={(event) => {
        // Clicking anywhere except the image or a control closes it, like X.
        const target = event.target as HTMLElement;
        if (!target.closest("img, button")) onClose();
      }}
      onTouchStart={(event) => {
        // Swipe between images only with one finger and when not zoomed in.
        touchX.current = event.touches.length === 1 && !zoomed ? (event.touches[0]?.clientX ?? null) : null;
      }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        const end = event.changedTouches[0]?.clientX;
        touchX.current = null;
        if (!many || zoomed || start === null || end === undefined || Math.abs(end - start) < 50) return;
        go(end < start ? 1 : -1);
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div className="relative h-full w-full">
        <div
          ref={stageRef}
          data-zoom={zoom.scale.toFixed(2)}
          className={`absolute inset-x-3 top-[max(3.5rem,calc(env(safe-area-inset-top)+3.5rem))] bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] touch-none sm:inset-x-20 ${
            zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
          }`}
          style={{
            transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
            transition: touching ? "none" : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            lastPointer.current = event.pointerType;
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            setTouching(true);
            if (pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()];
              pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: zoom.scale };
            }
          }}
          onPointerMove={(event) => {
            const previous = pointers.current.get(event.pointerId);
            if (!previous) return;
            const point = { x: event.clientX, y: event.clientY };
            pointers.current.set(event.pointerId, point);
            if (pointers.current.size === 2 && pinch.current) {
              const [a, b] = [...pointers.current.values()];
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              zoomAt((pinch.current.scale * distance) / pinch.current.distance, (a.x + b.x) / 2, (a.y + b.y) / 2);
            } else if (pointers.current.size === 1 && zoomed) {
              setZoom((current) => clamp(current.scale, current.x + point.x - previous.x, current.y + point.y - previous.y));
            }
          }}
          onPointerUp={(event) => {
            pointers.current.delete(event.pointerId);
            if (pointers.current.size < 2) pinch.current = null;
            if (pointers.current.size === 0) setTouching(false);
            // Double tap (touch) toggles zoom at that point; mice use double-click.
            if (event.pointerType === "touch" && pointers.current.size === 0) {
              const now = Date.now();
              if (now - lastTap.current < 280) {
                lastTap.current = 0;
                if (zoomed) setZoom({ scale: 1, x: 0, y: 0 });
                else zoomAt(2.5, event.clientX, event.clientY);
              } else {
                lastTap.current = now;
              }
            }
          }}
          onPointerCancel={(event) => {
            pointers.current.delete(event.pointerId);
            pinch.current = null;
            if (pointers.current.size === 0) setTouching(false);
          }}
          onDoubleClick={(event) => {
            // Touch double taps are handled on pointer up (some phones also send dblclick).
            if (lastPointer.current === "touch") return;
            if (zoomed) setZoom({ scale: 1, x: 0, y: 0 });
            else zoomAt(2.5, event.clientX, event.clientY);
          }}
        >
          <Image
            key={image.url}
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            quality={90}
            priority
            unoptimized={unoptimized}
            draggable={false}
            className="object-contain select-none"
          />
        </div>

        <button
          type="button"
          onClick={() => (zoomed ? setZoom({ scale: 1, x: 0, y: 0 }) : zoomAt(2.5))}
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
          className={`${iconButton} absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3`}
        >
          {zoomed ? <ZoomOut aria-hidden className="size-6" /> : <ZoomIn aria-hidden className="size-6" />}
        </button>

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
