"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { FadeScroll } from "@/components/FadeScroll";
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
      className={`header-bar sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        compact
          ? "border-white/[0.11] bg-ink/90 shadow-[0_12px_40px_rgb(0_0_0/0.65)] backdrop-blur-xl"
          : "border-white/[0.07] bg-ink/82 backdrop-blur-md"
      }`}
      data-compact={compact ? "true" : "false"}
      style={{ viewTransitionName: "site-header" }}
    >
      <div
        className={`header-primary mx-auto grid max-w-7xl min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-3 md:gap-4 md:px-6 ${
          compact ? "py-1.5 md:py-2" : "py-2.5 md:py-3"
        }`}
      >
        <div className="min-w-0 justify-self-start pr-1">
          <ReleaseCountdown />
        </div>
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[-20%] inset-y-[-10%] -z-10 rounded-full bg-vice-pink/15 blur-2xl"
          />
          <SiteLogo src={logoSrc} />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 justify-self-end md:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={outlinePillClass(
              "group size-11 min-h-11 md:w-auto md:gap-2 md:px-3.5",
            )}
            aria-haspopup="dialog"
            aria-label="Search"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="hidden text-xs font-semibold tracking-wide md:inline">
              Search
            </span>
            <kbd
              aria-hidden="true"
              className="hidden rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] leading-none font-bold text-white/80 transition-colors group-hover:border-white/40 group-hover:bg-white/20 group-hover:text-white md:inline"
            >
              /
            </kbd>
          </button>
          <SavedNav />
          <SocialLauncher />
        </div>
      </div>
      <nav aria-label="Secondary" className="header-nav-wrap">
        <FadeScroll
          className={`header-nav ${
            compact ? "pt-0.5 pb-2 md:pb-2.5" : "pt-1 pb-2.5 md:pb-3.5"
          }`}
        >
          <NavPills />
        </FadeScroll>
      </nav>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        articles={liveArticles}
      />
    </header>
  );
}
