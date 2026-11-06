import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./supabase";

/**
 * Per-request client bound to the visitor's auth cookies. Use it in server
 * components, server actions and route handlers. RLS applies as that user.
 */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. The proxy refreshes the
          // session on the next request, so this is safe to ignore.
        }
      },
    },
  });
}

let anonClient: SupabaseClient | null = null;

/**
 * Cookie-free anon client for public reads (articles, sitemap, RSS). It never
 * carries a user session, so pages using it stay cacheable.
 */
export function getAnonServerSupabase(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}
