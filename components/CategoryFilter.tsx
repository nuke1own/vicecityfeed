"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { FadeScroll } from "@/components/FadeScroll";
import { CATEGORY_FILTERS } from "@/lib/site";
import type { CategorySlug } from "@/lib/types";

type CategoryFilterProps = {
  active: CategorySlug;
  onSelect?: (slug: CategorySlug) => void;
  basePath?: string;
};

export function CategoryFilter({
  active,
  onSelect,
  basePath,
}: CategoryFilterProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, ready: false });

  useLayoutEffect(() => {
    function measure() {
      const row = rowRef.current;
      if (!row) return;
      const current = row.querySelector<HTMLElement>("[data-filter-active='true']");
      if (!current) return;
      setIndicator({
        x: current.offsetLeft,
        w: current.offsetWidth,
        ready: true,
      });
    }

    measure();
    const frame = requestAnimationFrame(measure);
    const fonts = document.fonts?.ready?.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      fonts?.catch(() => {});
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  return (
    <div className="min-w-0">
      <FadeScroll
        role="tablist"
        aria-label="Filter stories by category"
        className="-mx-4 py-3 md:mx-0"
      >
        <div ref={rowRef} className="relative flex w-max gap-1.5 px-4 sm:gap-2 md:px-0">
          <span
            aria-hidden
            className="nav-pill-indicator pointer-events-none absolute top-1/2 left-0 z-0 h-9 rounded-full bg-vice-pink shadow-[0_0_12px_rgb(255_30_142/0.6),0_0_26px_rgb(255_30_142/0.35)] sm:h-11"
            style={{
              width: indicator.w,
              transform: `translate3d(${indicator.x}px, -50%, 0)`,
              opacity: indicator.ready ? 1 : 0,
            }}
          />
          {CATEGORY_FILTERS.map((filter) => {
            const isActive = filter.slug === active;
            const className = `tap-press relative z-10 inline-flex h-9 min-h-9 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-[background-color,color,transform] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white sm:h-11 sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-sm ${
              isActive ? "text-white" : "text-white hover:bg-white/8"
            }`;

            if (onSelect) {
              return (
                <button
                  key={filter.slug}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-filter-active={isActive ? "true" : "false"}
                  className={className}
                  onClick={() => onSelect(filter.slug)}
                >
                  {filter.label}
                </button>
              );
            }

            const href =
              filter.slug === "all"
                ? basePath ?? "/"
                : `${basePath ?? "/"}?cat=${filter.slug}`;

            return (
              <Link
                key={filter.slug}
                href={href}
                role="tab"
                aria-selected={isActive}
                data-filter-active={isActive ? "true" : "false"}
                className={className}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </FadeScroll>
    </div>
  );
}
