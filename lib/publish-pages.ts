import type { Category, SectionSlug } from "./types";

export const PUBLISH_PAGE_IDS = ["feed", "gta-vi", "vehicles", "media"] as const;
export type PublishPageId = (typeof PUBLISH_PAGE_IDS)[number];

export type PublishPage = {
  id: PublishPageId;
  label: string;
  href: string;
  category: Category;
  section: SectionSlug;
};

export const PUBLISH_PAGES: PublishPage[] = [
  {
    id: "feed",
    label: "Articles",
    href: "/",
    category: "Leaks & News",
    section: "wire",
  },
  {
    id: "gta-vi",
    label: "GTA VI",
    href: "/the-map",
    category: "Map & Lore",
    section: "map",
  },
  {
    id: "vehicles",
    label: "Vehicles",
    href: "/garage-mods",
    category: "Vehicles & Guns",
    section: "garage",
  },
  {
    id: "media",
    label: "Media",
    href: "/reviews",
    category: "Media",
    section: "reviews",
  },
];

const PAGE_SET = new Set<string>(PUBLISH_PAGE_IDS);

export function publishPageById(id: string): PublishPage {
  return PUBLISH_PAGES.find((page) => page.id === id) ?? PUBLISH_PAGES[0];
}

export function publishPageOf(category: string, section: string): PublishPageId {
  if (section === "reviews" || category === "Media") return "media";
  if (section === "map" || category === "Map & Lore") return "gta-vi";
  if (section === "garage" || category === "Vehicles & Guns") return "vehicles";
  return "feed";
}

export function publishPageLabel(category: string, section: string): string {
  const id = publishPageOf(category, section);
  return PUBLISH_PAGES.find((page) => page.id === id)?.label ?? "Feed";
}

export function normalizePublishPages(
  value: string[] | null | undefined,
  fallback?: { category: string; section: string },
): PublishPageId[] {
  const fromValue = (Array.isArray(value) ? value : [])
    .map((item) => String(item).trim())
    .filter((item): item is PublishPageId => PAGE_SET.has(item));
  const unique = PUBLISH_PAGE_IDS.filter((id) => fromValue.includes(id));
  if (unique.length > 0) return [...unique];
  if (fallback) return [publishPageOf(fallback.category, fallback.section)];
  return ["feed"];
}

export function publishPagesLabel(pages: PublishPageId[]): string {
  const labels = pages.map((id) => publishPageById(id).label);
  return labels.length ? labels.join(", ") : "Feed";
}

export function primaryPublishPage(pages: PublishPageId[]): PublishPage {
  return publishPageById(pages[0] ?? "feed");
}

export function articleOnPage(
  article: { publishPages?: PublishPageId[]; category: string; section: string },
  page: PublishPageId,
): boolean {
  return normalizePublishPages(article.publishPages, article).includes(page);
}

/** Reserved tags that encode multi-page placement when the DB column is absent. */
export function pageTag(id: PublishPageId): string {
  return `on-${id}`;
}

export function isPageTag(tag: string): boolean {
  return PUBLISH_PAGE_IDS.some((id) => tag === pageTag(id));
}

export function publishPagesFromTags(
  tags: string[] | null | undefined,
): PublishPageId[] {
  const list = Array.isArray(tags) ? tags : [];
  return PUBLISH_PAGE_IDS.filter((id) => list.includes(pageTag(id)));
}

export function mergePageTags(
  tags: string[],
  pages: PublishPageId[],
): string[] {
  const cleaned = tags.filter((tag) => !isPageTag(tag));
  return [...cleaned, ...pages.map(pageTag)];
}

export function visibleTags(tags: string[]): string[] {
  return tags.filter((tag) => !isPageTag(tag));
}

export function resolvePublishPages(input: {
  publishPages?: string[] | null;
  tags?: string[] | null;
  category: string;
  section: string;
}): PublishPageId[] {
  const raw = Array.isArray(input.publishPages) ? input.publishPages : [];
  const fromColumn = PUBLISH_PAGE_IDS.filter((id) => raw.includes(id));
  if (fromColumn.length > 0) return [...fromColumn];
  const fromTags = publishPagesFromTags(input.tags);
  if (fromTags.length > 0) return fromTags;
  return [publishPageOf(input.category, input.section)];
}
