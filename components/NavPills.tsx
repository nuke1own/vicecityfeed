"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, NAV_ITEMS } from "@/lib/site";

/**
 * Main sections as rectangular tabs. The selected tab is marked by a line
 * under its text that slides between tabs.
 */
export function NavPills() {
  const pathname = usePathname();
  const rowRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, ready: false });

  useLayoutEffect(() => {
    function measure() {
      const row = rowRef.current;
      if (!row) return;
      const label = row.querySelector<HTMLElement>("[data-nav-active='true'] [data-nav-label]");
      if (!label) {
        setIndicator((prev) => ({ ...prev, ready: false }));
        return;
      }
      const rowBox = row.getBoundingClientRect();
      const box = label.getBoundingClientRect();
      setIndicator({ x: box.left - rowBox.left, w: box.width, ready: true });
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
  }, [pathname]);

  return (
    <div ref={rowRef} className="nav-pills relative mx-auto flex w-max items-stretch gap-1 px-2 sm:gap-2">
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-nav-active={active ? "true" : "false"}
            className={`nav-tab relative inline-flex min-h-11 min-w-20 shrink-0 items-center justify-center px-5 text-[15px] whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white sm:min-w-24 sm:px-6 ${
              active ? "font-bold text-white" : "font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span data-nav-label>{item.label}</span>
          </Link>
        );
      })}
      <span
        aria-hidden
        className="nav-pill-indicator pointer-events-none absolute bottom-0 left-0 h-[3px] bg-vice-pink shadow-[0_0_10px_rgb(var(--accent-rgb)/0.7)]"
        style={{
          width: indicator.w,
          transform: `translate3d(${indicator.x}px, 0, 0)`,
          opacity: indicator.ready ? 1 : 0,
        }}
      />
    </div>
  );
}
