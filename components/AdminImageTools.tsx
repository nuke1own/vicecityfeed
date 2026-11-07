"use client";

import { useState } from "react";
import { ctaPillClass, outlinePillClass, pillClass } from "@/components/pills";
import {
  FIGURE_ALIGNS,
  FIGURE_SIZES,
  type FigureAlign,
  type FigureSize,
  type StoryFigure,
} from "@/lib/story-figure";

const ALIGN_LABELS: Record<FigureAlign, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
  full: "Full width",
};

const SIZE_LABELS: Record<FigureSize, string> = {
  s: "Small",
  m: "Medium",
  l: "Large",
  full: "Full",
};

type AdminImageToolsProps = {
  figure: StoryFigure | null;
  uploading?: boolean;
  onUpload: () => void;
  onInsertUrl: (url: string) => void;
  onChange: (next: Partial<Pick<StoryFigure, "align" | "size" | "alt" | "caption">>) => void;
  onMove: (direction: -1 | 1) => void;
};

export function AdminImageTools({
  figure,
  uploading = false,
  onUpload,
  onInsertUrl,
  onChange,
  onMove,
}: AdminImageToolsProps) {
  const [url, setUrl] = useState("");

  return (
    <div
      data-admin-image-tools
      className="mt-3 space-y-3 rounded-xl bg-ink px-3 py-3"
    >
      <p className="text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
        Image
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-image-tool="upload"
          className={ctaPillClass("white", "px-4")}
          onClick={onUpload}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          id="admin-image-url"
          data-image-tool="url"
          className="min-h-11 min-w-0 flex-1 rounded-full bg-raised px-4 text-sm text-white placeholder:text-white/40"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste an image URL"
        />
        <button
          type="button"
          data-image-tool="insert-url"
          className={outlinePillClass("px-4")}
          onClick={() => {
            onInsertUrl(url);
            setUrl("");
          }}
        >
          Insert
        </button>
      </div>
      {figure ? (
        <>
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
              Placement
            </p>
            <div className="flex flex-wrap gap-2">
              {FIGURE_ALIGNS.map((align) => (
                <button
                  key={align}
                  type="button"
                  data-image-align={align}
                  className={pillClass(figure.align === align, "px-3 text-xs")}
                  onClick={() => onChange({ align })}
                >
                  {ALIGN_LABELS[align]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {FIGURE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  data-image-size={size}
                  className={pillClass(figure.size === size, "px-3 text-xs")}
                  onClick={() => onChange({ size })}
                >
                  {SIZE_LABELS[size]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
                Alt text
              </span>
              <input
                data-image-tool="alt"
                className="min-h-11 w-full rounded-xl bg-raised px-4 text-sm text-white placeholder:text-white/40"
                value={figure.alt}
                onChange={(event) => onChange({ alt: event.target.value })}
                placeholder="What the image shows"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
                Caption
              </span>
              <input
                data-image-tool="caption"
                className="min-h-11 w-full rounded-xl bg-raised px-4 text-sm text-white placeholder:text-white/40"
                value={figure.caption}
                onChange={(event) => onChange({ caption: event.target.value })}
                placeholder="Optional caption"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-image-tool="move-up"
              className={outlinePillClass("px-4")}
              onClick={() => onMove(-1)}
            >
              Move up
            </button>
            <button
              type="button"
              data-image-tool="move-down"
              className={outlinePillClass("px-4")}
              onClick={() => onMove(1)}
            >
              Move down
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs font-medium text-white/70">
          Upload or paste a URL. Tools appear once an image is in the body.
        </p>
      )}
    </div>
  );
}
