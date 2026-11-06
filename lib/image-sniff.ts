import { AVATAR_TYPES } from "./community-validation";

export type AvatarMime = keyof typeof AVATAR_TYPES;

/**
 * Detect the real image type from the file's first bytes. The browser's
 * declared MIME type is client-supplied and cannot be trusted.
 */
export function sniffImageType(bytes: Uint8Array): AvatarMime | null {
  const at = (index: number) => bytes[index];
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)
  ) {
    return "image/png";
  }
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}
