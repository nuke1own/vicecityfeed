"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { NavPills } from "@/components/NavPills";
import { ReleaseCountdown } from "@/components/ReleaseCountdown";
import { SearchModal } from "@/components/SearchModal";
import { SiteLogo } from "@/components/SiteLogo";
import { SavedNav } from "@/components/SavedNav";
import { SocialLauncher } from "@/components/SocialLauncher";
import { outlinePillClass } from "@/components/pills";
import { usePublishedArticles } from "@/lib/use-published-articles";
import type { ArticleMeta } from "@/lib/types";

type NavbarProps = {
  articles: ArticleMeta[];
  logoSrc?: string;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

export function Navbar({ articles, logoSrc }: NavbarProps) {
  const liveArticles = usePublishedArticles(articles);
  const [searchOpen, setSearchOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 18);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="header-bar sticky top-0 z-50 overflow-visible bg-ink"
      data-compact={compact ? "true" : "false"}
      style={{ viewTransitionName: "site-header" }}
    >
      <div
        className={`header-primary mx-auto grid max-w-7xl min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 px-3 sm:gap-2 md:gap-3 md:px-6 ${
          compact ? "py-1 md:py-1.5" : "py-1.5 sm:py-2 md:py-2.5"
        }`}
      >
        <div className="min-w-0 justify-self-start">
          <ReleaseCountdown />
        </div>
        <SiteLogo src={logoSrc} />
        <div className="flex shrink-0 items-center justify-end gap-1 justify-self-end sm:gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={outlinePillClass(
              "size-9 min-h-9 sm:size-11 sm:min-h-11 md:w-auto md:gap-2 md:px-3.5",
            )}
            aria-haspopup="dialog"
            aria-label="Search"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="hidden text-xs font-semibold tracking-wide md:inline">
              Search
            </span>
          </button>
          <SavedNav />
          <SocialLauncher />
        </div>
      </div>
      <nav aria-label="Secondary" className="header-nav-wrap overflow-visible">
        <div
          className={`header-nav overflow-visible ${
            compact ? "py-1 sm:py-1.5 md:py-2" : "py-1.5 sm:py-2.5 md:py-3"
          }`}
        >
          <NavPills />
        </div>
      </nav>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        articles={liveArticles}
      />
    </header>
  );
}
