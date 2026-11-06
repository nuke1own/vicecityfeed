import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SESSION_ONLY_COOKIE, withSessionLifetime } from "./session-cookie";
import { supabaseAnonKey, supabaseUrl } from "./supabase";

/**
 * Per-request client bound to the visitor's auth cookies. Use it in server
 * components, server actions and route handlers. RLS applies as that user.
 */
export async function createServerSupabase(
  options: { sessionOnly?: boolean } = {},
): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const sessionOnly =
    options.sessionOnly ?? cookieStore.get(SESSION_ONLY_COOKIE)?.value === "1";
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: timedFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options: cookieOptions } of cookiesToSet) {
            cookieStore.set(name, value, withSessionLifetime(cookieOptions, sessionOnly));
          }
        } catch {
          // Server components cannot set cookies. The proxy refreshes the
          // session on the next request, so this is safe to ignore.
        }
      },
    },
  });
}

/** Fail fast instead of hanging a page if Supabase is slow or unreachable. */
const timedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(8000) });

let anonClient: SupabaseClient | null = null;

/**
 * Cookie-free anon client for public reads (articles, sitemap, RSS). It never
 * carries a user session, so pages using it stay cacheable.
 */
export function getAnonServerSupabase(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: timedFetch },
    });
  }
  return anonClient;
}
