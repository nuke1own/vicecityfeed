import { z } from "zod";
import { AVATAR_IDS } from "./avatars";

/** Handles that could be mistaken for the site or its staff. */
export const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "desk",
  "editor",
  "help",
  "moderator",
  "mod",
  "official",
  "root",
  "staff",
  "support",
  "system",
  "vicecityfeed",
  "vice_city_feed",
  "vcf",
]);

export const handleSchema = z
  .string()
  .trim()
  .min(3, "Handles need at least 3 characters.")
  .max(24, "Handles can be at most 24 characters.")
  .regex(/^[a-z0-9_]+$/i, "Use letters, numbers, and underscores only.")
  .transform((value) => value.toLowerCase())
  .refine((value) => !RESERVED_HANDLES.has(value), {
    message: "That handle is reserved.",
  });

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Add a display name.")
  .max(60, "Display names can be at most 60 characters.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));

export const passwordSchema = z
  .string()
  .min(8, "Passwords need at least 8 characters.")
  .max(72, "Passwords can be at most 72 characters.");

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

export const birthDateSchema = z
  .object({
    birthYear: z.coerce.number().int().min(1900, "Choose your birth year."),
    birthMonth: z.coerce.number().int().min(1, "Choose your birth month.").max(12),
    birthDay: z.coerce.number().int().min(1, "Choose your birth day.").max(31),
  })
  .superRefine((value, ctx) => {
    const age = ageFromBirthDate(value.birthYear, value.birthMonth, value.birthDay);
    if (age === null || age > 120) {
      ctx.addIssue({ code: "custom", path: ["birthDay"], message: "Enter a real date of birth." });
    } else if (age < 0) {
      ctx.addIssue({ code: "custom", path: ["birthYear"], message: "Enter a real date of birth." });
    } else if (age < MIN_AGE) {
      ctx.addIssue({
        code: "custom",
        path: ["birthYear"],
        message: `You must be at least ${MIN_AGE} to create an account.`,
      });
    }
  });

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    handle: handleSchema,
    displayName: displayNameSchema,
  })
  .and(birthDateSchema);

export const passwordResetRequestSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
  remember: z.boolean().default(false),
});

export const bioSchema = z.string().trim().max(280, "Bios can be at most 280 characters.");

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(72),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  })
  .refine((value) => value.password !== value.currentPassword, {
    path: ["password"],
    message: "Choose a password that is different from your current one.",
  });

/** Empty string means "no avatar"; anything else must be a preset id. */
export const avatarChoiceSchema = z.union([z.literal(""), z.enum(AVATAR_IDS)]);

/** Social posts are short, like X. */
export const POST_MAX_LENGTH = 280;
export const MESSAGE_MAX_LENGTH = 1000;

export const communityPostSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(POST_MAX_LENGTH, `Posts can be at most ${POST_MAX_LENGTH} characters.`),
  replyTo: z.uuid().nullable().optional(),
});

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

export const pollSchema = z.object({
  options: z
    .array(z.string().trim().min(1, "Fill in every poll choice.").max(POLL_OPTION_MAX, `Poll choices can be at most ${POLL_OPTION_MAX} characters.`))
    .min(2, "Polls need at least 2 choices.")
    .max(4, "Polls can have at most 4 choices.")
    .refine((options) => new Set(options.map((o) => o.toLowerCase())).size === options.length, "Poll choices must be different."),
  days: z.coerce.number().refine((value) => (POLL_DAYS as readonly number[]).includes(value), "Choose how long the poll runs."),
});

export const postImageMetaSchema = z.object({
  alt: z.string().trim().max(420, "Image descriptions can be at most 420 characters."),
  width: z.coerce.number().int().min(1).max(10000).nullable(),
  height: z.coerce.number().int().min(1).max(10000).nullable(),
});

export const pollVoteSchema = z.object({ postId: z.uuid(), option: z.number().int().min(0).max(3) });

export const messageSchema = z.object({
  conversationId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(MESSAGE_MAX_LENGTH, `Messages can be at most ${MESSAGE_MAX_LENGTH} characters.`),
});

export const postReactionSchema = z.object({
  postId: z.uuid(),
  reaction: z.enum(["like"]),
});

export const reportSchema = z.object({
  postId: z.uuid(),
  reason: z.enum(["spam", "harassment", "misinformation", "copyright", "other"]),
  details: z.string().trim().max(1000).default(""),
});

/**
 * Only allow same-site relative redirects after sign-in, so a crafted
 * ?next= link cannot send people to another site.
 */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  if (/[\u0000-\u001f]/.test(path)) return fallback;
  return path;
}

/** First message per field, for showing next to each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type PostReactionInput = z.infer<typeof postReactionSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
