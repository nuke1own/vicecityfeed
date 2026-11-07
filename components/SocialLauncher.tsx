"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Menu, X } from "lucide-react";
import { SocialGlyph } from "@/components/SocialGlyph";
import { headerButtonClass } from "@/components/pills";
import { isLiveSocialHref, SOCIAL_LINKS } from "@/lib/site";

export function SocialLauncher() {
  const [open, setOpen] = useState(false);
  // How far the menu moves sideways from dead centre to stay on screen.
  const [shift, setShift] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Centre the menu under the button; nudge it in only if it would leave the screen.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const button = rootRef.current?.querySelector("button");
      const menu = menuRef.current;
      if (!button || !menu) return;
      const gutter = 12;
      const rect = button.getBoundingClientRect();
      const half = menu.offsetWidth / 2;
      const centre = rect.left + rect.width / 2;
      const viewport = document.documentElement.clientWidth;
      const left = centre - half;
      const right = centre + half;
      setShift(
        right > viewport - gutter
          ? viewport - gutter - right
          : left < gutter
            ? gutter - left
            : 0,
      );
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const itemClass =
    "tap-press flex w-full min-h-12 items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-white transition-[background-color,color,transform,box-shadow] duration-300 ease-out hover:bg-vice-pink hover:text-accent-ink hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)]";

  return (
    <div
      className="relative"
      ref={rootRef}
      data-social-open={open ? "true" : "false"}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          open
            ? "social-close tap-press inline-flex size-11 items-center md:size-10 justify-center rounded-full bg-vice-pink text-accent-ink shadow-[0_0_12px_rgb(var(--accent-rgb)/0.65),0_0_28px_rgb(var(--accent-rgb)/0.4),0_0_48px_rgb(var(--accent-rgb)/0.2)] transition-transform duration-300 ease-out"
            : headerButtonClass("size-11 md:size-10")
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <span className="relative size-4">
          <Menu
            className={`absolute inset-0 size-4 transition duration-300 ease-out ${
              open ? "scale-75 opacity-0" : "scale-100 opacity-100"
            }`}
            aria-hidden
          />
          <X
            className={`absolute inset-0 size-4 transition duration-300 ease-out ${
              open ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
            aria-hidden
          />
        </span>
      </button>
      <ul
        id={menuId}
        role="menu"
        data-social-menu="true"
        ref={menuRef}
        data-open={open ? "true" : "false"}
        // Centred under the button (left 50%, pulled back by half its width).
        style={{
          marginLeft: `calc(-5.5rem + ${shift}px)`,
          transformOrigin: `calc(50% - ${shift}px) 0`,
        }}
        className="social-menu absolute top-full left-1/2 z-[60] mt-2 w-44 rounded-xl bg-surface p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.45)]"
      >
        {/* Saved stories lives in this menu (the header has no Saved button). */}
        <li>
          <Link href="/saved/" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Bookmark aria-hidden className="size-4" />
            <span>Saved stories</span>
          </Link>
        </li>
        {SOCIAL_LINKS.map((link) => {
          const isRss = link.href.endsWith("/rss.xml") || link.label === "RSS";
          const live = isRss || isLiveSocialHref(link.href);
          return (
            <li key={link.label}>
              {isRss ? (
                <a
                  href="/rss.xml"
                  role="menuitem"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <SocialGlyph label={link.label} />
                  <span>{link.label}</span>
                </a>
              ) : live ? (
                <Link
                  href={link.href}
                  role="menuitem"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                  {...(link.external
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                >
                  <SocialGlyph label={link.label} />
                  <span>{link.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={`${itemClass} cursor-default`}
                  onClick={() => setOpen(false)}
                  aria-label={`${link.label}, soon`}
                >
                  <SocialGlyph label={link.label} />
                  <span>{link.label}</span>
                  <span className="ml-auto text-[10px] font-semibold tracking-[0.12em] uppercase">
                    Soon
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
