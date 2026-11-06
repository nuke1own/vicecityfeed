/**
 * Shrinks a photo in the browser before upload (max 1600px, WebP or JPEG),
 * so posts upload fast and stay light. GIFs are kept as they are (animation).
 */
export type PreparedImage = { file: File; width: number; height: number; preview: string };

const MAX_SIDE = 1600;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("unreadable"));
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const preview = URL.createObjectURL(file);
  const image = await loadImage(preview);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (file.type === "image/gif") return { file, width, height, preview };

  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return { file, width, height, preview };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // WebP where the browser can encode it (older Safari falls back to JPEG).
  const webp = await toBlob(canvas, "image/webp", 0.82);
  const blob = webp?.type === "image/webp" ? webp : await toBlob(canvas, "image/jpeg", 0.85);
  if (!blob || blob.size >= file.size) return { file, width, height, preview };
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return {
    file: new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "image"}.${ext}`, { type: blob.type }),
    width: canvas.width,
    height: canvas.height,
    preview,
  };
}
