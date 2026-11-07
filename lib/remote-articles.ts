import { relatedArticles } from "./filters";
import { describeAdminError } from "./admin-errors";
import { getAuthorSlug } from "./authors";
import { readingTimeFromMarkdown, slugify } from "./format";
import {
  mergePageTags,
  normalizePublishPages,
  primaryPublishPage,
  resolvePublishPages,
  visibleTags,
  type PublishPageId,
} from "./publish-pages";
import { stripCoverFromBody } from "./story-figure";
import { loadSupabase } from "./supabase";
import type {
  Article,
  ArticleMeta,
  Category,
  CoverAccent,
  CoverScene,
  FeedArticle,
  SectionSlug,
} from "./types";
import {
  CATEGORIES,
  COVER_SCENES,
  SECTION_SLUGS,
} from "./types";

export const ARTICLES_TABLE = "articles";
export const COVERS_BUCKET = "covers";

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  section: string;
  publish_pages?: string[] | null;
  author_name: string;
  author_role: string;
  author_handle: string;
  tags: string[] | null;
  cover_accent: string;
  cover_scene: string;
  cover_image_url: string | null;
  featured: boolean;
  hero_rank: number | null;
  breaking: boolean;
  related_slugs: string[] | null;
  published: boolean;
  published_at: string;
  updated_at: string;
};

export type ArticleDraft = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: Category;
  section: SectionSlug;
  publishPages: PublishPageId[];
  authorName: string;
  authorRole: string;
  authorHandle: string;
  tags: string;
  coverAccent: CoverAccent;
  coverScene: CoverScene;
  coverImageUrl: string;
  featured: boolean;
  published: boolean;
  sectionManual?: boolean;
};

const CATEGORY_SET = new Set<string>(CATEGORIES);
const SECTION_SET = new Set<string>(SECTION_SLUGS);
const ACCENT_SET = new Set<string>(["cyan", "magenta", "sunset"]);
const SCENE_SET = new Set<string>(COVER_SCENES);

function asCategory(value: string): Category {
  return CATEGORY_SET.has(value) ? (value as Category) : "Leaks & News";
}

function asSection(value: string): SectionSlug {
  return SECTION_SET.has(value) ? (value as SectionSlug) : "wire";
}

function asAccent(value: string): CoverAccent {
  return ACCENT_SET.has(value) ? (value as CoverAccent) : "cyan";
}

function asScene(value: string): CoverScene {
  return SCENE_SET.has(value) ? (value as CoverScene) : "coast";
}

function asStringArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function categoryToSection(category: Category): SectionSlug {
  switch (category) {
    case "Map & Lore":
      return "map";
    case "Vehicles & Guns":
      return "garage";
    case "Guides":
      return "wire";
    case "Media":
      return "reviews";
    default:
      return "wire";
  }
}

export function categoryToAccent(category: Category): CoverAccent {
  switch (category) {
    case "Leaks & News":
      return "magenta";
    case "Vehicles & Guns":
      return "sunset";
    case "Media":
      return "sunset";
    default:
      return "cyan";
  }
}

export function emptyDraft(): ArticleDraft {
  return {
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    category: "Leaks & News",
    section: "wire",
    publishPages: ["feed"],
    authorName: "",
    authorRole: "Desk",
    authorHandle: "",
    tags: "",
    coverAccent: "magenta",
    coverScene: "coast",
    coverImageUrl: "",
    featured: false,
    published: false,
    sectionManual: false,
  };
}

