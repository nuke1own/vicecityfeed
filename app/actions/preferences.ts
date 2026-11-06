"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/profiles";
import { createServerSupabase } from "@/lib/supabase-server";
import { THEME_IDS } from "@/lib/themes";

const themeSchema = z.enum(THEME_IDS);

export type SaveThemeResult = { saved: "account" | "device" | "error" };

/**
 * Saves the colour theme to the signed-in member's profile so it follows
 * them to other devices. Signed-out visitors keep it on this device only.
 */
export async function saveThemePreference(theme: string): Promise<SaveThemeResult> {
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { saved: "error" };
  const user = await getCurrentUser();
  if (!user) return { saved: "device" };
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ theme: parsed.data })
    .eq("id", user.id);
  return { saved: error ? "error" : "account" };
}
