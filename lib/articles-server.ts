import "server-only";
import { cache } from "react";
import { getArticle, getArticles } from "./articles";
import { ARTICLES_TABLE, rowToArticle, type ArticleRow } from "./remote-articles";
import { getAnonServerSupabase } from "./supabase-server";
import type { Article, FeedArticle } from "./types";

/** Published Supabase stories plus local Markdown stories, newest first. */
export async function getAllPublishedArticles(): Promise<Article[]> {
  const local = getArticles();
  const { data, error } = await getAnonServerSupabase()
    .from(ARTICLES_TABLE)
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });
  const remote = error || !data ? [] : (data as ArticleRow[]).map(rowToArticle);
  const seen = new Set(remote.map((article) => article.slug));
  return [...remote, ...local.filter((article) => !seen.has(article.slug))].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function getPublishedArticle(slug: string): Promise<Article | null> {
  const { data, error } = await getAnonServerSupabase()
    .from(ARTICLES_TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!error && data) return rowToArticle(data as ArticleRow);
  return getArticle(slug) ?? null;
}

/**
 * Story cards for lists (no article bodies, so pages ship less HTML/JS).
 * Cached per request so the layout and page share one Supabase query.
 */
export const getPublishedFeed = cache(async (): Promise<FeedArticle[]> => {
  const articles = await getAllPublishedArticles();
  return articles.map((article) => {
    const { content, wordCount, ...meta } = article;
    void content;
    void wordCount;
    return meta;
  });
});
