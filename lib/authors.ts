import { slugify } from "./format";
import type { Author } from "./types";

export function getAuthorSlug(author: Author): string {
  const handle = author.handle.trim().toLowerCase();
  return handle || slugify(author.name);
}

export function authorHref(author: Author): string {
  return `/authors/${getAuthorSlug(author)}/`;
}
