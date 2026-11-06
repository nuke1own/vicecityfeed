import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/ArticleView";
import {
  getAllPublishedArticles,
  getPublishedArticle,
} from "@/lib/articles-server";
import {
  adjacentFromList,
  moreFromWriter,
  relatedFromList,
} from "@/lib/remote-articles";
import { SITE } from "@/lib/site";

export const revalidate = 60;

// Stories render on first request, then are cached and refreshed every minute.
export async function generateStaticParams() {
  return [];
}

type PostPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(decodeURIComponent(slug));
  if (!article) return { title: "Story not found", robots: { index: false } };
  const url = `${SITE.url}/posts/${article.slug}/`;
  const images = article.coverImageUrl
    ? [{ url: article.coverImageUrl, alt: article.title }]
    : [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE.name }];
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/posts/${article.slug}/` },
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author.name],
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: images.map((image) => image.url),
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const article = await getPublishedArticle(decodeURIComponent(slug));
  if (!article) notFound();
  const feed = await getAllPublishedArticles();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: { "@type": "Person", name: article.author.name },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    mainEntityOfPage: `${SITE.url}/posts/${article.slug}/`,
    ...(article.coverImageUrl ? { image: [article.coverImageUrl] } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ArticleView
        article={article}
        related={relatedFromList(article, feed)}
        adjacent={adjacentFromList(article.slug, feed)}
        moreFromWriter={moreFromWriter(article, feed)}
      />
    </>
  );
}
