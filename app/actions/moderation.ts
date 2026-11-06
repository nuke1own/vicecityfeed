"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isStaffRole } from "@/lib/moderation";
import { getCurrentProfile, profileHref } from "@/lib/profiles";
import { createServerSupabase } from "@/lib/supabase-server";

const input = z.object({ postId: z.uuid(), action: z.enum(["hide", "restore", "dismiss"]) });

/** Staff only. The database re-checks staff rights inside moderate_post(). */
export async function moderatePost(postId: string, action: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  const parsed = input.safeParse({ postId, action });
  if (!profile || !isStaffRole(profile.role) || !parsed.success) return { ok: false };
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("moderate_post", { p_post: parsed.data.postId, p_action: parsed.data.action });
  if (error) return { ok: false };
  revalidatePath("/social", "layout");
  revalidatePath(profileHref(profile.handle));
  return { ok: true };
}