export function rowToArticle(row: ArticleRow): Article {
  const coverImageUrl = row.cover_image_url ?? undefined;
  const content = stripCoverFromBody(row.content ?? "", coverImageUrl ?? "");
  const { wordCount, readingTimeMinutes } = readingTimeFromMarkdown(content);
  const authorName = row.author_name.trim() || "Desk";
  const handle = row.author_handle.trim() || slugify(authorName);
  const rawTags = asStringArray(row.tags);
  const publishPages = resolvePublishPages({
    publishPages: row.publish_pages,
    tags: rawTags,
    category: row.category,
    section: row.section,
  });
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    author: {
      name: authorName,
      role: row.author_role.trim() || "Desk",
      handle,
    },
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    category: asCategory(row.category),
    tags: visibleTags(rawTags),
    section: asSection(row.section),
    publishPages,
    featured: Boolean(row.featured),
    heroRank:
      row.hero_rank === 1 || row.hero_rank === 2 || row.hero_rank === 3
        ? row.hero_rank
        : undefined,
    coverAccent: asAccent(row.cover_accent),
    coverScene: asScene(row.cover_scene),
    coverImageUrl,
    relatedSlugs: asStringArray(row.related_slugs),
    breaking: Boolean(row.breaking),
    content,
    wordCount,
    readingTimeMinutes,
  };
}

export function rowToDraft(row: ArticleRow): ArticleDraft {
  const rawTags = asStringArray(row.tags);
  const publishPages = resolvePublishPages({
    publishPages: row.publish_pages,
    tags: rawTags,
    category: row.category,
    section: row.section,
  });
  const primary = primaryPublishPage(publishPages);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    content: stripCoverFromBody(row.content ?? "", row.cover_image_url ?? ""),
    category: asCategory(row.category),
    section: asSection(row.section),
    publishPages,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorHandle: row.author_handle,
    tags: visibleTags(rawTags).join(", "),
    coverAccent: asAccent(row.cover_accent),
    coverScene: asScene(row.cover_scene),
    coverImageUrl: row.cover_image_url ?? "",
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    sectionManual: asSection(row.section) !== primary.section,
  };
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => slugify(tag))
    .filter(Boolean);
}

export function draftToRow(
  draft: ArticleDraft,
  publishedAt?: string,
): Record<string, unknown> {
  const title = draft.title.trim();
  const slug = (draft.slug.trim() || slugify(title) || "story").slice(0, 80);
  const authorName = draft.authorName.trim() || "Desk";
  const handle = draft.authorHandle.trim() || slugify(authorName);
  const publishPages = normalizePublishPages(draft.publishPages, {
    category: draft.category,
    section: draft.section,
  });
  const primary = primaryPublishPage(publishPages);
  const coverImageUrl = draft.coverImageUrl.trim();
  const content = stripCoverFromBody(draft.content, coverImageUrl);
  const tags = mergePageTags(parseTags(draft.tags), publishPages);
  return {
    slug,
    title,
    excerpt: draft.excerpt.trim(),
    content,
    category: draft.sectionManual ? draft.category : primary.category,
    section: draft.sectionManual ? draft.section : primary.section,
    publish_pages: publishPages,
    author_name: authorName,
    author_role: draft.authorRole.trim() || "Desk",
    author_handle: handle,
    tags,
    cover_accent: draft.coverAccent,
    cover_scene: draft.coverScene,
    cover_image_url: coverImageUrl || null,
    featured: draft.featured,
    hero_rank: draft.featured ? 1 : null,
    breaking: false,
    related_slugs: [],
    published: draft.published,
    published_at: publishedAt ?? new Date().toISOString(),
  };
}

export async function fetchPublishedArticles(): Promise<Article[]> {
  const supabase = await loadSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(ARTICLES_TABLE)
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return (data as ArticleRow[]).map(rowToArticle);
}

export async function fetchPublishedArticle(
  slug: string,
): Promise<Article | null> {
  const supabase = await loadSupabase();
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from(ARTICLES_TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) return null;
  return rowToArticle(data as ArticleRow);
}

export async function fetchAdminArticles(): Promise<ArticleRow[]> {
  const supabase = await loadSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(ARTICLES_TABLE)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error || !data) throw new Error(describeAdminError(error ?? new Error("Could not load stories.")));
  return data as ArticleRow[];
}

