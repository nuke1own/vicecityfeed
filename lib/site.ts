import type { Category, CategorySlug, NavItem, SocialLink } from "./types";

export const SITE = {
  name: "Vice City Feed",
  shortName: "VCF",
  domain: "www.vicecityfeed.com",
  url: "https://www.vicecityfeed.com",
  tagline: "Leonida intel. Vice City nights. No filler.",
  description:
    "Vice City Feed is an independent editorial desk covering Grand Theft Auto VI — map lore, vehicles, mods, and reviews.",
  locale: "en_US",
  twitter: "@vicecityfeed",
} as const;

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Articles" },
  { href: "/social", label: "Social" },
  { href: "/the-map", label: "GTA VI" },
  { href: "/garage-mods", label: "Vehicles" },
  { href: "/reviews", label: "Media" },
  { href: "/album", label: "Album" },
];

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: "https://discord.gg/vicecityfeed",
    label: "Discord",
    external: true,
  },
  {
    href: "https://x.com/vicecityfeed",
    label: "X/Twitter",
    external: true,
  },
  { href: "/rss.xml", label: "RSS" },
];

export const FOOTER_SITEMAP: NavItem[] = [
  { href: "/", label: "Articles" },
  { href: "/social", label: "Social" },
  { href: "/the-map", label: "The Map" },
  { href: "/garage-mods", label: "Garage & Mods" },
  { href: "/reviews", label: "Reviews" },
  { href: "/album", label: "The Album" },
  { href: "/editorial-guidelines", label: "Editorial Guidelines" },
  { href: "/rss.xml", label: "RSS Feed" },
];

export const CATEGORY_FILTERS: Array<{ slug: CategorySlug; label: string }> = [
  { slug: "all", label: "All" },
  { slug: "leaks-news", label: "Leaks" },
  { slug: "map-lore", label: "Maps" },
  { slug: "vehicles-guns", label: "Vehicles" },
  { slug: "hardware", label: "Hardware" },
];

export const CATEGORY_SHORT: Record<Category, string> = {
  "Leaks & News": "Leaks",
  "Map & Lore": "Maps",
  "Vehicles & Guns": "Vehicles",
  Guides: "Story",
  Media: "Media",
};

export function coverKind(category: Category): string {
  return CATEGORY_SHORT[category].toUpperCase();
}

export const CATEGORY_SECTION: Record<Category, { href: string; label: string }> =
  {
    "Leaks & News": { href: "/", label: "Articles" },
    "Map & Lore": { href: "/the-map", label: "GTA VI" },
    "Vehicles & Guns": { href: "/garage-mods", label: "Vehicles" },
    Guides: { href: "/", label: "Articles" },
    Media: { href: "/reviews", label: "Media" },
  };

export const CATEGORY_TO_SLUG: Record<Category, Exclude<CategorySlug, "all" | "hardware">> =
  {
    "Leaks & News": "leaks-news",
    "Map & Lore": "map-lore",
    "Vehicles & Guns": "vehicles-guns",
    Guides: "guides",
    Media: "media",
  };

export function homeFilterHref(category: Category) {
  return `/?cat=${CATEGORY_TO_SLUG[category]}`;
}

export const SLUG_TO_CATEGORY: Record<
  Exclude<CategorySlug, "all" | "hardware">,
  Category
> = {
  "leaks-news": "Leaks & News",
  "map-lore": "Map & Lore",
  "vehicles-guns": "Vehicles & Guns",
  guides: "Guides",
  media: "Media",
};

export const HARDWARE_TAGS = ["hardware"] as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname === "/feed" || pathname.startsWith("/posts/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isLiveSocialHref(href: string): boolean {
  const value = href.trim().toLowerCase();
  if (!value) return false;
  if (value === "#" || value.startsWith("javascript:")) return false;
  return true;
}

export function articleCta(tags: string[], slug: string): string {
  if (tags.includes("trailer") || slug.includes("trailer")) {
    return "Watch Trailer";
  }
  return "Read Article";
}
