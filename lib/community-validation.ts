import { z } from "zod";

const trimmedText = (max: number) =>
  z.string().trim().min(1).max(max);

export const handleSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_]+$/i, "Use letters, numbers, and underscores only.");

export const profileUpdateSchema = z.object({
  handle: handleSchema,
  displayName: trimmedText(60),
  bio: z.string().trim().max(280).default(""),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
});

export const communityPostSchema = z.object({
  body: trimmedText(5000),
  replyTo: z.string().uuid().nullable().optional(),
  quotedArticleSlug: z.string().trim().max(120).nullable().optional(),
});

export const postReactionSchema = z.object({
  postId: z.string().uuid(),
  reaction: z.enum(["like", "repost", "bookmark"]),
});

export const reportSchema = z.object({
  postId: z.string().uuid(),
  reason: z.enum(["spam", "harassment", "misinformation", "copyright", "other"]),
  details: z.string().trim().max(1000).default(""),
});

export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PostReactionInput = z.infer<typeof postReactionSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
