import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from "./supabase-public";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const supabaseUrl =
  trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || PUBLIC_SUPABASE_URL;

export const supabaseAnonKey =
  trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let browserClient: SupabaseClient | null = null;

/**
 * Browser client. The session lives in cookies (not localStorage) so server
 * components, server actions and the proxy see the same signed-in user.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}
