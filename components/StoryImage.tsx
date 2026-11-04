import type { FigureAlign, FigureSize } from "@/lib/story-figure";

type StoryImageProps = {
  src: string;
  alt?: string;
  caption?: string;
  align?: FigureAlign;
  size?: FigureSize;
};

export function StoryImage({
  src,
  alt = "",
  caption = "",
  align = "center",
  size = "l",
}: StoryImageProps) {
  return (
    <figure
      data-story-image
      data-align={align}
      data-size={size}
      className={`story-figure story-figure-${align} story-figure-size-${size}`}
    >
      {/* Uploaded and remote story images are not optimized by the static export. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
