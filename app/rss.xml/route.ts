import { getAllPublishedArticles } from "@/lib/articles-server";
import { escapeXml } from "@/lib/format";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  const articles = await getAllPublishedArticles();
  const items = articles
    .map((article) => {
      const url = `${SITE.url}/posts/${article.slug}/`;
      return `<item>
        <title>${escapeXml(article.title)}</title>
        <link>${url}</link>
        <guid>${url}</guid>
        <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
        <description>${escapeXml(article.excerpt)}</description>
        <category>${escapeXml(article.category)}</category>
        <dc:creator>${escapeXml(article.author.name)}</dc:creator>
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${SITE.url}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en-us</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
