import type { NextConfig } from "next";
import { PUBLIC_SUPABASE_URL } from "./lib/supabase-public";

const supabaseHost = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || PUBLIC_SUPABASE_URL,
).hostname;

const nextConfig: NextConfig = {
  // Browser tests build a second copy wired to the mock Supabase (tests/mock-supabase).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Avatar uploads are capped at 2 MB in validation; leave headroom for form fields.
      bodySizeLimit: "3mb",
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