export async function fetchAdminArticle(
  slug: string,
): Promise<ArticleRow | null> {
  const supabase = await loadSupabase();
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from(ARTICLES_TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(describeAdminError(error));
  return (data as ArticleRow | null) ?? null;
}

export type SaveResult = { slug: string; id: string };

export async function saveArticle(draft: ArticleDraft): Promise<SaveResult> {
  const supabase = await loadSupabase();
  if (!supabase) throw new Error("You are not signed in.");
  const client = supabase;
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw new Error("You are not signed in.");
  const title = draft.title.trim();
  if (!title) throw new Error("Add a title before saving.");
  const payload = draftToRow(
    draft,
    draft.published ? new Date().toISOString() : undefined,
  );

  async function write(
    next: Record<string, unknown>,
  ): Promise<{ error: { message?: string } | null; id?: string; slug?: string }> {
    if (draft.id) {
      const row = { ...next };
      const { data: existing } = await client
        .from(ARTICLES_TABLE)
        .select("published, published_at")
        .eq("id", draft.id)
        .maybeSingle();
      if (!draft.published) {
        delete row.published_at;
      } else if (existing?.published && existing.published_at) {
        row.published_at = existing.published_at;
      }
      const { error } = await client
        .from(ARTICLES_TABLE)
        .update(row)
        .eq("id", draft.id);
      return { error, id: draft.id, slug: String(next.slug) };
    }
    const { data, error } = await client
      .from(ARTICLES_TABLE)
      .insert(next)
      .select("id, slug")
      .single();
    if (error || !data) return { error: error ?? { message: "Save failed." } };
    return { error: null, id: String(data.id), slug: String(data.slug) };
  }

  let result = await write(payload);
  if (
    result.error &&
    /publish_pages/i.test(result.error.message ?? "")
  ) {
    const fallback = { ...payload };
    delete fallback.publish_pages;
    result = await write(fallback);
  }
  if (result.error || !result.id || !result.slug) {
    throw new Error(describeAdminError(result.error ?? new Error("Save failed.")));
  }
  return { slug: result.slug, id: result.id };
}

export async function setPublished(
  id: string,
  published: boolean,
): Promise<void> {
  const supabase = await loadSupabase();
  if (!supabase) throw new Error("You are not signed in.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You are not signed in.");
  const { error } = await supabase
    .from(ARTICLES_TABLE)
    .update({ published })
    .eq("id", id);
  if (error) throw new Error(describeAdminError(error));
}

export async function deleteArticle(id: string): Promise<void> {
  const supabase = await loadSupabase();
  if (!supabase) throw new Error("You are not signed in.");
  const { error } = await supabase.from(ARTICLES_TABLE).delete().eq("id", id);
  if (error) throw new Error(describeAdminError(error));
}

export async function uploadCoverImage(
  slug: string,
  file: File,
): Promise<string> {
  const supabase = await loadSupabase();
  if (!supabase) throw new Error("You are not signed in.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Cover upload failed. Use a JPG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Cover upload failed. Use an image under 5 MB.");
  }
  const safeSlug = slugify(slug) || "story";
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${safeSlug}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(COVERS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(describeAdminError(error));
  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBodyImage(
  slug: string,
  file: File,
): Promise<string> {
  const supabase = await loadSupabase();
  if (!supabase) throw new Error("You are not signed in.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Image upload failed. Use a JPG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image upload failed. Use an image under 5 MB.");
  }
  const safeSlug = slugify(slug) || "story";
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${safeSlug}/media/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(COVERS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(describeAdminError(error));
  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function relatedFromList(
  article: ArticleMeta,
  list: ArticleMeta[],
): ArticleMeta[] {
  return relatedArticles(article, list);
}

export function adjacentFromList(
  slug: string,
  list: ArticleMeta[],
): { previous?: ArticleMeta; next?: ArticleMeta } {
  const index = list.findIndex((item) => item.slug === slug);
  if (index < 0) return {};
  return {
    previous: index > 0 ? list[index - 1] : undefined,
    next: index < list.length - 1 ? list[index + 1] : undefined,
  };
}

export function moreFromWriter(
  article: ArticleMeta,
  list: FeedArticle[],
): FeedArticle[] {
  const author = getAuthorSlug(article.author);
  return list.filter(
    (item) => item.slug !== article.slug && getAuthorSlug(item.author) === author,
  );
}
