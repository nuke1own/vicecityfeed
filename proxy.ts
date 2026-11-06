import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

/**
 * Refreshes the Supabase session cookie on each page request so server
 * components always see a valid user.
 */
export async function proxy(request: NextRequest) {
  // Supabase falls back to the Site URL (the home page) when a redirect URL
  // is not allow-listed. Catch those email-link landings here.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/") {
    if (searchParams.has("code") || searchParams.has("token_hash")) {
      const confirm = request.nextUrl.clone();
      confirm.pathname = "/auth/confirm/";
      return NextResponse.redirect(confirm);
    }
    if (searchParams.has("error_code") || searchParams.get("error") === "access_denied") {
      return NextResponse.redirect(new URL("/login/?error=link", request.url));
    }
  }

  let response = NextResponse.next({ request });

  // Anonymous visitors have no auth cookie; skip the network round trip.
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (!hasAuthCookie) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: getUser() validates and refreshes the auth token.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, image optimisation, metadata files and feeds.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-touch-icon|opengraph-image|images/|rss.xml|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$).*)",
  ],
};
