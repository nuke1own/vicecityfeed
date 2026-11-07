import type { NextConfig } from "next";
import { PUBLIC_SUPABASE_URL } from "./lib/supabase-public";

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || PUBLIC_SUPABASE_URL);
const supabaseHost = supabaseUrl.hostname;

const nextConfig: NextConfig = {
  // Browser tests build a second copy wired to the mock Supabase (tests/mock-supabase).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
        hostname: supabaseHost,
        ...(supabaseUrl.port ? { port: supabaseUrl.port } : {}),
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Keep pages you have visited in the browser for 30s, so switching back
    // to a tab is instant instead of waiting on the server again.
    staleTimes: { dynamic: 30 },
    // Start loading a page's data as soon as you hover or touch its link.
    dynamicOnHover: true,
    serverActions: {
      // Posts carry up to 4 images (resized in the browser, max 5 MB each).
      bodySizeLimit: "21mb",
    },
  },
  async redirects() {
    return [
      { source: "/settings", destination: "/settings/profile/", permanent: false },
      // Notifications and Chat moved under Social.
      { source: "/notifications", destination: "/social/notifications/", permanent: true },
      { source: "/messages", destination: "/social/messages/", permanent: true },
      { source: "/messages/:id", destination: "/social/messages/:id/", permanent: true },
    ];
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
