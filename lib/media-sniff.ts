/**
 * Detect a voice recording's real container from its first bytes (the
 * browser's declared type is client-supplied). Safari records MP4/AAC,
 * Chrome and Firefox record WebM or Ogg with Opus.
 */
export type SniffedAudio = { type: "audio/mp4" | "audio/webm" | "audio/ogg"; ext: "m4a" | "webm" | "ogg" };

export function sniffAudioType(bytes: Uint8Array): SniffedAudio | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { type: "audio/webm", ext: "webm" };
  }
  if (bytes.length >= 12 && ascii(4, 8) === "ftyp") return { type: "audio/mp4", ext: "m4a" };
  if (bytes.length >= 4 && ascii(0, 4) === "OggS") return { type: "audio/ogg", ext: "ogg" };
  return null;
}
