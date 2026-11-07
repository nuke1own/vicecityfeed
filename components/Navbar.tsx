"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { AccountNav } from "@/components/account/AccountNav";
import { NavPills } from "@/components/NavPills";
import { SearchModal } from "@/components/SearchModal";
import { SiteLogo } from "@/components/SiteLogo";
import { SocialLauncher } from "@/components/SocialLauncher";
import { headerButtonClass } from "@/components/pills";
import { openSearch, useSearchOpen } from "@/lib/search-store";
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
  const liveArticles = articles;
  const searchOpen = useSearchOpen();
  const [compact, setCompact] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        openSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scroll-linked shrink: the logo eases from full size to compact over the
  // first 120px of scrolling. Updated once per frame through a CSS variable,
  // so it never re-renders React and only the fixed header re-lays out.
  useEffect(() => {
    let frame = 0;
    function apply() {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const progress = Math.min(1, y / 120);
      const eased = 1 - (1 - progress) * (1 - progress);
      headerRef.current?.style.setProperty("--shrink", eased.toFixed(3));
      setCompact(y > 18);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(apply);
    }
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
    <header
      ref={headerRef}
      className="header-bar z-50 overflow-visible bg-ink"
      data-compact={compact ? "true" : "false"}
      style={{ viewTransitionName: "site-header" }}
    >
      <div
        className="header-primary mx-auto grid max-w-7xl min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 px-3 sm:gap-2 md:gap-3 md:px-6"
      >
        <div className="header-left min-w-0" />
        <SiteLogo src={logoSrc} />
        <div className="flex shrink-0 items-center justify-end gap-3 justify-self-end md:gap-5">
          <div className="hidden md:flex">
            <button
              type="button"
              onClick={openSearch}
              className={headerButtonClass("h-10 w-10 gap-2 lg:w-auto lg:min-w-36 lg:justify-start lg:px-4")}
              aria-expanded={searchOpen}
              aria-haspopup="dialog"
              aria-label="Search"
            >
              <Search className="size-[18px] shrink-0" aria-hidden />
              <span className="hidden text-sm font-medium text-white/80 lg:inline">Search</span>
            </button>
          </div>
          <SocialLauncher />
          <div className="hidden md:flex">
            <AccountNav />
          </div>
        </div>
      </div>
      <nav aria-label="Secondary" className="header-nav-wrap overflow-visible">
        <div
          className="header-nav overflow-visible"
        >
          <NavPills />
        </div>
      </nav>
      <SearchModal articles={liveArticles} />
    </header>
    {/* Holds the header's full height in the page, since the header is fixed. */}
    <div aria-hidden className="header-spacer" />
    </>
  );
}
