import type { Metadata } from "next";
import { EmptyStories } from "@/components/EmptyStories";
import { PageHeader } from "@/components/PageHeader";
import { getAuthors } from "@/lib/articles";
import { authorHref } from "@/lib/authors";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Writers",
  description: "Vice City Feed writers.",
};

export default function AuthorsPage() {
  const authors = getAuthors();

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-6">
      <PageHeader
        kicker="Desk"
        title="Writers"
        description="Bylines on the desk."
      />
      {authors.length === 0 ? (
        <EmptyStories />
      ) : (
        <ul className="space-y-3">
          {authors.map((author) => (
            <li key={author.handle}>
              <Link
                href={authorHref(author)}
                className="block rounded-2xl bg-surface px-5 py-4 text-white"
              >
                <p className="font-display text-lg font-extrabold tracking-tight">
                  {author.name}
                </p>
                <p className="mt-1 text-sm text-white">{author.role}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
