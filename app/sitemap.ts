import type { MetadataRoute } from "next";
import { getAllAuthorSlugs } from "@/lib/articles";
import { getAllPublishedArticles } from "@/lib/articles-server";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/feed",
    "/the-map",
    "/garage-mods",
    "/reviews",
    "/album",
    "/editorial-guidelines",
    "/authors",
    "/signup",
  ];

  const pages: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.7,
  }));

  const posts: MetadataRoute.Sitemap = (await getAllPublishedArticles()).map((article) => ({
    url: `${SITE.url}/posts/${article.slug}/`,
    lastModified: new Date(article.updatedAt ?? article.publishedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const authors: MetadataRoute.Sitemap = getAllAuthorSlugs().map((slug) => ({
    url: `${SITE.url}/authors/${slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...pages, ...posts, ...authors];
}
