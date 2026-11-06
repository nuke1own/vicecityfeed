import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Lets people add Vice City Feed to their iPhone or Android home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "VC Feed",
    description: SITE.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
