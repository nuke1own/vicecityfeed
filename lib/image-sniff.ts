/**
 * Detect an image's real type from its first bytes. The browser's declared
 * MIME type is client-supplied and cannot be trusted.
 */
export type SniffedImage = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export function sniffImageType(bytes: Uint8Array): SniffedImage | null {
  const at = (index: number) => bytes[index];
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)) return "image/png";
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  return null;
}
