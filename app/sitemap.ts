import type { MetadataRoute } from "next";
import { getAllAuthorSlugs, getArticleMeta } from "@/lib/articles";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/feed",
    "/the-map",
    "/garage-mods",
    "/reviews",
    "/album",
    "/editorial-guidelines",
    "/authors",
  ];

  const pages: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.7,
  }));

  const posts: MetadataRoute.Sitemap = getArticleMeta().map((article) => ({
    url: `${SITE.url}/posts/${article.slug}`,
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
