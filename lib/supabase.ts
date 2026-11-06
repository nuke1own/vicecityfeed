import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SESSION_ONLY_COOKIE, withSessionLifetime } from "./session-cookie";
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
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return readDocumentCookies();
        },
        setAll(cookiesToSet) {
          const sessionOnly = readDocumentCookies().some(
            ({ name, value }) => name === SESSION_ONLY_COOKIE && value === "1",
          );
          for (const { name, value, options } of cookiesToSet) {
            document.cookie = serializeCookie(
              name,
              value,
              withSessionLifetime(options, sessionOnly),
            );
          }
        },
      },
    });
  }
  return browserClient;
}

function readDocumentCookies(): { name: string; value: string }[] {
  if (!document.cookie) return [];
  return document.cookie.split("; ").map((pair) => {
    const index = pair.indexOf("=");
    const name = index < 0 ? pair : pair.slice(0, index);
    const raw = index < 0 ? "" : pair.slice(index + 1);
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // Leave undecodable values as-is.
    }
    return { name, value };
  });
}

type BrowserCookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
};

function serializeCookie(name: string, value: string, options: BrowserCookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? "/"}`];
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (typeof options.maxAge === "number") parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  const sameSite = options.sameSite === true ? "strict" : options.sameSite || "lax";
  parts.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);
  if (options.secure || window.location.protocol === "https:") parts.push("Secure");
  return parts.join("; ");
}
