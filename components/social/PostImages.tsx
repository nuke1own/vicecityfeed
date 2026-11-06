import Image from "next/image";
import type { PostImage } from "@/lib/social";

/** X-style image grid: 1 large, 2 side by side, 3 as one tall + two, 4 as a 2x2. */
export function PostImages({ images }: { images: PostImage[] }) {
  if (images.length === 0) return null;
  const count = Math.min(images.length, 4);
  const single = count === 1 ? images[0] : null;
  const ratio = single?.width && single?.height ? Math.min(Math.max(single.width / single.height, 0.75), 1.9) : 16 / 9;

  return (
    <div
      className={`relative z-10 mt-2.5 grid gap-0.5 overflow-hidden rounded-2xl border border-white/10 ${
        count === 1 ? "" : "grid-cols-2"
      } ${count >= 3 ? "grid-rows-2" : ""}`}
      style={count === 1 ? { aspectRatio: String(ratio) } : { aspectRatio: "16 / 9" }}
    >
      {images.slice(0, 4).map((image, index) => (
        <a
          key={image.url}
          href={image.url}
          target="_blank"
          rel="noopener"
          className={`relative block min-h-0 bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
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
        </a>
      ))}
    </div>
  );
}
