import { relatedArticles } from "./filters";
import fs from "node:fs";
import path from "node:path";
import articlesJson from "@/content/articles.json";
import type {
  Article,
  ArticleMeta,
  Author,
  BreakingItem,
  CategorySlug,
  FeedArticle,
  SectionSlug,
} from "./types";
import { getAuthorSlug } from "./authors";
import { readingTimeFromMarkdown } from "./format";
import { filterArticlesByCategory, searchArticleMeta } from "./filters";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

const articlesMeta = articlesJson as ArticleMeta[];

export function getArticleMeta(): ArticleMeta[] {
  return [...articlesMeta].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getArticleContent(slug: string): string {
  const file = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8");
}

export function getFeedArticles(): FeedArticle[] {
  return getArticleMeta().map((meta) => {
    const { readingTimeMinutes } = readingTimeFromMarkdown(
      getArticleContent(meta.slug),
    );
    return { ...meta, readingTimeMinutes };
  });
}

export function getArticle(slug: string): Article | undefined {
  const meta = articlesMeta.find((article) => article.slug === slug);
  if (!meta) return undefined;
  const content = getArticleContent(slug);
  const { wordCount, readingTimeMinutes } = readingTimeFromMarkdown(content);
  return { ...meta, content, wordCount, readingTimeMinutes };
}

export function getArticles(): Article[] {
  return getArticleMeta().map((meta) => {
    const content = getArticleContent(meta.slug);
    const { wordCount, readingTimeMinutes } = readingTimeFromMarkdown(content);
    return { ...meta, content, wordCount, readingTimeMinutes };
  });
}

export function getHeroArticles(): ArticleMeta[] {
  return getArticleMeta()
    .filter((article) => article.heroRank)
    .sort((a, b) => (a.heroRank ?? 99) - (b.heroRank ?? 99))
    .slice(0, 3);
}

export function getArticlesByCategory(
  slug: CategorySlug,
  source: ArticleMeta[] = getArticleMeta(),
): ArticleMeta[] {
  return filterArticlesByCategory(source, slug);
}

export function getArticlesBySection(section: SectionSlug): ArticleMeta[] {
  return getArticleMeta().filter((article) => article.section === section);
}

export function getRelatedArticles(article: ArticleMeta): ArticleMeta[] {
  return relatedArticles(article, getArticleMeta());
}

export function getAdjacentArticles(slug: string): {
  previous?: ArticleMeta;
  next?: ArticleMeta;
} {
  const list = getArticleMeta();
  const index = list.findIndex((item) => item.slug === slug);
  if (index < 0) return {};
  return {
    previous: index > 0 ? list[index - 1] : undefined,
    next: index < list.length - 1 ? list[index + 1] : undefined,
  };
}

export function searchArticles(query: string): ArticleMeta[] {
  return searchArticleMeta(getArticleMeta(), query);
}

export function getBreakingItems(): BreakingItem[] {
  return getArticleMeta()
    .filter((article) => article.breaking)
    .map((article) => ({
      id: article.slug,
      label: article.title,
      href: `/posts/${article.slug}`,
    }));
}

export function getAllSlugs(): string[] {
  return articlesMeta.map((article) => article.slug);
}

export { authorHref, getAuthorSlug } from "./authors";

export function getAuthors(): Author[] {
  const seen = new Map<string, Author>();
  for (const article of getArticleMeta()) {
    const slug = getAuthorSlug(article.author);
    if (!seen.has(slug)) seen.set(slug, article.author);
  }
  return [...seen.values()];
}

export function getAuthor(slug: string): Author | undefined {
  return getAuthors().find((author) => getAuthorSlug(author) === slug);
}

export function getFeedArticlesByAuthor(slug: string): FeedArticle[] {
  return getFeedArticles().filter(
    (article) => getAuthorSlug(article.author) === slug,
  );
}

export function getAllAuthorSlugs(): string[] {
  return getAuthors().map(getAuthorSlug);
}
