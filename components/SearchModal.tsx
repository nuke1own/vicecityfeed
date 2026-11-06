"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { searchArticleMeta } from "@/lib/filters";
import { CATEGORY_SHORT } from "@/lib/site";
import { closeSearch, registerSearchInput, useSearchOpen } from "@/lib/search-store";
import type { ArticleMeta } from "@/lib/types";

type SearchModalProps = {
  articles: ArticleMeta[];
};

const noopSubscribe = () => () => {};

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return text;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-vice-pink px-0.5 text-accent-ink">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

/**
 * Full-screen search dialog. Rendered into <body> through a portal so no
 * ancestor (the blurred sticky header, or a header hidden on phones) can clip
 * or hide it.
 */
export function SearchModal({ articles }: SearchModalProps) {
  const open = useSearchOpen();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const results = searchArticleMeta(articles, query);
  const trimmed = query.trim();

  function close(options?: { restoreFocus?: boolean }) {
    closeSearch(options);
    window.setTimeout(() => setQuery(""), 220);
  }

  // Let openSearch() focus the input inside the user's tap (iOS keyboard).
  useEffect(() => {
    registerSearchInput(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      // Make the dialog focusable right now, before React re-renders, so the
      // focus() below still counts as part of the tap.
      overlay.inert = false;
      overlay.removeAttribute("aria-hidden");
      panelRef.current?.classList.replace("search-panel-closed", "search-panel-open");
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => registerSearchInput(null);
  }, [mounted]);

  // Navigating anywhere closes search.
  useEffect(() => {
    closeSearch({ restoreFocus: false });
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
        window.setTimeout(() => setQuery(""), 220);
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a[href], button, input") ?? []).filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    // Keyboard and desktop opens: make sure the input has focus.
    if (document.activeElement !== inputRef.current) inputRef.current?.focus({ preventScroll: true });
    // Lock page scroll behind the dialog (html too, for iOS Safari).
    const html = document.documentElement;
    const previous = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = previous.html;
      document.body.style.overflow = previous.body;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      data-search-open={open ? "true" : "false"}
      className={`search-overlay fixed inset-0 z-[70] flex items-start justify-center px-3 py-4 sm:px-4 sm:py-24 ${
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
        aria-hidden
        tabIndex={-1}
        onClick={() => close()}
      />
      <div
        ref={panelRef}
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
              onClick={() => close()}
              aria-label="Close search"
              className="tap-press inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-raised text-white transition-colors hover:bg-vice-pink "
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
            type="search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
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
              className="tap-press inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-vice-pink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <p className="sr-only" role="status">{trimmed ? `${results.length} stories found` : "Enter a search query"}</p>
        <div className="search-results mt-3 min-h-0 overflow-y-auto overscroll-contain sm:mt-4 sm:max-h-80">
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
                    onClick={() => close({ restoreFocus: false })}
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
    </div>,
    document.body,
  );
}
