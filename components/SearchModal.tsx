"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { searchArticleMeta } from "@/lib/filters";
import { CATEGORY_SHORT } from "@/lib/site";
import type { ArticleMeta } from "@/lib/types";

type SearchModalProps = {
  open: boolean;
  onClose: () => void;
  articles: ArticleMeta[];
};

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return text;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-vice-pink px-0.5 text-white">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

export function SearchModal({ open, onClose, articles }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const results = searchArticleMeta(articles, query);
  const trimmed = query.trim();

  function close() {
    onClose();
    window.setTimeout(() => setQuery(""), 220);
  }

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-start justify-center px-3 py-4 sm:px-4 sm:py-24 ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
      {...(!open ? { inert: true } : {})}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/75 transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close search"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`search-panel relative z-10 w-full max-w-xl rounded-2xl bg-surface p-4 shadow-[0_16px_48px_rgb(0_0_0/0.6)] sm:p-5 ${
          open ? "search-panel-open" : "search-panel-closed"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id={titleId}
            className="text-[10px] font-semibold tracking-[0.16em] text-white uppercase"
          >
            Search
          </h2>
          <div className="flex items-center gap-2">
            <p className="hidden text-[10px] font-semibold tracking-[0.12em] text-white uppercase sm:block">
              <kbd className="rounded-full bg-raised px-2 py-1">⌘K</kbd>
              <span className="mx-1">/</span>
              <kbd className="rounded-full bg-raised px-2 py-1">Ctrl K</kbd>
              <span className="mx-1.5">or</span>
              <kbd className="rounded-full bg-raised px-2 py-1">Esc</kbd>
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Close search"
              className="tap-press inline-flex size-8 items-center justify-center rounded-full bg-raised text-white transition-colors hover:bg-vice-pink sm:hidden"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <label htmlFor="site-search" className="sr-only">
          Search Vice City Feed
        </label>
        <div className="search-field flex items-center gap-2 rounded-full bg-raised px-4">
          <Search className="size-4 shrink-0 text-white" aria-hidden />
          <input
            id="site-search"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stories…"
            className="h-11 w-full border-0 bg-transparent text-base text-white outline-none placeholder:text-white/60 focus-visible:outline-none sm:h-12 sm:text-sm"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              className="tap-press inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-vice-pink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="mt-3 max-h-[55vh] overflow-y-auto sm:mt-4 sm:max-h-80">
          {!trimmed ? (
            <p className="px-1 py-6 text-center text-sm text-white/75 sm:py-8">
              {articles.length === 0
                ? "No stories yet"
                : "Type a name, leak, or district."}
            </p>
          ) : results.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-white/75 sm:py-8">
              No stories for “{trimmed}”.
            </p>
          ) : (
            <ul>
              {results.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/posts/${article.slug}`}
                    onClick={close}
                    className="tap-press block rounded-xl px-3 py-3 transition-[background-color,transform] duration-200 ease-out hover:bg-raised"
                  >
                    <p className="text-[11px] font-semibold tracking-wide text-vice-pink uppercase">
                      {CATEGORY_SHORT[article.category]}
                    </p>
                    <p className="font-display font-extrabold tracking-tight text-white">
                      <Highlight text={article.title} query={trimmed} />
                    </p>
                    <p className="line-clamp-1 text-sm text-white/80">
                      <Highlight text={article.excerpt} query={trimmed} />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
