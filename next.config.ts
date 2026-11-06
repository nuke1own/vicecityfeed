import type { NextConfig } from "next";
import { PUBLIC_SUPABASE_URL } from "./lib/supabase-public";

const supabaseHost = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || PUBLIC_SUPABASE_URL,
).hostname;

const nextConfig: NextConfig = {
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
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
