/**
 * Limits and checks shared by the browser and the server. This file must not
 * import zod (or anything heavy) so client components stay small; the zod
 * schemas in community-validation.ts build on these.
 */

/** Social posts are short, like X. */
export const POST_MAX_LENGTH = 280;
export const MESSAGE_MAX_LENGTH = 1000;

export const POLL_OPTION_MAX = 25;
export const POLL_DAYS = [1, 3, 7] as const;
export const POST_IMAGE_MAX = 4;
export const POST_IMAGE_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

/** Minimum age to hold an account (COPPA). */
export const MIN_AGE = 13;

/** Whole years between a birth date and `today`; null if the date is not real. */
export function ageFromBirthDate(
  year: number,
  month: number,
  day: number,
  today = new Date(),
): number | null {
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return null;
  }
  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() < month - 1 ||
    (today.getUTCMonth() === month - 1 && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export type BirthField = "birthYear" | "birthMonth" | "birthDay";

/** The first problem with a date of birth (month, then day, then year), or null. */
export function birthDateProblem(value: {
  birthYear: unknown;
  birthMonth: unknown;
  birthDay: unknown;
}): { field: BirthField; message: string } | null {
  const year = Number(value.birthYear);
  const month = Number(value.birthMonth);
  const day = Number(value.birthDay);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { field: "birthMonth", message: "Choose your birth month." };
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { field: "birthDay", message: "Choose your birth day." };
  }
  if (!Number.isInteger(year) || year < 1900 || value.birthYear === "") {
    return { field: "birthYear", message: "Choose your birth year." };
  }
  const age = ageFromBirthDate(year, month, day);
  if (age === null || age > 120) return { field: "birthDay", message: "Enter a real date of birth." };
  if (age < 0) return { field: "birthYear", message: "Enter a real date of birth." };
  if (age < MIN_AGE) {
    return { field: "birthYear", message: `You must be at least ${MIN_AGE} to create an account.` };
  }
  return null;
}

/** Direct messages: up to 4 photos, or one voice message of up to 2 minutes. */
export const MESSAGE_IMAGE_MAX = 4;
export const MESSAGE_MEDIA_BYTES = 5 * 1024 * 1024;
export const VOICE_MAX_MS = 120_000;
export const VOICE_MIN_MS = 500;
/** Bars in a voice message's waveform. */
export const VOICE_PEAKS = 40;

/** Quick reactions on a message (one per member per message). */
export const MESSAGE_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"] as const;
export type MessageReaction = (typeof MESSAGE_REACTIONS)[number];

/** Senders can edit a message's text for this long after sending. */
export const MESSAGE_EDIT_WINDOW_MS = 15 * 60_000;
/** Messages loaded per page in a conversation. */
export const MESSAGE_PAGE_SIZE = 50;
