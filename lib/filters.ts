import { HARDWARE_TAGS, SLUG_TO_CATEGORY } from "./site";
import type { ArticleMeta, Category, CategorySlug } from "./types";

export function filterArticlesByCategory<T extends ArticleMeta>(
  articles: T[],
  slug: CategorySlug,
): T[] {
  if (slug === "all") return articles;
  if (slug === "hardware") {
    return articles.filter((article) =>
      article.tags.some((tag) =>
        HARDWARE_TAGS.includes(tag as (typeof HARDWARE_TAGS)[number]),
      ),
    );
  }
  const category: Category = SLUG_TO_CATEGORY[slug];
  return articles.filter((article) => article.category === category);
}

export function searchArticleMeta(
  articles: ArticleMeta[],
  query: string,
): ArticleMeta[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return articles.filter((article) => {
    const haystack = [
      article.title,
      article.excerpt,
      article.category,
      article.author.name,
      ...article.tags,
    ]
      .join(" ")
      .toLowerCase();
    return needle.split(/\s+/).every((term) => haystack.includes(term));
  });
}

export function relatedArticles(article: ArticleMeta, list: ArticleMeta[]): ArticleMeta[] {
  const score = (item: ArticleMeta) => (article.relatedSlugs.includes(item.slug) ? 100 : 0) + (item.category === article.category ? 2 : 0) + item.tags.filter(tag => article.tags.includes(tag)).length;
  return list.filter(item => item.slug !== article.slug).sort((a, b) => score(b) - score(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 3);
}
