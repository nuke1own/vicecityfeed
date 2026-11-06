import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SectionFeed } from "@/components/SectionFeed";
import { getPublishedFeed } from "@/lib/articles-server";
import { getAuthorSlug } from "@/lib/authors";

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

type AuthorPageProps = { params: Promise<{ slug: string }> };

async function authorArticles(slug: string) {
  const feed = await getPublishedFeed();
  const clean = decodeURIComponent(slug).toLowerCase();
  return feed.filter((article) => getAuthorSlug(article.author) === clean);
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const articles = await authorArticles(slug);
  if (articles.length === 0) notFound();
  const name = articles[0].author.name;
  return {
    title: `${name}: stories`,
    description: `Stories by ${name} on Vice City Feed.`,
    alternates: { canonical: `/authors/${getAuthorSlug(articles[0].author)}/` },
  };
}

/** A writer's byline page: every published story by that author. */
export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const articles = await authorArticles(slug);
  if (articles.length === 0) notFound();
  const author = articles[0].author;

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-6">
      <PageHeader
        kicker={author.role || "Writer"}
        title={author.name}
        description={`${articles.length} ${articles.length === 1 ? "story" : "stories"} on Vice City Feed.`}
      />
      <SectionFeed articles={articles} />
    </main>
  );
}
